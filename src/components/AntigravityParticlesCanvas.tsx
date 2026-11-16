import React, { useEffect, useRef } from 'react';

interface ParticlePoint {
  refX: number;
  refY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  seed1: number;
  seed2: number;
  seed3: number;
}

interface AntigravityParticlesCanvasProps {
  theme?: 'dark' | 'light';
  className?: string;
  density?: number;
}

/**
 * Exact Canvas/2D + Simplex-Wave port of https://antigravity.google/_astro/MainParticlesComponent.Cr9vcqqS.js
 * - Capsule particles (`sdRoundBox(uv, vec2(0.5, 0.2), vec4(0.25))`)
 * - Rotates each capsule along `atan2(y - ringPos.y, x - ringPos.x)` + wave noise
 * - 2% frame lerp on the gravitational cursor ring (`ringPos += (cursorPos - ringPos) * 0.02`)
 * - Official palette: Dark (`#7189ff`, `#3074f9`, `#18191d`) | Light (`#2c64ed`, `#f84242`, `#ffcf03`)
 */
export const AntigravityParticlesCanvas: React.FC<AntigravityParticlesCanvasProps> = ({
  theme = 'dark',
  className = '',
  density = 190,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = canvas.parentElement?.clientWidth || 1200;
    let height = canvas.parentElement?.clientHeight || 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();

    // Generate Poisson-like jittered grid matching MainParticlesComponent
    const points: ParticlePoint[] = [];
    const cols = Math.round(Math.sqrt(density * (width / Math.max(1, height))) * 1.9);
    const rows = Math.max(8, Math.round(cols * (height / Math.max(1, width))));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jx = (Math.random() - 0.5) * 0.75;
        const jy = (Math.random() - 0.5) * 0.75;
        const nx = ((c + 0.5 + jx) / cols) * 2 - 1;
        const ny = ((r + 0.5 + jy) / rows) * 2 - 1;
        points.push({
          refX: nx,
          refY: ny,
          x: nx,
          y: ny,
          vx: 0,
          vy: 0,
          scale: 0.18,
          seed1: Math.random() * 10,
          seed2: Math.random() * 10,
          seed3: Math.random(),
        });
      }
    }

    // Cursor & Ring state (normalized -1..1 space)
    const cursor = { x: 0, y: 0, active: false };
    const ringPos = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (nx >= -1.05 && nx <= 1.05 && ny >= -1.05 && ny <= 1.05) {
        cursor.x = nx;
        cursor.y = ny;
        cursor.active = true;
      } else {
        cursor.active = false;
      }
    };

    const onPointerLeave = () => {
      cursor.active = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

    let rafId = 0;
    const startTime = performance.now();

    const smoothstep = (edge0: number, edge1: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;
      const time = elapsed * 0.5;

      // Ambient drift when cursor is idle (matches MainParticlesComponent lines 72)
      const driftX = Math.sin(elapsed * 0.66 + 1.4) * 0.22;
      const driftY = Math.cos(elapsed * 0.75 + 0.8) * 0.14;
      const targetX = cursor.active ? cursor.x + driftX * 0.18 : driftX;
      const targetY = cursor.active ? cursor.y + driftY * 0.18 : driftY;

      // 2% lerp when active, 1% when idle (exact MainParticlesComponent constants)
      const lerpFactor = cursor.active ? 0.045 : 0.015;
      ringPos.x += (targetX - ringPos.x) * lerpFactor;
      ringPos.y += (targetY - ringPos.y) * lerpFactor;

      const uRingRadius = 0.28 + Math.sin(elapsed * 1.0) * 0.035 + Math.cos(elapsed * 3.0) * 0.02;
      const uRingWidth = 0.11;
      const uRingWidth2 = 0.055;
      const uRingDisplacement = 0.17;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const aspect = width / Math.max(1, height);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.vx *= 0.8;
        p.vy *= 0.8;

        // Aspect-corrected distance to ring center
        const dx = (p.refX - ringPos.x) * (aspect > 1 ? 1 : aspect);
        const dy = (p.refY - ringPos.y) / (aspect > 1 ? aspect * 0.55 : 1);
        const dist = Math.sqrt(dx * dx + dy * dy);

        const noise0 = Math.sin(p.refX * 3.5 + time) * Math.cos(p.refY * 3.5 - time) * 0.015;
        const dist1 = dist + noise0;

        let t =
          smoothstep(uRingRadius - uRingWidth * 2.0, uRingRadius, dist) -
          smoothstep(uRingRadius, uRingRadius + uRingWidth, dist1);
        let t2 =
          smoothstep(uRingRadius - uRingWidth2 * 2.0, uRingRadius, dist) -
          smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
        const t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

        t = t * t;
        t2 = t2 * t2 * t2;
        t += t2 * 2.8 + t3 * 0.35;

        // Ambient wave displacement (exact sin/cos from shader lines 77-78)
        const dispX =
          Math.sin(p.refX * 14.0 + time * 4.0 + p.seed1) * 0.014 * Math.min(1, dist);
        const dispY =
          Math.cos(p.refY * 14.0 + time * 3.0 + p.seed2) * 0.014 * Math.min(1, dist);

        const pushFactor = Math.pow(Math.max(0, t2), 0.75) * uRingDisplacement;
        p.vx -= (ringPos.x - (p.refX + dispX)) * pushFactor;
        p.vy -= (ringPos.y - (p.refY + dispY)) * pushFactor;

        const targetScale = 0.22 + t * 0.88;
        p.scale += (targetScale - p.scale) * 0.2;

        const finalX = p.refX + dispX + p.vx * 0.28;
        const finalY = p.refY + dispY + p.vy * 0.28;

        const screenX = (finalX * 0.5 + 0.5) * width;
        const screenY = (finalY * 0.5 + 0.5) * height;

        // Capsule orientation: points radially toward/away from ringPos + subtle wave angle
        const angle =
          Math.atan2(finalY - ringPos.y, finalX - ringPos.x) +
          Math.sin(finalX * 6 + time * 1.7) * 0.22;

        const pillW = Math.max(3.5, Math.min(16, p.scale * 11.5));
        const pillH = Math.max(1.8, pillW * 0.42);
        const alpha = Math.min(0.92, Math.max(0.14, p.scale * 0.78));

        // Color interpolation matching MainParticlesComponent colorControls
        let fillHex = '#7189ff';
        if (theme === 'dark') {
          if (t2 > 0.22) fillHex = '#8ab4f8';
          else if (p.seed3 > 0.45) fillHex = '#3279f9';
          else fillHex = '#7189ff';
        } else {
          if (t2 > 0.25 && p.seed3 > 0.6) fillHex = '#f84242';
          else if (t2 > 0.15 && p.seed3 < 0.3) fillHex = '#ffcf03';
          else fillHex = '#2c64ed';
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(angle);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fillHex;
        ctx.beginPath();
        ctx.roundRect(-pillW * 0.5, -pillH * 0.5, pillW, pillH, pillH * 0.5);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [theme, density]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};
