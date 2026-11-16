import os
import sys
import json
import subprocess
import tempfile
import unittest
import numpy as np
from PIL import Image

import importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TRAIN_V2_DIR = os.path.join(ROOT, "repos", "gradient-descent-for-a-face", "train_v2")
DEPTH_DIR = os.path.join(ROOT, "repos", "gradient-descent-for-a-face", "train")

def _load_mod(name: str, path: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

gs_train = _load_mod("train_v2_mod", os.path.join(TRAIN_V2_DIR, "train.py"))
gs_depth = _load_mod("depth_mod", os.path.join(DEPTH_DIR, "depth.py"))


class TestGaussianSplatDualBackendGate2(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.out_dir = self.tmp_dir.name
        # Synthetic 320x180 (16:9) test image A with sharp high-contrast geometric subject
        arr_a = np.full((180, 320, 3), 240, dtype=np.uint8)
        arr_a[40:140, 90:230] = [30, 120, 220]
        arr_a[70:110, 130:190] = [250, 180, 40]
        self.img_a_path = os.path.join(self.out_dir, "img_a.png")
        Image.fromarray(arr_a).save(self.img_a_path)

        # Synthetic 320x180 test image B for A -> B morphing
        arr_b = np.full((180, 320, 3), 235, dtype=np.uint8)
        arr_b[30:150, 60:180] = [210, 50, 90]
        self.img_b_path = os.path.join(self.out_dir, "img_b.png")
        Image.fromarray(arr_b).save(self.img_b_path)

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_01_dynamic_aspect_ratios(self):
        img = Image.open(self.img_a_path)
        for spec, expected in [("16:9", 16.0 / 9.0), ("9:16", 9.0 / 16.0), ("1:1", 1.0), ("auto", 320.0 / 180.0)]:
            cropped, aspect = gs_train.parse_aspect_and_crop(img, spec)
            self.assertAlmostEqual(aspect, expected, places=2)
            h320 = gs_train.stage_height(320, aspect)
            self.assertEqual(h320 % 2, 0)
            self.assertGreaterEqual(h320, 16)

    def test_02_error_map_weighted_pick_window(self):
        rng = np.random.default_rng(123)
        err = np.zeros((180, 320), dtype=np.float32)
        err[140:170, 260:310] = 100.0  # Extreme error hotspot in bottom-right corner
        hits = 0
        for _ in range(50):
            x0, y0, cw, ch = gs_train.pick_window(320, 180, 64, rng, err_map=err)
            if x0 >= 180 and y0 >= 80:
                hits += 1
        self.assertGreaterEqual(hits, 25, "Error-map weighted sampling must focus on high-error hotspot")

    def test_03_universal_depth_and_clean_mask_no_skull_shell(self):
        np.save(os.path.join(self.out_dir, "final-pos.npy"), np.random.uniform(0.1, 0.9, (200, 2)).astype(np.float32))
        meta = gs_depth.run_depth_pipeline(
            run_dir=self.out_dir,
            image_path=self.img_a_path,
            tex_base_w=160,
            force_fallback=True,
        )
        self.assertFalse(meta["skull_shell"])
        self.assertFalse(meta["facial_rig"])
        self.assertTrue(os.path.exists(os.path.join(self.out_dir, "depth-tex.f32")))
        self.assertTrue(os.path.exists(os.path.join(self.out_dir, "depth-mask.png")))
        self.assertTrue(os.path.exists(os.path.join(self.out_dir, "depth.bin")))

    def test_04_stripped_facial_heuristics_and_shaders(self):
        with open(os.path.join(TRAIN_V2_DIR, "train.py"), "r", encoding="utf-8") as f:
            train_src = f.read()
        self.assertNotIn("M_EYES", train_src)
        self.assertNotIn("M_SKIN", train_src)
        self.assertIn("sobel_edge", train_src)
        self.assertIn("laplacian_detail", train_src)

        index_html_path = os.path.join(ROOT, "repos", "gradient-descent-for-a-face", "index.html")
        with open(index_html_path, "r", encoding="utf-8") as f:
            html_src = f.read()
        for banned in ("uBlink", "uSmile", "uBack", "uHair", "uHood"):
            self.assertNotIn(banned, html_src, f"Banned facial uniform {banned} must be stripped from index.html")

        remotion_path = os.path.join(ROOT, "skills", "super-render", "resources", "remotion_gaussian_splat_25d.tsx")
        self.assertTrue(os.path.exists(remotion_path))
        with open(remotion_path, "r", encoding="utf-8") as f:
            rem_src = f.read()
        for banned in ("uBlink", "uSmile", "uBack"):
            self.assertNotIn(banned, rem_src)
        self.assertIn("GaussianSplat25DScene", rem_src)
        self.assertIn("uPassMode", rem_src)

    def test_05_negative_mutation_hard_abort_directml_and_cpu_fallback(self):
        # Negative Test A: DirectML backend must exit with code 4
        with self.assertRaises(SystemExit) as cm_dml:
            gs_train.select_and_run_backend(
                "directml",
                Image.open(self.img_a_path),
                16.0 / 9.0,
                steps=5,
                nmax=128,
                rng=np.random.default_rng(1),
            )
        self.assertEqual(cm_dml.exception.code, 4)

        # Negative Test B: Simulated CPU fallback in active backend must abort non-zero
        try:
            import wgpu  # noqa: F401
            with self.assertRaises(SystemExit) as cm_wgpu:
                gs_train.run_wgpu_engine(
                    Image.open(self.img_a_path),
                    16.0 / 9.0,
                    steps=2,
                    nmax=128,
                    rng=np.random.default_rng(1),
                    force_cpu_adapter_for_test=True,
                )
            self.assertEqual(cm_wgpu.exception.code, 2)
        except ImportError:
            pass

        try:
            import torch
            if torch.cuda.is_available():
                with self.assertRaises(SystemExit) as cm_rocm:
                    gs_train.run_rocm_engine(
                        Image.open(self.img_a_path),
                        16.0 / 9.0,
                        steps=2,
                        nmax=128,
                        rng=np.random.default_rng(1),
                        force_cpu_fallback_for_test=True,
                    )
                self.assertEqual(cm_rocm.exception.code, 4)
        except ImportError:
            pass

    def test_06_end_to_end_cli_and_ab_morph_export(self):
        cmd = [
            sys.executable,
            os.path.join(TRAIN_V2_DIR, "train.py"),
            "--image", self.img_a_path,
            "--image-b", self.img_b_path,
            "--aspect", "16:9",
            "--backend", "auto",
            "--steps", "20",
            "--nmax", "800",
            "--out-dir", self.out_dir,
            "--quick",
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, f"CLI failed: {proc.stderr}\n{proc.stdout}")
        for fname in ("snapshots.bin", "meta.json", "blobs.json", "blobs.svg", "morph_ab.json", "final-render.png"):
            self.assertTrue(os.path.exists(os.path.join(self.out_dir, fname)), f"Missing {fname}")

        with open(os.path.join(self.out_dir, "blobs.json"), "r", encoding="utf-8") as f:
            bjson = json.load(f)
        self.assertEqual(bjson["schema"], "antigravity.gaussian_blobs.v3")
        self.assertEqual(bjson["n_blobs"], 800)
        self.assertIn("morph_target", bjson)


if __name__ == "__main__":
    unittest.main()
