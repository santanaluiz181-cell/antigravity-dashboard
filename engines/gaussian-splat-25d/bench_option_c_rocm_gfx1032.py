import sys
import time
import torch
from torch.utils._python_dispatch import TorchDispatchMode

W, H = 320, 256
N_BLOBS = 5000
STEPS = 100

class StrictROCmDispatchAuditor(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.ops_logged = []

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        op_name = str(func)
        tensor_devs = set()
        def collect_devs(x):
            if isinstance(x, torch.Tensor):
                tensor_devs.add(str(x.device))
            elif isinstance(x, (list, tuple)):
                for item in x:
                    collect_devs(item)
        collect_devs(args)
        collect_devs(kwargs)

        out = func(*args, **kwargs)
        out_devs = set()
        if isinstance(out, torch.Tensor):
            out_devs.add(str(out.device))
        elif isinstance(out, (list, tuple)):
            for item in out:
                if isinstance(item, torch.Tensor):
                    out_devs.add(str(item.device))

        if any("cpu" in d for d in tensor_devs) or any("cpu" in d for d in out_devs):
            print(f"[HARD ABORT] CPU fallback detected in op {op_name} | in={tensor_devs} | out={out_devs}", file=sys.stderr)
            sys.exit(4)

        if "index_add" in op_name or "index" in op_name:
            self.ops_logged.append((op_name, sorted(tensor_devs), sorted(out_devs)))
        return out

def main():
    if not torch.cuda.is_available():
        print("[HARD ABORT] ROCm/HIP device not available", file=sys.stderr)
        sys.exit(2)
    dev = torch.device("cuda:0")
    print(f"[ROCM GFX1032 DEVICE] torch={torch.__version__} | device={dev} | name={torch.cuda.get_device_name(0)}")

    torch.manual_seed(42)
    pos = torch.rand((N_BLOBS, 2), device=dev, dtype=torch.float32, requires_grad=True)
    lsig = (torch.rand((N_BLOBS, 2), device=dev, dtype=torch.float32) * -1.3 - 3.2).detach().requires_grad_(True)
    rot = ((torch.rand(N_BLOBS, device=dev, dtype=torch.float32) - 0.5) * 3.14159).detach().requires_grad_(True)
    col = torch.randn((N_BLOBS, 3), device=dev, dtype=torch.float32, requires_grad=True)
    amp = torch.full((N_BLOBS,), -1.5, device=dev, dtype=torch.float32, requires_grad=True)
    target = torch.rand((H * W, 3), device=dev, dtype=torch.float32)

    K = 25
    pix_idx = torch.randint(0, H * W, (N_BLOBS * K,), device=dev, dtype=torch.int64)
    blob_idx = torch.arange(N_BLOBS, device=dev, dtype=torch.int64).repeat_interleave(K)
    dx = torch.randn(N_BLOBS * K, device=dev, dtype=torch.float32) * 2.0
    dy = torch.randn(N_BLOBS * K, device=dev, dtype=torch.float32) * 2.0

    opt = torch.optim.Adam([pos, lsig, rot, col, amp], lr=1e-2, capturable=True)

    def step_fn():
        opt.zero_grad(set_to_none=True)
        sx = torch.exp(lsig[blob_idx, 0]) * float(W)
        sy = torch.exp(lsig[blob_idx, 1]) * float(H)
        th = rot[blob_idx]
        c, s = torch.cos(th), torch.sin(th)
        A = (c * c) / (sx * sx) + (s * s) / (sy * sy)
        B = c * s * (1.0 / (sx * sx) - 1.0 / (sy * sy))
        C = (s * s) / (sx * sx) + (c * c) / (sy * sy)
        ddx = dx - pos[blob_idx, 0]
        ddy = dy - pos[blob_idx, 1]
        q = A * ddx * ddx + 2.0 * B * ddx * ddy + C * ddy * ddy
        w = torch.sigmoid(amp[blob_idx]) * torch.exp(-0.5 * q)
        rgb = torch.sigmoid(col[blob_idx]) * w.unsqueeze(1)

        canvas_rgb = torch.zeros((H * W, 3), device=dev, dtype=torch.float32)
        canvas_w = torch.zeros((H * W,), device=dev, dtype=torch.float32)
        canvas_rgb.index_add_(0, pix_idx, rgb)
        canvas_w.index_add_(0, pix_idx, w)

        alpha = torch.clamp(canvas_w, max=1.0).unsqueeze(1)
        out = (canvas_rgb / torch.clamp(canvas_w.unsqueeze(1), min=1e-6)) * alpha + (1.0 - alpha)
        loss = torch.mean(torch.abs(out - target))
        loss.backward()
        opt.step()
        return loss

    # Warmup + Strict Audit
    for _ in range(5):
        step_fn()
    torch.cuda.synchronize()

    with StrictROCmDispatchAuditor() as auditor:
        loss0 = step_fn()
    torch.cuda.synchronize()
    print(f"[ROCM DISPATCH AUDIT PASS] CPU_FALLBACK_OPS=0 | index_ops={auditor.ops_logged}")

    torch.cuda.reset_peak_memory_stats()
    t0 = time.perf_counter()
    for _ in range(STEPS):
        loss = step_fn()
    torch.cuda.synchronize()
    t1 = time.perf_counter()

    total_ms = (t1 - t0) * 1000.0
    peak_vram_mb = torch.cuda.max_memory_allocated() / (1024 * 1024)
    reserved_vram_mb = torch.cuda.max_memory_reserved() / (1024 * 1024)
    print(f"[ROCM BENCHMARK PASS] 100 steps @ 320x256 (5000 blobs) | total={total_ms:.2f} ms | ms/step={total_ms/STEPS:.3f} ms | allocated_VRAM={peak_vram_mb:.2f} MB | reserved_VRAM={reserved_vram_mb:.2f} MB | CPU_FALLBACK_OPS=0")

if __name__ == "__main__":
    main()
