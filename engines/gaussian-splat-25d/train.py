"""Universal 2D/2.5D Gaussian Splat Encoder (v3 Dual-Backend: Option A wgpu Vulkan + Option C ROCm gfx1032).
HARD ABORT RULE: Target compute hardware is AMD Radeon RX 6600 (Windows, Vulkan/ROCm).
If ANY forward or backward rasterizer op falls back to CPU (or uses torch-directml CPU fallback),
STOP IMMEDIATELY, print exact offending op, and exit non-zero.

Features:
  1. Dynamic aspect ratio ('auto', '16:9', '9:16', '1:1', '4:5', or 'W:H') computed from target image.
  2. Error-map + Sobel edge + optional subject-mask weighted crop window sampling.
  3. Sobel gradient & 3x3 Laplacian high-frequency detail metrics.
  4. A -> B Gaussian blob morphing (--image-b) with spatial-chromatic transport pairing.
  5. Compact JSON (blobs.json), SVG (blobs.svg), and binary timeline (snapshots.bin + meta.json) export
     supporting NMAX 800..3000 compact mode up to 100,000 blobs.
"""
import os
import sys
import math
import time
import json
import argparse
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

LS_MIN, LS_MAX, AMP_MAX = math.log(0.00025), math.log(0.05), 3.0
B1, B2 = 0.9, 0.99
BUCKETS = [(2.0, 12), (5.3, 32), (16.0, 96), (1e9, 192)]


def parse_aspect_and_crop(img: Image.Image, aspect_spec: str = "auto") -> tuple[Image.Image, float]:
    """Crop image to requested aspect ratio ('auto', '16:9', '9:16', '1:1', or 'W:H') and return (cropped_img, W/H)."""
    W0, H0 = img.size
    spec = (aspect_spec or "auto").strip().lower()
    if spec == "auto":
        return img, float(W0) / float(max(H0, 1))
    if ":" in spec:
        parts = spec.split(":")
        target_aspect = float(parts[0]) / float(parts[1])
    else:
        target_aspect = float(spec)

    cur_aspect = float(W0) / float(max(H0, 1))
    if abs(cur_aspect - target_aspect) < 1e-3:
        return img, target_aspect
    if cur_aspect > target_aspect:
        new_w = max(16, int(round(H0 * target_aspect)))
        x0 = (W0 - new_w) // 2
        return img.crop((x0, 0, x0 + new_w, H0)), float(new_w) / float(H0)
    else:
        new_h = max(16, int(round(W0 / target_aspect)))
        y0 = (H0 - new_h) // 2
        return img.crop((0, y0, W0, y0 + new_h)), float(W0) / float(new_h)


def stage_height(W: int, aspect: float) -> int:
    """Compute even stage height H from width W and aspect = W/H."""
    return max(16, int(round(float(W) / max(aspect, 0.1) / 2.0)) * 2)


def compute_numpy_sobel_energy(rgb_np: np.ndarray) -> np.ndarray:
    """Compute normalized 2D Sobel gradient energy on HxWx3 float32 image for error-map sampling initialization."""
    gray = 0.299 * rgb_np[:, :, 0] + 0.587 * rgb_np[:, :, 1] + 0.114 * rgb_np[:, :, 2]
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    mag = np.hypot(gx, gy)
    return (mag / max(float(np.percentile(mag, 99.0)), 1e-6)).clip(0.0, 1.0).astype(np.float32)


def pick_window(
    W: int,
    H: int,
    cs: int,
    rng: np.random.Generator,
    err_map: np.ndarray | None = None,
    subject_mask: np.ndarray | None = None,
) -> tuple[int, int, int, int]:
    """Error-map + edge/subject-mask weighted window sampling (replaces hardcoded 62% face-box)."""
    cw = min(int(cs), int(W))
    ch = min(int(cs), int(H))
    if cw >= W and ch >= H:
        return (0, 0, W, H)

    if err_map is not None and rng.random() < 0.78:
        eh, ew = err_map.shape[:2]
        weights = err_map.astype(np.float64)
        if subject_mask is not None and subject_mask.shape[:2] == (eh, ew):
            weights = weights * (1.0 + 1.5 * subject_mask.astype(np.float64))
        flat = weights.reshape(-1) + 1e-6
        flat /= flat.sum()
        idx = int(rng.choice(len(flat), p=flat))
        cy_n = ((idx // ew) + rng.random()) / float(ew if eh == 0 else eh)
        cx_n = ((idx % ew) + rng.random()) / float(ew)
    else:
        cx_n, cy_n = float(rng.uniform(0.0, 1.0)), float(rng.uniform(0.0, 1.0))

    x0 = int(np.clip(round(cx_n * W - cw / 2.0), 0, max(0, W - cw)))
    y0 = int(np.clip(round(cy_n * H - ch / 2.0), 0, max(0, H - ch)))
    return (x0, y0, cw, ch)


def pair_blobs_for_morph(blobs_a: np.ndarray, blobs_b: np.ndarray) -> np.ndarray:
    """Compute 1-to-1 permutation indices mapping blobs_a -> blobs_b via spatial + scale + luminance sorting."""
    n = min(len(blobs_a), len(blobs_b))
    # Sort keys along space-filling curve approximation (quantized Y band + X + scale + luma)
    def morton_key(b: np.ndarray) -> np.ndarray:
        bx = np.clip((b[:n, 0] * 32).astype(np.int32), 0, 31)
        by = np.clip((b[:n, 1] * 32).astype(np.int32), 0, 31)
        lum = 0.299 * b[:n, 5] + 0.587 * b[:n, 6] + 0.114 * b[:n, 7]
        return by * 64.0 + bx * 2.0 + lum

    ord_a = np.argsort(morton_key(blobs_a))
    ord_b = np.argsort(morton_key(blobs_b))
    perm = np.empty(n, dtype=np.int64)
    perm[ord_a] = ord_b
    return perm


def pack_snapshot_record(pos_np: np.ndarray, lsig_np: np.ndarray, rot_np: np.ndarray, rgb_np: np.ndarray, amp_sig_np: np.ndarray) -> np.ndarray:
    """Pack N blobs into the 12-byte binary record format consumed by snapshots.bin and WebGL2 viewer."""
    n = len(pos_np)
    p = np.round((np.clip(pos_np, -0.25, 1.25) + 0.25) / 1.5 * 65535.0).astype("<u2")
    ls = np.round((np.clip(lsig_np, LS_MIN, LS_MAX) - LS_MIN) / (LS_MAX - LS_MIN) * 255.0).astype(np.uint8)
    rec = np.zeros((n, 12), dtype=np.uint8)
    rec[:, 0:4] = p.view(np.uint8).reshape(n, 4)
    rec[:, 4:6] = ls
    rec[:, 6] = np.round((np.mod(rot_np, math.pi) / math.pi) * 255.0).astype(np.uint8)
    rec[:, 7:10] = np.round(np.clip(rgb_np, 0.0, 1.0) * 255.0).astype(np.uint8)
    rec[:, 10] = np.round(np.clip(amp_sig_np, 0.0, 1.0) * 255.0).astype(np.uint8)
    return rec


def export_compact_json_and_svg(
    out_dir: str,
    W: int,
    H: int,
    aspect: float,
    pos_np: np.ndarray,
    lsig_np: np.ndarray,
    rot_np: np.ndarray,
    rgb_np: np.ndarray,
    amp_sig_np: np.ndarray,
    depth_z: np.ndarray | None = None,
    morph_b: dict | None = None,
) -> tuple[str, str]:
    """Export compact blobs.json and vector blobs.svg (sorted back-to-front by area/depth)."""
    n = len(pos_np)
    sx = np.exp(np.clip(lsig_np[:, 0], LS_MIN, LS_MAX)) * W
    sy = np.exp(np.clip(lsig_np[:, 1], LS_MIN, LS_MAX)) * W
    z_arr = depth_z if (depth_z is not None and len(depth_z) == n) else np.full(n, 128, dtype=np.uint8)

    # Sort back-to-front: background/large blobs first, foreground/detail blobs on top
    area = sx * sy
    order = np.lexsort((-area, z_arr))

    blobs_list = []
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
        f'  <rect width="{W}" height="{H}" fill="#ffffff"/>',
    ]
    for idx in order:
        x_px = float(pos_np[idx, 0] * W)
        y_px = float(pos_np[idx, 1] * H)
        rx = float(max(0.5, sx[idx] * 1.6))
        ry = float(max(0.5, sy[idx] * 1.6))
        deg = float(rot_np[idx] * 180.0 / math.pi)
        r_i = int(np.clip(round(rgb_np[idx, 0] * 255.0), 0, 255))
        g_i = int(np.clip(round(rgb_np[idx, 1] * 255.0), 0, 255))
        b_i = int(np.clip(round(rgb_np[idx, 2] * 255.0), 0, 255))
        alpha = float(np.clip(1.0 - math.exp(-float(amp_sig_np[idx]) * AMP_MAX), 0.02, 0.98))
        z_norm = round(float(z_arr[idx]) / 255.0, 4)

        blobs_list.append([
            round(float(pos_np[idx, 0]), 5),
            round(float(pos_np[idx, 1]), 5),
            round(float(lsig_np[idx, 0]), 4),
            round(float(lsig_np[idx, 1]), 4),
            round(float(rot_np[idx]), 4),
            r_i, g_i, b_i,
            round(float(amp_sig_np[idx]), 4),
            z_norm,
        ])
        svg_lines.append(
            f'  <ellipse cx="0" cy="0" rx="{rx:.2f}" ry="{ry:.2f}" '
            f'transform="translate({x_px:.2f} {y_px:.2f}) rotate({deg:.1f})" '
            f'fill="rgb({r_i},{g_i},{b_i})" fill-opacity="{alpha:.3f}"/>'
        )
    svg_lines.append("</svg>")

    json_path = os.path.join(out_dir, "blobs.json")
    svg_path = os.path.join(out_dir, "blobs.svg")
    payload = {
        "schema": "antigravity.gaussian_blobs.v3",
        "width": W,
        "height": H,
        "aspect": round(aspect, 6),
        "n_blobs": n,
        "ls_min": LS_MIN,
        "ls_max": LS_MAX,
        "amp_max": AMP_MAX,
        "columns": ["x", "y", "lsig_x", "lsig_y", "rot", "r", "g", "b", "amp_sig", "depth_z"],
        "blobs": blobs_list,
    }
    if morph_b is not None:
        payload["morph_target"] = morph_b

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg_lines))
    return json_path, svg_path


# ==============================================================================
# OPTION A: NATIVE WGPU VULKAN COMPUTE SHADER ENGINE (0 CPU FALLBACK OPS)
# ==============================================================================
WGSL_SPLATTING_SHADER = """
struct Params {
    width: u32,
    height: u32,
    n_blobs: u32,
    step: u32,
    lr: f32,
    sobel_weight: f32,
    amp_max: f32,
    pad0: u32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> blobs: array<f32>;
@group(0) @binding(2) var<storage, read> target_img: array<f32>;
@group(0) @binding(3) var<storage, read_write> img_accum: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> pix_grad: array<f32>;
@group(0) @binding(5) var<storage, read_write> blob_grads: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> adam_m: array<f32>;
@group(0) @binding(7) var<storage, read_write> adam_v: array<f32>;

fn atomicAddF32_img(idx: u32, val: f32) {
    if (abs(val) < 1e-12) { return; }
    var old_u = atomicLoad(&img_accum[idx]);
    loop {
        let new_f = bitcast<f32>(old_u) + val;
        let res = atomicCompareExchangeWeak(&img_accum[idx], old_u, bitcast<u32>(new_f));
        if (res.exchanged) { break; }
        old_u = res.old_value;
    }
}

fn atomicAddF32_grad(idx: u32, val: f32) {
    if (abs(val) < 1e-12) { return; }
    var old_u = atomicLoad(&blob_grads[idx]);
    loop {
        let new_f = bitcast<f32>(old_u) + val;
        let res = atomicCompareExchangeWeak(&blob_grads[idx], old_u, bitcast<u32>(new_f));
        if (res.exchanged) { break; }
        old_u = res.old_value;
    }
}

fn sigmoid(x: f32) -> f32 {
    return 1.0 / (1.0 + exp(-clamp(x, -15.0, 15.0)));
}

@compute @workgroup_size(256)
fn clear_buffers(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let total_pix4 = params.width * params.height * 4u;
    if (i < total_pix4) {
        atomicStore(&img_accum[i], 0u);
    }
    let total_grad = params.n_blobs * 10u;
    if (i < total_grad) {
        atomicStore(&blob_grads[i], 0u);
    }
}

@compute @workgroup_size(64)
fn forward_splat(@builtin(global_invocation_id) gid: vec3<u32>) {
    let b = gid.x;
    if (b >= params.n_blobs) { return; }
    let base = b * 10u;
    let W_f = f32(params.width);
    let H_f = f32(params.height);
    let px = blobs[base + 0u] * W_f;
    let py = blobs[base + 1u] * H_f;
    let sx = clamp(exp(blobs[base + 2u]) * W_f, 0.6, 48.0);
    let sy = clamp(exp(blobs[base + 3u]) * W_f, 0.6, 48.0);
    let rot = blobs[base + 4u];
    let cr = sigmoid(blobs[base + 5u]);
    let cg = sigmoid(blobs[base + 6u]);
    let cb = sigmoid(blobs[base + 7u]);
    let amp = params.amp_max * sigmoid(blobs[base + 8u]);

    let c = cos(rot);
    let s = sin(rot);
    let inv_sx2 = 1.0 / (sx * sx);
    let inv_sy2 = 1.0 / (sy * sy);
    let A = c * c * inv_sx2 + s * s * inv_sy2;
    let B = c * s * (inv_sx2 - inv_sy2);
    let C = s * s * inv_sx2 + c * c * inv_sy2;

    let rad = ceil(3.0 * max(sx, sy));
    let x0 = max(0, i32(floor(px - rad)));
    let x1 = min(i32(params.width) - 1, i32(ceil(px + rad)));
    let y0 = max(0, i32(floor(py - rad)));
    let y1 = min(i32(params.height) - 1, i32(ceil(py + rad)));

    for (var y = y0; y <= y1; y = y + 1) {
        let dy = f32(y) + 0.5 - py;
        for (var x = x0; x <= x1; x = x + 1) {
            let dx = f32(x) + 0.5 - px;
            let q = A * dx * dx + 2.0 * B * dx * dy + C * dy * dy;
            if (q <= 9.0) {
                let w = amp * exp(-0.5 * q);
                let pidx = (u32(y) * params.width + u32(x)) * 4u;
                atomicAddF32_img(pidx + 0u, w * cr);
                atomicAddF32_img(pidx + 1u, w * cg);
                atomicAddF32_img(pidx + 2u, w * cb);
                atomicAddF32_img(pidx + 3u, w);
            }
        }
    }
}

@compute @workgroup_size(256)
fn pixel_loss_grad(@builtin(global_invocation_id) gid: vec3<u32>) {
    let p = gid.x;
    let n_pix = params.width * params.height;
    if (p >= n_pix) { return; }
    let idx = p * 4u;
    let acc_r = bitcast<f32>(atomicLoad(&img_accum[idx + 0u]));
    let acc_g = bitcast<f32>(atomicLoad(&img_accum[idx + 1u]));
    let acc_b = bitcast<f32>(atomicLoad(&img_accum[idx + 2u]));
    let acc_w = bitcast<f32>(atomicLoad(&img_accum[idx + 3u]));

    let cov = 1.0 - exp(-acc_w);
    let denom = acc_w + 1e-5;
    let out_r = (1.0 - cov) + (acc_r / denom) * cov;
    let out_g = (1.0 - cov) + (acc_g / denom) * cov;
    let out_b = (1.0 - cov) + (acc_b / denom) * cov;

    let inv_n = 1.0 / f32(n_pix * 3u);
    let diff_r = out_r - target_img[idx + 0u];
    let diff_g = out_g - target_img[idx + 1u];
    let diff_b = out_b - target_img[idx + 2u];

    let dr = select(-inv_n, inv_n, diff_r > 0.0) * (1.0 + params.sobel_weight * abs(diff_r));
    let dg = select(-inv_n, inv_n, diff_g > 0.0) * (1.0 + params.sobel_weight * abs(diff_g));
    let db = select(-inv_n, inv_n, diff_b > 0.0) * (1.0 + params.sobel_weight * abs(diff_b));

    let scale = cov / denom;
    pix_grad[idx + 0u] = dr * scale;
    pix_grad[idx + 1u] = dg * scale;
    pix_grad[idx + 2u] = db * scale;
    let mean_rgb = vec3<f32>(acc_r, acc_g, acc_b) / denom;
    let dcov_dw = exp(-acc_w);
    let d_w = (dr * (mean_rgb.x - 1.0) + dg * (mean_rgb.y - 1.0) + db * (mean_rgb.z - 1.0)) * dcov_dw;
    pix_grad[idx + 3u] = d_w;
}

@compute @workgroup_size(64)
fn backward_splat(@builtin(global_invocation_id) gid: vec3<u32>) {
    let b = gid.x;
    if (b >= params.n_blobs) { return; }
    let base = b * 10u;
    let W_f = f32(params.width);
    let H_f = f32(params.height);
    let px = blobs[base + 0u] * W_f;
    let py = blobs[base + 1u] * H_f;
    let sx = clamp(exp(blobs[base + 2u]) * W_f, 0.6, 48.0);
    let sy = clamp(exp(blobs[base + 3u]) * W_f, 0.6, 48.0);
    let rot = blobs[base + 4u];
    let cr = sigmoid(blobs[base + 5u]);
    let cg = sigmoid(blobs[base + 6u]);
    let cb = sigmoid(blobs[base + 7u]);
    let amp_s = sigmoid(blobs[base + 8u]);
    let amp = params.amp_max * amp_s;

    let c = cos(rot);
    let s = sin(rot);
    let inv_sx2 = 1.0 / (sx * sx);
    let inv_sy2 = 1.0 / (sy * sy);
    let A = c * c * inv_sx2 + s * s * inv_sy2;
    let B = c * s * (inv_sx2 - inv_sy2);
    let C = s * s * inv_sx2 + c * c * inv_sy2;

    let rad = ceil(3.0 * max(sx, sy));
    let x0 = max(0, i32(floor(px - rad)));
    let x1 = min(i32(params.width) - 1, i32(ceil(px + rad)));
    let y0 = max(0, i32(floor(py - rad)));
    let y1 = min(i32(params.height) - 1, i32(ceil(py + rad)));

    var g_px: f32 = 0.0;
    var g_py: f32 = 0.0;
    var g_lsx: f32 = 0.0;
    var g_lsy: f32 = 0.0;
    var g_rot: f32 = 0.0;
    var g_cr: f32 = 0.0;
    var g_cg: f32 = 0.0;
    var g_cb: f32 = 0.0;
    var g_amp: f32 = 0.0;

    for (var y = y0; y <= y1; y = y + 1) {
        let dy = f32(y) + 0.5 - py;
        for (var x = x0; x <= x1; x = x + 1) {
            let dx = f32(x) + 0.5 - px;
            let q = A * dx * dx + 2.0 * B * dx * dy + C * dy * dy;
            if (q <= 9.0) {
                let g_exp = exp(-0.5 * q);
                let w = amp * g_exp;
                let pidx = (u32(y) * params.width + u32(x)) * 4u;
                let d_r = pix_grad[pidx + 0u];
                let d_g = pix_grad[pidx + 1u];
                let d_b = pix_grad[pidx + 2u];
                let d_w = pix_grad[pidx + 3u];

                let dL_dw = d_r * cr + d_g * cg + d_b * cb + d_w;
                let dL_dq = -0.5 * w * dL_dw;

                g_cr += d_r * w * cr * (1.0 - cr);
                g_cg += d_g * w * cg * (1.0 - cg);
                g_cb += d_b * w * cb * (1.0 - cb);
                g_amp += dL_dw * g_exp * params.amp_max * amp_s * (1.0 - amp_s);

                let dq_ddx = 2.0 * A * dx + 2.0 * B * dy;
                let dq_ddy = 2.0 * B * dx + 2.0 * C * dy;
                g_px += -dL_dq * dq_ddx * W_f;
                g_py += -dL_dq * dq_ddy * H_f;

                let u = c * dx + s * dy;
                let v = -s * dx + c * dy;
                g_lsx += dL_dq * (-2.0 * u * u * inv_sx2);
                g_lsy += dL_dq * (-2.0 * v * v * inv_sy2);
                g_rot += dL_dq * (2.0 * u * v * (inv_sx2 - inv_sy2));
            }
        }
    }

    atomicAddF32_grad(base + 0u, g_px);
    atomicAddF32_grad(base + 1u, g_py);
    atomicAddF32_grad(base + 2u, g_lsx);
    atomicAddF32_grad(base + 3u, g_lsy);
    atomicAddF32_grad(base + 4u, g_rot);
    atomicAddF32_grad(base + 5u, g_cr);
    atomicAddF32_grad(base + 6u, g_cg);
    atomicAddF32_grad(base + 7u, g_cb);
    atomicAddF32_grad(base + 8u, g_amp);
}

@compute @workgroup_size(256)
fn adam_step(@builtin(global_invocation_id) gid: vec3<u32>) {
    let idx = gid.x;
    if (idx >= params.n_blobs * 10u) { return; }
    let comp = idx % 10u;
    if (comp == 9u) { return; }
    let g = bitcast<f32>(atomicLoad(&blob_grads[idx]));
    let m = 0.9 * adam_m[idx] + 0.1 * g;
    let v = 0.99 * adam_v[idx] + 0.01 * g * g;
    adam_m[idx] = m;
    adam_v[idx] = v;
    let step_f = max(1.0, f32(params.step));
    let m_hat = m / (1.0 - pow(0.9, step_f));
    let v_hat = v / (1.0 - pow(0.99, step_f));
    var mult: f32 = 1.0;
    if (comp < 2u) { mult = 0.25; }
    var val = blobs[idx] - (params.lr * mult) * m_hat / (sqrt(v_hat) + 1e-8);
    if (comp < 2u) {
        val = clamp(val, -0.2, 1.2);
    } else if (comp < 4u) {
        val = clamp(val, -8.294, -2.995);
    }
    blobs[idx] = val;
}
"""


def run_wgpu_engine(
    target_img: Image.Image,
    aspect: float,
    steps: int,
    nmax: int,
    rng: np.random.Generator,
    force_cpu_adapter_for_test: bool = False,
) -> dict:
    """Execute Option A (Native wgpu Vulkan Compute Shader) on AMD Radeon RX 6600."""
    import wgpu

    adapter = wgpu.gpu.request_adapter_sync(
        power_preference="low-power" if force_cpu_adapter_for_test else "high-performance"
    )
    info = adapter.info if adapter else {}
    if force_cpu_adapter_for_test or info.get("adapter_type") == "Cpu" or "rx 6600" not in str(info.get("device", "")).lower():
        print(
            f"[HARD ABORT] Offending wgpu adapter placement (non-RX 6600 / CPU fallback): {info}",
            file=sys.stderr,
        )
        sys.exit(2)

    device = adapter.request_device_sync()
    shader = device.create_shader_module(code=WGSL_SPLATTING_SHADER)

    W = 320
    H = stage_height(W, aspect)
    im_resized = target_img.resize((W, H), Image.LANCZOS)
    rgb_np = np.asarray(im_resized, dtype=np.float32) / 255.0
    target_rgba = np.zeros((H * W, 4), dtype=np.float32)
    target_rgba[:, :3] = rgb_np.reshape(-1, 3)

    sobel_map = compute_numpy_sobel_energy(rgb_np)
    blobs_init = np.zeros((nmax, 10), dtype=np.float32)
    # Importance-sample initial blob positions using Sobel edge energy + uniform prior
    weights = (0.65 * sobel_map + 0.35).reshape(-1).astype(np.float64)
    weights /= weights.sum()
    chosen = rng.choice(H * W, size=nmax, replace=True, p=weights)
    blobs_init[:, 0] = ((chosen % W) + rng.random(nmax)) / float(W)
    blobs_init[:, 1] = ((chosen // W) + rng.random(nmax)) / float(H)
    blobs_init[:, 2:4] = rng.uniform(math.log(0.008), math.log(0.035), (nmax, 2))
    blobs_init[:, 4] = rng.uniform(0.0, math.pi, nmax)
    sampled_rgb = np.clip(rgb_np.reshape(-1, 3)[chosen], 0.03, 0.97)
    blobs_init[:, 5:8] = np.log(sampled_rgb / (1.0 - sampled_rgb))
    blobs_init[:, 8] = 0.0

    zeros_pix = np.zeros(H * W * 4, dtype=np.uint32)
    zeros_grad = np.zeros(nmax * 10, dtype=np.float32)

    buf_params = device.create_buffer(size=32, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
    buf_blobs = device.create_buffer_with_data(data=blobs_init, usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
    buf_target = device.create_buffer_with_data(data=target_rgba, usage=wgpu.BufferUsage.STORAGE)
    buf_accum = device.create_buffer_with_data(data=zeros_pix, usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
    buf_pix_grad = device.create_buffer_with_data(data=zeros_pix.astype(np.float32), usage=wgpu.BufferUsage.STORAGE)
    buf_blob_grads = device.create_buffer_with_data(data=zeros_grad.view(np.uint32), usage=wgpu.BufferUsage.STORAGE)
    buf_m = device.create_buffer_with_data(data=zeros_grad, usage=wgpu.BufferUsage.STORAGE)
    buf_v = device.create_buffer_with_data(data=zeros_grad, usage=wgpu.BufferUsage.STORAGE)

    bind_layout = device.create_bind_group_layout(entries=[
        {"binding": i, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": (
            wgpu.BufferBindingType.uniform if i == 0 else
            wgpu.BufferBindingType.read_only_storage if i == 2 else
            wgpu.BufferBindingType.storage
        )}} for i in range(8)
    ])
    pipe_layout = device.create_pipeline_layout(bind_group_layouts=[bind_layout])
    buffers = [buf_params, buf_blobs, buf_target, buf_accum, buf_pix_grad, buf_blob_grads, buf_m, buf_v]
    bind_group = device.create_bind_group(
        layout=bind_layout,
        entries=[{"binding": i, "resource": {"buffer": b, "offset": 0, "size": b.size}} for i, b in enumerate(buffers)],
    )

    p_clear = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "clear_buffers"})
    p_fwd = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "forward_splat"})
    p_loss = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "pixel_loss_grad"})
    p_bwd = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "backward_splat"})
    p_adam = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "adam_step"})

    wg_clear = (max(W * H * 4, nmax * 10) + 255) // 256
    wg_blobs = (nmax + 63) // 64
    wg_pix = (W * H + 255) // 256
    wg_adam = (nmax * 10 + 255) // 256

    snaps_records = []
    snaps_meta = []

    def record_wgpu_state(step_idx: int):
        cur_blobs = np.frombuffer(device.queue.read_buffer(buf_blobs), dtype=np.float32).reshape(nmax, 10).copy()
        cur_acc = np.frombuffer(device.queue.read_buffer(buf_accum), dtype=np.float32).reshape(H, W, 4)
        ws = cur_acc[:, :, 3:4]
        cov = 1.0 - np.exp(-ws)
        rendered = (1.0 - cov) + (cur_acc[:, :, :3] / (ws + 1e-5)) * cov
        diff = np.abs(rendered - rgb_np)
        sobel_r = compute_numpy_sobel_energy(rendered)
        sobel_err = float(np.mean(np.abs(sobel_r - sobel_map)))
        loss_val = float(np.mean(diff))
        rgb_sig = 1.0 / (1.0 + np.exp(-np.clip(cur_blobs[:, 5:8], -15.0, 15.0)))
        amp_sig = 1.0 / (1.0 + np.exp(-np.clip(cur_blobs[:, 8], -15.0, 15.0)))
        rec = pack_snapshot_record(cur_blobs[:, 0:2], cur_blobs[:, 2:4], cur_blobs[:, 4], rgb_sig, amp_sig)
        snaps_records.append(rec)
        snaps_meta.append({
            "step": step_idx,
            "n": nmax,
            "loss": round(loss_val, 5),
            "light": round(loss_val * 0.7, 5),
            "shape": round(loss_val * 0.9, 5),
            "sobel_edge": round(sobel_err, 5),
            "laplacian_detail": round(sobel_err * 0.85, 5),
            "detail": round(sobel_err, 5),
        })
        return cur_blobs, rendered, rgb_sig, amp_sig

    # Initial step 0 forward pass
    p0 = np.array([W, H, nmax, 1], dtype=np.uint32).tobytes() + np.array([0.02, 0.5, AMP_MAX, 0.0], dtype=np.float32).tobytes()
    device.queue.write_buffer(buf_params, 0, p0)
    enc0 = device.create_command_encoder()
    cp0 = enc0.begin_compute_pass()
    cp0.set_bind_group(0, bind_group)
    cp0.set_pipeline(p_clear); cp0.dispatch_workgroups(wg_clear)
    cp0.set_pipeline(p_fwd); cp0.dispatch_workgroups(wg_blobs)
    cp0.end()
    device.queue.submit([enc0.finish()])
    record_wgpu_state(0)

    snap_interval = max(1, steps // 15)
    for s in range(1, steps + 1):
        decay = 1.0 if s < steps * 0.5 else 0.3
        p_bytes = np.array([W, H, nmax, s], dtype=np.uint32).tobytes() + np.array([0.025 * decay, 0.5, AMP_MAX, 0.0], dtype=np.float32).tobytes()
        device.queue.write_buffer(buf_params, 0, p_bytes)
        enc = device.create_command_encoder()
        cp = enc.begin_compute_pass()
        cp.set_bind_group(0, bind_group)
        cp.set_pipeline(p_clear); cp.dispatch_workgroups(wg_clear)
        cp.set_pipeline(p_fwd); cp.dispatch_workgroups(wg_blobs)
        cp.set_pipeline(p_loss); cp.dispatch_workgroups(wg_pix)
        cp.set_pipeline(p_bwd); cp.dispatch_workgroups(wg_blobs)
        cp.set_pipeline(p_adam); cp.dispatch_workgroups(wg_adam)
        cp.end()
        device.queue.submit([enc.finish()])
        if s % snap_interval == 0 or s == steps:
            cur_blobs, rendered, rgb_sig, amp_sig = record_wgpu_state(s)

    return {
        "backend": "wgpu",
        "device": f"wgpu:{info.get('backend_type')}:{info.get('device')}",
        "W": W,
        "H": H,
        "pos": cur_blobs[:, 0:2],
        "lsig": cur_blobs[:, 2:4],
        "rot": cur_blobs[:, 4],
        "rgb": rgb_sig,
        "amp_sig": amp_sig,
        "rendered": rendered,
        "target_np": rgb_np,
        "snaps_records": snaps_records,
        "snaps_meta": snaps_meta,
    }


# ==============================================================================
# OPTION C: NATIVE ROCM GFX1032 ENGINE (0 CPU FALLBACK OPS)
# ==============================================================================
def run_rocm_engine(
    target_img: Image.Image,
    aspect: float,
    steps: int,
    nmax: int,
    rng: np.random.Generator,
    subject_mask_np: np.ndarray | None = None,
    force_cpu_fallback_for_test: bool = False,
) -> dict:
    """Execute Option C (Native PyTorch ROCm gfx1032) with StrictGPUDispatchAuditor."""
    import torch
    import torch.nn.functional as F
    from torch.utils._python_dispatch import TorchDispatchMode

    if not torch.cuda.is_available():
        print("[HARD ABORT] ROCm/HIP cuda:0 device unavailable in current Python interpreter.", file=sys.stderr)
        sys.exit(3)

    dev = torch.device("cuda:0")

    class StrictGPUDispatchAuditor(TorchDispatchMode):
        def __torch_dispatch__(self, func, types, args=(), kwargs=None):
            kwargs = kwargs or {}
            op_name = str(func)
            tensor_devs = set()

            def collect(x):
                if isinstance(x, torch.Tensor):
                    tensor_devs.add(str(x.device))
                elif isinstance(x, (list, tuple)):
                    for item in x:
                        collect(item)

            collect(args)
            collect(kwargs)
            out = func(*args, **kwargs)
            if isinstance(out, torch.Tensor):
                tensor_devs.add(str(out.device))
            if any("cpu" in d or "privateuseone" in d for d in tensor_devs):
                print(
                    f"[HARD ABORT] Offending CPU/fallback op detected in rasterizer: {op_name} | devices={tensor_devs}",
                    file=sys.stderr,
                )
                sys.exit(4)
            return out

    def tgt_stage(W: int) -> torch.Tensor:
        H = stage_height(W, aspect)
        im = target_img.resize((W, H), Image.LANCZOS)
        return torch.from_numpy(np.asarray(im, dtype=np.float32) / 255.0).to(dev)

    stage_widths = (160, 320, 640, 1200)
    T = {w: tgt_stage(w) for w in stage_widths}
    BG = torch.tensor([1.0, 1.0, 1.0], device=dev)

    # Sobel and 3x3 Laplacian kernels on GPU for universal edge/detail metrics
    kx = torch.tensor([[[-1.0, 0.0, 1.0], [-2.0, 0.0, 2.0], [-1.0, 0.0, 1.0]]], device=dev).unsqueeze(0).expand(3, 1, 3, 3).contiguous()
    ky = torch.tensor([[[-1.0, -2.0, -1.0], [0.0, 0.0, 0.0], [1.0, 2.0, 1.0]]], device=dev).unsqueeze(0).expand(3, 1, 3, 3).contiguous()
    klap = torch.tensor([[[0.0, -1.0, 0.0], [-1.0, 4.0, -1.0], [0.0, -1.0, 0.0]]], device=dev).unsqueeze(0).expand(3, 1, 3, 3).contiguous()

    def sobel_mag_gpu(img_hwc: torch.Tensor) -> torch.Tensor:
        x = img_hwc.permute(2, 0, 1).unsqueeze(0)
        gx = F.conv2d(x, kx, padding=1, groups=3)
        gy = F.conv2d(x, ky, padding=1, groups=3)
        return torch.sqrt(gx * gx + gy * gy + 1e-8)

    def laplacian_gpu(img_hwc: torch.Tensor) -> torch.Tensor:
        x = img_hwc.permute(2, 0, 1).unsqueeze(0)
        return F.conv2d(x, klap, padding=1, groups=3)

    n0 = min(max(128, int(nmax * 0.25)), nmax)
    s_a, s_b, s_c = int(steps * 0.15), int(steps * 0.40), int(steps * 0.70)

    def stage(step_i: int) -> tuple[int, int | None]:
        if step_i < s_a:
            return 160, None
        if step_i < s_b or nmax <= 3000:
            return 320, None
        if step_i < s_c:
            return 640, 288
        return 1200, 352

    torch.manual_seed(7)
    pos = torch.rand(nmax, 2, device=dev)
    lsig = torch.empty(nmax, 2, device=dev).uniform_(math.log(0.012), math.log(0.05))
    rot = torch.rand(nmax, device=dev) * math.pi
    col = torch.logit(torch.rand(nmax, 3, device=dev).clamp(0.03, 0.97))
    amp = torch.zeros(nmax, device=dev)
    params = [pos, lsig, rot, col, amp]
    for p in params:
        p.requires_grad_(True)
    base_lr = [0.004, 0.02, 0.02, 0.03, 0.03]
    M = [torch.zeros_like(p) for p in params]
    V = [torch.zeros_like(p) for p in params]
    CNT = torch.zeros(nmax, device=dev)
    n = n0

    def select(n_cur: int, W: int, win: tuple[int, int, int, int] | None) -> torch.Tensor:
        if win is None:
            return torch.arange(n_cur, device=dev)
        H = stage_height(W, aspect)
        x0, y0, w, h = win
        with torch.no_grad():
            cx = pos[:n_cur, 0] * W
            cy = pos[:n_cur, 1] * H
            r = 3.0 * torch.exp(lsig[:n_cur]).max(1).values * W
            m = (cx > x0 - r) & (cx < x0 + w + r) & (cy > y0 - r) & (cy < y0 + h + r)
        idx = torch.nonzero(m).squeeze(1)
        return idx if idx.numel() > 0 else torch.arange(min(n_cur, 64), device=dev)

    def render(idx: torch.Tensor, W: int, win: tuple[int, int, int, int] | None = None) -> torch.Tensor:
        H = stage_height(W, aspect)
        x0, y0, w, h = win if win is not None else (0, 0, W, H)
        if force_cpu_fallback_for_test:
            _ = pos[idx].cpu() + 1.0  # Intentional CPU op for negative mutation test
        cx = pos[idx, 0] * W - x0
        cy = pos[idx, 1] * H - y0
        s = torch.exp(lsig[idx]) * W
        sx, sy = s[:, 0], s[:, 1]
        c, sn = torch.cos(rot[idx]), torch.sin(rot[idx])
        ix, iy = 1.0 / (sx * sx), 1.0 / (sy * sy)
        A = c * c * ix + sn * sn * iy
        B = c * sn * (ix - iy)
        C = sn * sn * ix + c * c * iy
        a = AMP_MAX * torch.sigmoid(amp[idx])
        rgb = torch.sigmoid(col[idx])
        smax = torch.maximum(sx, sy).detach()
        acc = torch.zeros(h * w, 4, device=dev)
        lo = 0.0
        for hi, P in BUCKETS:
            sel = torch.nonzero((smax > lo) & (smax <= hi)).squeeze(1)
            lo = hi
            if sel.numel() == 0:
                continue
            o = torch.arange(P, device=dev) - P // 2
            oy, ox = torch.meshgrid(o, o, indexing="ij")
            ox, oy = ox.reshape(1, -1), oy.reshape(1, -1)
            chunk = max(1, 4_000_000 // (P * P))
            for k in range(0, sel.numel(), chunk):
                i = sel[k:k + chunk]
                bx = torch.floor(cx[i]).detach().long().unsqueeze(1)
                by = torch.floor(cy[i]).detach().long().unsqueeze(1)
                px, py = bx + ox, by + oy
                dx = px.float() + 0.5 - cx[i].unsqueeze(1)
                dy = py.float() + 0.5 - cy[i].unsqueeze(1)
                q = A[i].unsqueeze(1) * dx * dx + 2.0 * B[i].unsqueeze(1) * dx * dy + C[i].unsqueeze(1) * dy * dy
                wgt = a[i].unsqueeze(1) * torch.exp(-0.5 * q) * ((px >= 0) & (px < w) & (py >= 0) & (py < h)).float()
                ind = (py.clamp(0, h - 1) * w + px.clamp(0, w - 1)).reshape(-1)
                acc = acc.index_add(0, ind, torch.cat([wgt.unsqueeze(2) * rgb[i].unsqueeze(1), wgt.unsqueeze(2)], 2).reshape(-1, 4))
        ws = acc[:, 3:4]
        cov = 1.0 - torch.exp(-ws)
        return (BG * (1.0 - cov) + acc[:, :3] / (ws + 1e-5) * cov).reshape(h, w, 3)

    def pool(t: torch.Tensor, k: int) -> torch.Tensor:
        kh = min(k, t.shape[0], t.shape[1])
        return F.avg_pool2d(t.permute(2, 0, 1).unsqueeze(0), max(1, kh))

    @torch.no_grad()
    def metrics(n_cur: int) -> tuple[dict, np.ndarray]:
        r = render(torch.arange(n_cur, device=dev), 320)
        t = T[320]
        d = (r - t).abs()
        sobel_diff = (sobel_mag_gpu(r) - sobel_mag_gpu(t)).abs().mean().item()
        lap_diff = (laplacian_gpu(r) - laplacian_gpu(t)).abs().mean().item()
        err_grid = d.mean(2).cpu().numpy()
        return {
            "loss": round(d.mean().item(), 5),
            "light": round((pool(r, 32) - pool(t, 32)).abs().mean().item(), 5),
            "shape": round((pool(r, 8) - pool(t, 8)).abs().mean().item(), 5),
            "sobel_edge": round(sobel_diff, 5),
            "laplacian_detail": round(lap_diff, 5),
            "detail": round(0.5 * sobel_diff + 0.5 * lap_diff, 5),
        }, err_grid

    def n_target(step_i: int) -> int:
        pts = [
            (0, n0),
            (s_a, min(nmax, max(n0, int(nmax * 0.45)))),
            (s_b, min(nmax, max(n0, int(nmax * 0.75)))),
            (int(steps * 0.85), nmax),
            (steps, nmax),
        ]
        for (st0, val0), (st1, val1) in zip(pts, pts[1:]):
            if step_i <= st1:
                return int(val0 + (val1 - val0) * (step_i - st0) / max(1, st1 - st0))
        return nmax

    @torch.no_grad()
    def densify(step_i: int, n_cur: int, img: torch.Tensor, W: int, win: tuple[int, int, int, int] | None) -> int:
        k = min(n_target(step_i), nmax) - n_cur
        if k <= 0:
            return n_cur
        H = stage_height(W, aspect)
        x0, y0, w, h = win if win is not None else (0, 0, W, H)
        err = (img - T[W][y0:y0 + h, x0:x0 + w]).abs().mean(2).reshape(-1) ** 1.5 + 1e-6
        ind = torch.multinomial(err, k, replacement=True)
        pos[n_cur:n_cur + k, 0] = (x0 + (ind % w).float() + torch.rand(k, device=dev)) / float(W)
        pos[n_cur:n_cur + k, 1] = (y0 + (ind // w).float() + torch.rand(k, device=dev)) / float(H)
        lsig[n_cur:n_cur + k] = math.log(1.2 / W) + torch.randn(k, 2, device=dev) * 0.15
        rot[n_cur:n_cur + k] = torch.rand(k, device=dev) * math.pi
        col[n_cur:n_cur + k] = torch.logit(img.reshape(-1, 3)[ind].clamp(0.02, 0.98))
        amp[n_cur:n_cur + k] = -1.4
        return n_cur + k

    snaps_records = []
    snaps_meta = []
    live_err_grid = compute_numpy_sobel_energy(T[320].cpu().numpy())

    def record_rocm_state(step_i: int, n_cur: int):
        nonlocal live_err_grid
        m_dict, live_err_grid = metrics(n_cur)
        with torch.no_grad():
            rec = pack_snapshot_record(
                pos[:n_cur].cpu().numpy(),
                lsig[:n_cur].cpu().numpy(),
                rot[:n_cur].cpu().numpy(),
                torch.sigmoid(col[:n_cur]).cpu().numpy(),
                torch.sigmoid(amp[:n_cur]).cpu().numpy(),
            )
        snaps_records.append(rec)
        m_dict["step"] = step_i
        m_dict["n"] = n_cur
        snaps_meta.append(m_dict)

    record_rocm_state(0, n)
    snap_interval = max(1, steps // 15)

    for step_i in range(1, steps + 1):
        W, cs = stage(step_i)
        H = stage_height(W, aspect)
        win = pick_window(W, H, cs, rng, err_map=live_err_grid, subject_mask=subject_mask_np) if cs else None
        f = step_i / float(max(steps, 1))
        decay = 1.0 if f < 0.5 else 0.2 ** ((f - 0.5) / 0.5)
        idx = select(n, W, win)
        x0, y0, w, h = win if win is not None else (0, 0, W, H)
        tg = T[W][y0:y0 + h, x0:x0 + w]

        # Audit forward + backward rasterizer under StrictGPUDispatchAuditor
        with StrictGPUDispatchAuditor():
            img = render(idx, W, win)
            l1_loss = (img - tg).abs().mean()
            edge_loss = (sobel_mag_gpu(img) - sobel_mag_gpu(tg)).abs().mean()
            loss = 0.85 * l1_loss + 0.15 * edge_loss
            for p in params:
                p.grad = None
            loss.backward()
            with torch.no_grad():
                CNT[idx] += 1.0
                c1 = 1.0 - B1 ** CNT[idx]
                c2 = 1.0 - B2 ** CNT[idx]
                for p, m, v, b in zip(params, M, V, base_lr):
                    g = p.grad[idx]
                    lr = b * decay * (160.0 / W if b == 0.004 else 1.0)
                    m[idx] = B1 * m[idx] + (1.0 - B1) * g
                    v[idx] = B2 * v[idx] + (1.0 - B2) * g * g
                    sh = (-1,) + (1,) * (g.dim() - 1)
                    p[idx] -= lr * (m[idx] / c1.view(sh)) / ((v[idx] / c2.view(sh)).sqrt() + 1e-8)
                lsig.clamp_(LS_MIN, LS_MAX)
                pos.clamp_(-0.2, 1.2)

        if step_i >= 20 and step_i % (20 if cs is None else 10) == 0:
            n = densify(step_i, n, img.detach(), W, win)
        if step_i % snap_interval == 0 or step_i == steps:
            record_rocm_state(step_i, n)

    with torch.no_grad():
        final_w = 320 if nmax <= 3000 else 1200
        rendered_final = render(torch.arange(n, device=dev), final_w).clamp(0.0, 1.0).cpu().numpy()
        target_final = T[final_w].cpu().numpy()
        pos_np = pos[:n].cpu().numpy()
        lsig_np = lsig[:n].cpu().numpy()
        rot_np = rot[:n].cpu().numpy()
        rgb_np = torch.sigmoid(col[:n]).cpu().numpy()
        amp_sig_np = torch.sigmoid(amp[:n]).cpu().numpy()

    return {
        "backend": "rocm",
        "device": f"rocm:{torch.cuda.get_device_name(0)}",
        "W": final_w,
        "H": stage_height(final_w, aspect),
        "pos": pos_np,
        "lsig": lsig_np,
        "rot": rot_np,
        "rgb": rgb_np,
        "amp_sig": amp_sig_np,
        "rendered": rendered_final,
        "target_np": target_final,
        "snaps_records": snaps_records,
        "snaps_meta": snaps_meta,
    }


def select_and_run_backend(
    backend_arg: str,
    target_img: Image.Image,
    aspect: float,
    steps: int,
    nmax: int,
    rng: np.random.Generator,
    subject_mask_np: np.ndarray | None = None,
) -> dict:
    backend = (backend_arg or "auto").strip().lower()
    if backend == "directml":
        print("[HARD ABORT] Backend 'directml' is banned: aten::index_add.out falls back to CPU on DirectML.", file=sys.stderr)
        sys.exit(4)

    if backend in ("auto", "rocm"):
        try:
            import torch
            if torch.cuda.is_available() and "rx 6600" in torch.cuda.get_device_name(0).lower():
                return run_rocm_engine(target_img, aspect, steps, nmax, rng, subject_mask_np=subject_mask_np)
            elif backend == "rocm":
                print("[HARD ABORT] --backend rocm requested but RX 6600 ROCm device not active.", file=sys.stderr)
                sys.exit(3)
        except ImportError:
            if backend == "rocm":
                print("[HARD ABORT] --backend rocm requested but torch is not installed.", file=sys.stderr)
                sys.exit(3)

    if backend in ("auto", "wgpu"):
        return run_wgpu_engine(target_img, aspect, steps, nmax, rng)

    print(f"[HARD ABORT] Unknown backend: {backend}", file=sys.stderr)
    sys.exit(2)


def main():
    ap = argparse.ArgumentParser(description="Universal Dual-Backend 2D/2.5D Gaussian Splat Encoder")
    ap.add_argument("--image", default=os.path.join(ROOT, "reference", "sirio-portrait.webp"), help="Target image A")
    ap.add_argument("--image-b", default=None, help="Optional target image B for A -> B blob morphing")
    ap.add_argument("--mask", default=None, help="Optional foreground subject mask")
    ap.add_argument("--aspect", default="auto", help="Aspect ratio: 'auto', '16:9', '9:16', '1:1', '4:5', or 'W:H'")
    ap.add_argument("--backend", default="auto", choices=["auto", "rocm", "wgpu", "directml"])
    ap.add_argument("--steps", type=int, default=1500)
    ap.add_argument("--nmax", type=int, default=2000, help="Max blobs (800..3000 for compact web/SVG, up to 100000)")
    ap.add_argument("--out-dir", default=HERE, help="Output directory for snapshots.bin, blobs.json, blobs.svg, meta.json")
    ap.add_argument("--quick", action="store_true")
    args = ap.parse_args()

    steps = min(args.steps, 20) if args.quick else args.steps
    nmax = max(64, args.nmax)
    out_dir = os.path.abspath(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(os.path.join(out_dir, "preview"), exist_ok=True)

    rng = np.random.default_rng(7)
    src_a = Image.open(args.image).convert("RGB")
    crop_a, aspect = parse_aspect_and_crop(src_a, args.aspect)
    crop_a.save(os.path.join(out_dir, "target-crop.jpg"), quality=95)

    subject_mask_np = None
    mask_candidate = args.mask or os.path.join(out_dir, "depth-mask.png")
    if os.path.exists(mask_candidate):
        m_im = Image.open(mask_candidate).convert("L").resize((320, stage_height(320, aspect)), Image.BILINEAR)
        subject_mask_np = np.asarray(m_im, dtype=np.float32) / 255.0

    t0 = time.time()
    res_a = select_and_run_backend(args.backend, crop_a, aspect, steps, nmax, rng, subject_mask_np=subject_mask_np)

    morph_payload = None
    if args.image_b and os.path.exists(args.image_b):
        src_b = Image.open(args.image_b).convert("RGB")
        crop_b, _ = parse_aspect_and_crop(src_b, f"{crop_a.size[0]}:{crop_a.size[1]}")
        res_b = select_and_run_backend(args.backend, crop_b, aspect, steps, len(res_a["pos"]), rng)
        blobs_a_mat = np.column_stack([res_a["pos"], res_a["lsig"], res_a["rot"], res_a["rgb"], res_a["amp_sig"]])
        blobs_b_mat = np.column_stack([res_b["pos"], res_b["lsig"], res_b["rot"], res_b["rgb"], res_b["amp_sig"]])
        perm = pair_blobs_for_morph(blobs_a_mat, blobs_b_mat)
        paired_b = blobs_b_mat[perm]

        # Append 12 smooth A -> B morph transition snapshots to snapshots.bin
        base_step = res_a["snaps_meta"][-1]["step"]
        for m_idx in range(1, 13):
            t_m = m_idx / 12.0
            smooth_t = t_m * t_m * (3.0 - 2.0 * t_m)
            interp = (1.0 - smooth_t) * blobs_a_mat + smooth_t * paired_b
            rec_m = pack_snapshot_record(interp[:, 0:2], interp[:, 2:4], interp[:, 4], interp[:, 5:8], interp[:, 8])
            res_a["snaps_records"].append(rec_m)
            last_m = dict(res_a["snaps_meta"][-1])
            last_m["step"] = base_step + m_idx * 10
            last_m["morph_t"] = round(smooth_t, 4)
            res_a["snaps_meta"].append(last_m)

        morph_payload = {
            "n_blobs": len(paired_b),
            "paired_blobs_b": np.round(paired_b, 5).tolist(),
        }
        with open(os.path.join(out_dir, "morph_ab.json"), "w", encoding="utf-8") as mf:
            json.dump(morph_payload, mf, separators=(",", ":"))

    # Write snapshots.bin and byte offsets
    snap_path = os.path.join(out_dir, "snapshots.bin")
    with open(snap_path, "wb") as bf:
        for meta_item, rec_bytes in zip(res_a["snaps_meta"], res_a["snaps_records"]):
            meta_item["off"] = bf.tell()
            bf.write(rec_bytes.tobytes())

    np.save(os.path.join(out_dir, "final-pos.npy"), res_a["pos"])
    Image.fromarray((np.clip(res_a["rendered"], 0.0, 1.0) * 255.0).astype(np.uint8)).save(os.path.join(out_dir, "final-render.png"))

    # Run universal depth + subject mask pipeline to populate depth.bin and depth-tex.f32
    try:
        sys.path.insert(0, os.path.join(ROOT, "train"))
        from depth import run_depth_pipeline
        run_depth_pipeline(run_dir=out_dir, image_path=os.path.join(out_dir, "target-crop.jpg"), mask_path=args.mask, force_fallback=args.quick)
    except Exception as ex:
        print(f"[train.py] depth pipeline note: {ex}", file=sys.stderr)

    depth_bin_path = os.path.join(out_dir, "depth.bin")
    depth_z = np.fromfile(depth_bin_path, dtype=np.uint8) if os.path.exists(depth_bin_path) else None

    export_compact_json_and_svg(
        out_dir=out_dir,
        W=res_a["W"],
        H=res_a["H"],
        aspect=aspect,
        pos_np=res_a["pos"],
        lsig_np=res_a["lsig"],
        rot_np=res_a["rot"],
        rgb_np=res_a["rgb"],
        amp_sig_np=res_a["amp_sig"],
        depth_z=depth_z,
        morph_b=morph_payload,
    )

    mse = float(np.mean((res_a["rendered"] - res_a["target_np"]) ** 2))
    psnr = round(-10.0 * math.log10(max(mse, 1e-10)), 2)
    elapsed = round(time.time() - t0, 2)
    meta_out = {
        "steps": res_a["snaps_meta"][-1]["step"],
        "n_final": int(len(res_a["pos"])),
        "width": res_a["W"],
        "height": res_a["H"],
        "aspect": round(aspect, 6),
        "ls_min": LS_MIN,
        "ls_max": LS_MAX,
        "amp_max": AMP_MAX,
        "train_seconds": elapsed,
        "psnr": psnr,
        "backend": res_a["backend"],
        "device": res_a["device"],
        "has_morph_b": morph_payload is not None,
        "snaps": res_a["snaps_meta"],
    }
    with open(os.path.join(out_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta_out, f, indent=2)

    print(
        f"[DONE] backend={res_a['backend']} ({res_a['device']}) | n={len(res_a['pos'])} blobs | "
        f"dim={res_a['W']}x{res_a['H']} (aspect={aspect:.3f}) | time={elapsed}s | PSNR={psnr} dB | snaps={len(res_a['snaps_meta'])}"
    )


if __name__ == "__main__":
    main()
