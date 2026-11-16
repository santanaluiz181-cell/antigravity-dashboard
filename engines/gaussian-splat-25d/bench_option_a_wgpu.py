import sys
import time
import numpy as np
import wgpu

W, H = 320, 256
N_BLOBS = 5000
STEPS = 100

WGSL_SHADER = """
struct Params {
    width: u32,
    height: u32,
    n_blobs: u32,
    step: u32,
    lr: f32,
    pad0: u32,
    pad1: u32,
    pad2: u32,
};

@group(0) @binding(0) var<uniform> params: Params;
// Blob parameters: 10 floats per blob: pos_x, pos_y, lsig_x, lsig_y, rot, col_r, col_g, col_b, amp, pad
@group(0) @binding(1) var<storage, read_write> blobs: array<f32>;
// Target image: W * H * 4 floats (R, G, B, pad)
@group(0) @binding(2) var<storage, read> target_img: array<f32>;
// Accumulator image buffer (atomic u32 bitcast to f32): W * H * 4 (acc_r, acc_g, acc_b, acc_w)
@group(0) @binding(3) var<storage, read_write> img_accum: array<atomic<u32>>;
// Pixel grad buffer: W * H * 4 floats (dL_dr, dL_dg, dL_db, dL_dw)
@group(0) @binding(4) var<storage, read_write> pix_grad: array<f32>;
// Blob grad buffer (atomic u32 bitcast to f32): N_BLOBS * 10
@group(0) @binding(5) var<storage, read_write> blob_grads: array<atomic<u32>>;
// Adam m and v buffers: N_BLOBS * 10 floats each
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
    let px = blobs[base + 0u] * f32(params.width);
    let py = blobs[base + 1u] * f32(params.height);
    let sx = clamp(exp(blobs[base + 2u]) * f32(params.width), 0.6, 48.0);
    let sy = clamp(exp(blobs[base + 3u]) * f32(params.height), 0.6, 48.0);
    let rot = blobs[base + 4u];
    let cr = sigmoid(blobs[base + 5u]);
    let cg = sigmoid(blobs[base + 6u]);
    let cb = sigmoid(blobs[base + 7u]);
    let amp = sigmoid(blobs[base + 8u]);

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
        let dy = f32(y) - py;
        for (var x = x0; x <= x1; x = x + 1) {
            let dx = f32(x) - px;
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

    let alpha = min(acc_w, 1.0);
    let denom = max(acc_w, 1e-6);
    let out_r = (acc_r / denom) * alpha + (1.0 - alpha);
    let out_g = (acc_g / denom) * alpha + (1.0 - alpha);
    let out_b = (acc_b / denom) * alpha + (1.0 - alpha);

    let inv_n = 1.0 / f32(n_pix * 3u);
    let dr = select(-inv_n, inv_n, out_r > target_img[idx + 0u]);
    let dg = select(-inv_n, inv_n, out_g > target_img[idx + 1u]);
    let db = select(-inv_n, inv_n, out_b > target_img[idx + 2u]);

    let scale = alpha / denom;
    pix_grad[idx + 0u] = dr * scale;
    pix_grad[idx + 1u] = dg * scale;
    pix_grad[idx + 2u] = db * scale;
    pix_grad[idx + 3u] = -(dr + dg + db) * select(0.0, 1.0, acc_w < 1.0);
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
    let sy = clamp(exp(blobs[base + 3u]) * H_f, 0.6, 48.0);
    let rot = blobs[base + 4u];
    let cr = sigmoid(blobs[base + 5u]);
    let cg = sigmoid(blobs[base + 6u]);
    let cb = sigmoid(blobs[base + 7u]);
    let amp = sigmoid(blobs[base + 8u]);

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
        let dy = f32(y) - py;
        for (var x = x0; x <= x1; x = x + 1) {
            let dx = f32(x) - px;
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
                g_amp += dL_dw * g_exp * amp * (1.0 - amp);

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
    let g = bitcast<f32>(atomicLoad(&blob_grads[idx]));
    let m = 0.9 * adam_m[idx] + 0.1 * g;
    let v = 0.999 * adam_v[idx] + 0.001 * g * g;
    adam_m[idx] = m;
    adam_v[idx] = v;
    let step_f = f32(params.step);
    let m_hat = m / (1.0 - pow(0.9, step_f));
    let v_hat = v / (1.0 - pow(0.999, step_f));
    blobs[idx] = blobs[idx] - params.lr * m_hat / (sqrt(v_hat) + 1e-8);
}
"""

def main():
    adapter = wgpu.gpu.request_adapter_sync(power_preference="high-performance")
    info = adapter.info
    print(f"[WGPU ADAPTER] device={info.get('device')} | backend={info.get('backend_type')} | adapter_type={info.get('adapter_type')} | vendor={info.get('vendor')}")
    if info.get("adapter_type") == "Cpu" or "rx 6600" not in str(info.get("device", "")).lower():
        print(f"[HARD ABORT] Non-RX6600 or CPU adapter selected: {info}", file=sys.stderr)
        sys.exit(2)

    device = adapter.request_device_sync()
    shader = device.create_shader_module(code=WGSL_SHADER)

    rng = np.random.default_rng(42)
    blobs_init = np.zeros((N_BLOBS, 10), dtype=np.float32)
    blobs_init[:, 0:2] = rng.uniform(0.05, 0.95, (N_BLOBS, 2))
    blobs_init[:, 2:4] = rng.uniform(-4.5, -3.2, (N_BLOBS, 2))
    blobs_init[:, 4] = rng.uniform(-np.pi, np.pi, N_BLOBS)
    blobs_init[:, 5:8] = rng.normal(0.0, 0.5, (N_BLOBS, 3))
    blobs_init[:, 8] = -1.5

    target_init = rng.uniform(0.1, 0.9, (H * W, 4)).astype(np.float32)
    zeros_pix = np.zeros(H * W * 4, dtype=np.uint32)
    zeros_grad = np.zeros(N_BLOBS * 10, dtype=np.float32)

    buf_params = device.create_buffer(size=32, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
    buf_blobs = device.create_buffer_with_data(data=blobs_init, usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
    buf_target = device.create_buffer_with_data(data=target_init, usage=wgpu.BufferUsage.STORAGE)
    buf_accum = device.create_buffer_with_data(data=zeros_pix, usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
    buf_pix_grad = device.create_buffer_with_data(data=zeros_pix.astype(np.float32), usage=wgpu.BufferUsage.STORAGE)
    buf_blob_grads = device.create_buffer_with_data(data=zeros_grad.view(np.uint32), usage=wgpu.BufferUsage.STORAGE | wgpu.BufferUsage.COPY_SRC)
    buf_m = device.create_buffer_with_data(data=zeros_grad, usage=wgpu.BufferUsage.STORAGE)
    buf_v = device.create_buffer_with_data(data=zeros_grad, usage=wgpu.BufferUsage.STORAGE)

    bind_layout = device.create_bind_group_layout(entries=[
        {"binding": 0, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.uniform}},
        {"binding": 1, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
        {"binding": 2, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.read_only_storage}},
        {"binding": 3, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
        {"binding": 4, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
        {"binding": 5, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
        {"binding": 6, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
        {"binding": 7, "visibility": wgpu.ShaderStage.COMPUTE, "buffer": {"type": wgpu.BufferBindingType.storage}},
    ])
    pipe_layout = device.create_pipeline_layout(bind_group_layouts=[bind_layout])
    bind_group = device.create_bind_group(layout=bind_layout, entries=[
        {"binding": 0, "resource": {"buffer": buf_params, "offset": 0, "size": 32}},
        {"binding": 1, "resource": {"buffer": buf_blobs, "offset": 0, "size": buf_blobs.size}},
        {"binding": 2, "resource": {"buffer": buf_target, "offset": 0, "size": buf_target.size}},
        {"binding": 3, "resource": {"buffer": buf_accum, "offset": 0, "size": buf_accum.size}},
        {"binding": 4, "resource": {"buffer": buf_pix_grad, "offset": 0, "size": buf_pix_grad.size}},
        {"binding": 5, "resource": {"buffer": buf_blob_grads, "offset": 0, "size": buf_blob_grads.size}},
        {"binding": 6, "resource": {"buffer": buf_m, "offset": 0, "size": buf_m.size}},
        {"binding": 7, "resource": {"buffer": buf_v, "offset": 0, "size": buf_v.size}},
    ])

    p_clear = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "clear_buffers"})
    p_fwd = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "forward_splat"})
    p_loss = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "pixel_loss_grad"})
    p_bwd = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "backward_splat"})
    p_adam = device.create_compute_pipeline(layout=pipe_layout, compute={"module": shader, "entry_point": "adam_step"})

    wg_clear = (max(W * H * 4, N_BLOBS * 10) + 255) // 256
    wg_blobs = (N_BLOBS + 63) // 64
    wg_pix = (W * H + 255) // 256
    wg_adam = (N_BLOBS * 10 + 255) // 256

    # Warmup 5 steps
    for s in range(1, 6):
        param_bytes = np.array([W, H, N_BLOBS, s], dtype=np.uint32).tobytes() + np.array([0.01, 0, 0, 0], dtype=np.float32).tobytes()
        device.queue.write_buffer(buf_params, 0, param_bytes)
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
    _ = device.queue.read_buffer(buf_blobs, size=64)

    # Timed 100 steps (Unbatched: 1 submit per step)
    t0 = time.perf_counter()
    for s in range(1, STEPS + 1):
        param_bytes = np.array([W, H, N_BLOBS, s], dtype=np.uint32).tobytes() + np.array([0.01, 0, 0, 0], dtype=np.float32).tobytes()
        device.queue.write_buffer(buf_params, 0, param_bytes)
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
    out_blobs = np.frombuffer(device.queue.read_buffer(buf_blobs), dtype=np.float32).reshape(N_BLOBS, 10)
    t1 = time.perf_counter()

    # Timed 100 steps (Batched Command Buffer: zero Python submit overhead per step)
    param_bytes = np.array([W, H, N_BLOBS, 50], dtype=np.uint32).tobytes() + np.array([0.01, 0, 0, 0], dtype=np.float32).tobytes()
    device.queue.write_buffer(buf_params, 0, param_bytes)
    t2 = time.perf_counter()
    enc = device.create_command_encoder()
    cp = enc.begin_compute_pass()
    cp.set_bind_group(0, bind_group)
    for _ in range(STEPS):
        cp.set_pipeline(p_clear); cp.dispatch_workgroups(wg_clear)
        cp.set_pipeline(p_fwd); cp.dispatch_workgroups(wg_blobs)
        cp.set_pipeline(p_loss); cp.dispatch_workgroups(wg_pix)
        cp.set_pipeline(p_bwd); cp.dispatch_workgroups(wg_blobs)
        cp.set_pipeline(p_adam); cp.dispatch_workgroups(wg_adam)
    cp.end()
    device.queue.submit([enc.finish()])
    out_blobs2 = np.frombuffer(device.queue.read_buffer(buf_blobs), dtype=np.float32).reshape(N_BLOBS, 10)
    t3 = time.perf_counter()

    total_ms = (t1 - t0) * 1000.0
    batched_ms = (t3 - t2) * 1000.0
    vram_bytes = sum(b.size for b in [buf_params, buf_blobs, buf_target, buf_accum, buf_pix_grad, buf_blob_grads, buf_m, buf_v])
    delta_l1 = float(np.mean(np.abs(out_blobs2 - blobs_init)))
    print(f"[WGPU BENCHMARK PASS] 100 steps @ 320x256 (5000 blobs) | unbatched={total_ms/STEPS:.3f} ms/step ({total_ms:.2f} ms) | batched_gpu={batched_ms/STEPS:.3f} ms/step ({batched_ms:.2f} ms) | buffer_VRAM={vram_bytes/1024/1024:.2f} MB | param_delta={delta_l1:.6f} | CPU_FALLBACK_OPS=0")

if __name__ == "__main__":
    main()
