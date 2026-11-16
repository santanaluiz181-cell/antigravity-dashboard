"""Universal Monocular Depth + Clean Subject Mask Extractor (Depth Anything V2 Small).
Strips all portrait-specific skull-shell / hair / hoodie heuristics.
Outputs:
  - depth-preview.png : Foreground depth visualization
  - depth-mask.png    : Clean foreground subject alpha mask (0..255)
  - depth-tex.f32     : Aspect-correct float32 RGBA texture [R=smooth_depth, G=subject_mask, B=edge_mag, A=1.0]
  - depth-tex.png     : 8-bit preview of depth-tex
  - depth-meta.json   : Universal metadata {width, height, aspect, tex_width, tex_height, fg_ratio}
  - depth.bin         : Per-blob uint8 depth (0 = background, 1..255 = foreground near)
"""
import os
import sys
import json
import argparse
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter as gf, label, binary_dilation, binary_fill_holes, sobel


def compute_sobel_norm(gray: np.ndarray) -> np.ndarray:
    gx = sobel(gray, axis=1)
    gy = sobel(gray, axis=0)
    mag = np.hypot(gx, gy).astype(np.float32)
    p99 = float(np.percentile(mag, 99.0))
    return np.clip(mag / max(p99, 1e-6), 0.0, 1.0)


def estimate_depth_map(img: Image.Image, force_fallback: bool = False) -> np.ndarray:
    """Run Depth Anything V2 Small when available; fallback to multi-scale edge/saliency depth if offline."""
    W, H = img.size
    if not force_fallback:
        try:
            import torch
            from transformers import pipeline
            dev = 0 if torch.cuda.is_available() else "cpu"
            pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=dev)
            pd = pipe(img)["predicted_depth"].float()
            while pd.dim() < 4:
                pd = pd.unsqueeze(0)
            d = torch.nn.functional.interpolate(
                pd, size=(H, W), mode="bicubic", align_corners=False
            )[0, 0].cpu().numpy().astype(np.float32)
            d_min, d_max = float(d.min()), float(d.max())
            return (d - d_min) / max(d_max - d_min, 1e-6)
        except Exception as ex:
            print(f"[depth.py] Depth-Anything-V2 pipeline unavailable ({ex}); using structural edge-saliency depth.", file=sys.stderr)

    rgb = np.asarray(img, dtype=np.float32) / 255.0
    gray = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    edges = compute_sobel_norm(gray)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    center_prior = np.exp(-(((xx / max(W, 1) - 0.5) / 0.42) ** 2 + ((yy / max(H, 1) - 0.5) / 0.42) ** 2))
    local_energy = gf(edges, sigma=max(W, H) * 0.04)
    d = 0.65 * local_energy / max(float(local_energy.max()), 1e-6) + 0.35 * center_prior
    d = gf(d.astype(np.float32), sigma=2.0)
    return ((d - d.min()) / max(float(d.max() - d.min()), 1e-6)).astype(np.float32)


def extract_clean_subject_mask(rgb: np.ndarray, d: np.ndarray, custom_mask_path: str | None = None) -> np.ndarray:
    """Compute a clean binary foreground subject mask for any image (universal border-flood + depth saliency)."""
    H, W = d.shape
    if custom_mask_path and os.path.exists(custom_mask_path):
        m_img = Image.open(custom_mask_path).convert("L").resize((W, H), Image.BILINEAR)
        return (np.asarray(m_img, dtype=np.float32) / 255.0) > 0.5

    sm = gf(rgb, (1.5, 1.5, 0))
    gray = 0.299 * sm[:, :, 0] + 0.587 * sm[:, :, 1] + 0.114 * sm[:, :, 2]
    edges = compute_sobel_norm(gray)

    # Border-connected low-gradient background regions + depth threshold
    border_d = np.concatenate([d[0, :], d[-1, :], d[:, 0], d[:, -1]])
    bg_depth_thresh = float(np.percentile(border_d, 65.0))
    flat_or_far = (edges < 0.18) & (d <= max(bg_depth_thresh, 0.35))
    lab, _ = label(flat_or_far)
    edge_labels = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    edge_labels.discard(0)
    bg = binary_dilation(np.isin(lab, list(edge_labels)), iterations=2)
    fg = binary_fill_holes(~bg)

    # Fallback if entire frame is textured (e.g. landscape/full-bleed scene): use depth top 65%
    fg_ratio = float(fg.mean())
    if fg_ratio < 0.05 or fg_ratio > 0.96:
        thresh = float(np.percentile(d, 35.0))
        fg = d >= thresh
    return fg


def run_depth_pipeline(
    run_dir: str,
    image_path: str | None = None,
    mask_path: str | None = None,
    tex_base_w: int = 640,
    force_fallback: bool = False,
) -> dict:
    run_dir = os.path.abspath(run_dir)
    root = os.path.dirname(run_dir.rstrip("\\/"))
    if image_path is None:
        cand_run = os.path.join(run_dir, "target-crop.jpg")
        cand_ref = os.path.join(root, "reference", "target-crop.jpg")
        image_path = cand_run if os.path.exists(cand_run) else cand_ref

    img = Image.open(image_path).convert("RGB")
    W, H = img.size
    aspect = float(W) / float(max(H, 1))
    rgb = np.asarray(img, dtype=np.float32) / 255.0
    gray = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]

    d = estimate_depth_map(img, force_fallback=force_fallback)
    fg = extract_clean_subject_mask(rgb, d, custom_mask_path=mask_path)

    fg_vals = d[fg] if np.any(fg) else d.reshape(-1)
    lo, hi = float(np.percentile(fg_vals, 1.0)), float(np.percentile(fg_vals, 99.5))
    z = np.clip((d - lo) / max(hi - lo, 1e-6), 0.0, 1.0).astype(np.float32)

    os.makedirs(run_dir, exist_ok=True)
    Image.fromarray((np.where(fg, z, 0.0) * 255.0).astype(np.uint8)).save(os.path.join(run_dir, "depth-preview.png"))
    Image.fromarray((fg.astype(np.uint8) * 255)).save(os.path.join(run_dir, "depth-mask.png"))

    # Smooth silhouette-extended depth (R) + clean soft foreground mask (G) + Sobel edge detail (B) + 1.0 (A)
    zf = np.where(fg, z, 0.0).astype(np.float32)
    wgt = fg.astype(np.float32)
    for _ in range(30):
        zi = gf(zf, 5.0)
        wi = gf(wgt, 5.0)
        fill = np.where(wi > 1e-3, zi / np.maximum(wi, 1e-3), 0.0)
        zf = np.where(fg, z, fill * (wi > 1e-3))
        wgt = np.where(fg, 1.0, (wi > 1e-3).astype(np.float32))
    zs = gf(zf, 2.0).astype(np.float32)
    mk = gf(fg.astype(np.float32), 1.5).astype(np.float32)
    edge_mag = compute_sobel_norm(gray)

    tex_w = int(tex_base_w)
    tex_h = max(16, int(round(tex_w / aspect / 2.0)) * 2)
    resize_ch = lambda a: np.asarray(Image.fromarray(a.astype(np.float32)).resize((tex_w, tex_h), Image.BILINEAR), dtype=np.float32)

    ones_ch = np.ones((tex_h, tex_w), dtype=np.float32)
    tex_rgba = np.stack([resize_ch(zs), resize_ch(mk), resize_ch(edge_mag), ones_ch], axis=2).astype(np.float32)
    tex_rgba.tofile(os.path.join(run_dir, "depth-tex.f32"))

    preview_rgb = (np.stack([resize_ch(zs), resize_ch(mk), resize_ch(edge_mag)], axis=2) * 255.0).clip(0, 255).astype(np.uint8)
    Image.fromarray(preview_rgb).save(os.path.join(run_dir, "depth-tex.png"))

    meta = {
        "width": W,
        "height": H,
        "aspect": round(aspect, 6),
        "tex_width": tex_w,
        "tex_height": tex_h,
        "fg_ratio": round(float(fg.mean()), 4),
        "skull_shell": False,
        "facial_rig": False,
    }
    with open(os.path.join(run_dir, "depth-meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    pos_path = os.path.join(run_dir, "final-pos.npy")
    if os.path.exists(pos_path):
        pos = np.load(pos_path)
        x = np.clip((pos[:, 0] * W).astype(int), 0, W - 1)
        y = np.clip((pos[:, 1] * H).astype(int), 0, H - 1)
        inside = (pos[:, 0] > 0.004) & (pos[:, 0] < 0.996) & (pos[:, 1] > 0.004) & (pos[:, 1] < 0.999)
        zb = np.where(fg[y, x] & inside, 1 + np.round(z[y, x] * 254.0), 0).astype(np.uint8)
        zb.tofile(os.path.join(run_dir, "depth.bin"))
        meta["n_blobs_depth"] = int(len(zb))
        meta["n_foreground_blobs"] = int((zb > 0).sum())

    return meta


def main():
    ap = argparse.ArgumentParser(description="Universal Depth Anything V2 + Clean Subject Mask")
    ap.add_argument("run_dir", nargs="?", default=os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("--image", default=None, help="Path to input image")
    ap.add_argument("--mask", default=None, help="Optional custom subject mask image")
    ap.add_argument("--tex-width", type=int, default=640)
    ap.add_argument("--fallback-depth", action="store_true", help="Use fast edge-saliency depth without HF model download")
    args = ap.parse_args()
    meta = run_depth_pipeline(
        run_dir=args.run_dir,
        image_path=args.image,
        mask_path=args.mask,
        tex_base_w=args.tex_width,
        force_fallback=args.fallback_depth,
    )
    print(f"[depth.py] wrote depth-tex.f32 ({meta['tex_width']}x{meta['tex_height']}, aspect={meta['aspect']}) | fg_ratio={meta['fg_ratio']}")


if __name__ == "__main__":
    main()
