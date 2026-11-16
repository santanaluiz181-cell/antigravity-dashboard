import React, { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface GaussianBlobEntry {
  x: number;
  y: number;
  lsigX: number;
  lsigY: number;
  rot: number;
  r: number;
  g: number;
  b: number;
  ampSig: number;
  depthZ: number;
}

export interface CompactBlobsJSON {
  schema: string;
  width: number;
  height: number;
  aspect: number;
  n_blobs: number;
  ls_min: number;
  ls_max: number;
  amp_max: number;
  blobs: number[][];
  morph_target?: {
    n_blobs: number;
    paired_blobs_b: number[][];
  };
}

export interface GaussianSplat25DProps {
  /** URL to compact blobs.json exported by train_v2/train.py */
  blobsJsonUrl?: string;
  /** Or inline parsed blobs.json payload */
  blobsData?: CompactBlobsJSON;
  /** Optional URL to snapshots.bin for multi-step training replay */
  snapshotsBinUrl?: string;
  /** Optional URL to meta.json accompanying snapshots.bin */
  metaJsonUrl?: string;
  /** Optional URL to depth.bin (uint8 per-blob depth) */
  depthBinUrl?: string;
  /** Text rendered in the Z-Sandwich behind the foreground Gaussian subject */
  headline?: string;
  subtext?: string;
  accentColor?: string;
  /** Depth threshold [0..1] separating background splats from foreground subject splats */
  subjectDepthThreshold?: number;
  /** Maximum 2.5D camera yaw orbit in radians */
  maxYawRad?: number;
  /** Maximum 2.5D camera pitch in radians */
  maxPitchRad?: number;
  /** Enable A -> B blob morphing in second half of timeline when morph_target exists */
  enableMorphAB?: boolean;
}

const VERTEX_SHADER_25D = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQuad;
layout(location=1) in vec2 aPosA;
layout(location=2) in vec2 aLsigA;
layout(location=3) in float aRotA;
layout(location=4) in vec3 aColA;
layout(location=5) in float aAmpA;
layout(location=6) in float aDepthZ;
layout(location=7) in vec2 aPosB;
layout(location=8) in vec2 aLsigB;
layout(location=9) in float aRotB;
layout(location=10) in vec3 aColB;
layout(location=11) in float aAmpB;

uniform float uReveal;
uniform float uMorph;
uniform float uYaw;
uniform float uPitch;
uniform float uAspect;
uniform float uAmpMax;
uniform float uPassMode; // 0.0 = background only, 1.0 = foreground subject only, 2.0 = all
uniform float uDepthThreshold;

out vec2 vQuad;
out vec3 vCol;
out float vWeight;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

void main() {
  bool isFg = aDepthZ >= uDepthThreshold;
  if (uPassMode < 0.5 && isFg) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  if (uPassMode > 0.5 && uPassMode < 1.5 && !isFg) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  float id = float(gl_InstanceID);
  vec2 randOrigin = vec2(hash11(id * 1.17 + 0.1), hash11(id * 2.31 + 0.7));
  vec2 targetPos = mix(aPosA, aPosB, uMorph);
  vec2 pos = mix(randOrigin, targetPos, uReveal);

  vec2 lsig = mix(aLsigA, aLsigB, uMorph);
  float scatterScale = mix(2.6, 1.0, uReveal);
  vec2 sigma = exp(lsig) * scatterScale;

  float dRot = aRotB - aRotA;
  if (dRot > 1.5707963) dRot -= 3.14159265;
  if (dRot < -1.5707963) dRot += 3.14159265;
  float rot = aRotA + dRot * uMorph;
  float c = cos(rot);
  float s = sin(rot);

  // 2.5D depth parallax displacement (strictly universal — no facial warps)
  float zCentered = (aDepthZ - 0.5) * 0.42;
  float cy = cos(uYaw), sy = sin(uYaw);
  float cp = cos(uPitch), sp = sin(uPitch);
  vec3 worldPt = vec3((pos.x - 0.5) * uAspect, 0.5 - pos.y, zCentered);
  vec3 rotY = vec3(worldPt.x * cy + worldPt.z * sy, worldPt.y, -worldPt.x * sy + worldPt.z * cy);
  vec3 rotYP = vec3(rotY.x, rotY.y * cp - rotY.z * sp, rotY.y * sp + rotY.z * cp);
  float persp = 2.8 / max(2.8 - rotYP.z, 0.5);

  vec2 centerUV = vec2(rotYP.x / max(uAspect, 0.1) * persp + 0.5, 0.5 - rotYP.y * persp);
  vec2 offset = 3.0 * (aQuad.x * vec2(c, s) * sigma.x + aQuad.y * vec2(-s, c) * sigma.y) * vec2(1.0, uAspect) * persp;
  vec2 finalUV = centerUV + offset;

  gl_Position = vec4(finalUV.x * 2.0 - 1.0, 1.0 - finalUV.y * 2.0, 0.0, 1.0);
  vQuad = aQuad;
  vCol = mix(aColA, aColB, uMorph);
  vWeight = uAmpMax * mix(aAmpA, aAmpB, uMorph) * smoothstep(0.0, 0.15, uReveal);
}
`;

const FRAGMENT_SHADER_25D = `#version 300 es
precision highp float;
in vec2 vQuad;
in vec3 vCol;
in float vWeight;
out vec4 fragColor;

void main() {
  float r2 = dot(vQuad, vQuad);
  if (r2 > 1.0) discard;
  float w = vWeight * exp(-4.5 * r2);
  float alpha = clamp(1.0 - exp(-w), 0.0, 1.0);
  fragColor = vec4(vCol * alpha, alpha);
}
`;

function compileProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || 'WebGL2 shader compile failed');
    }
    return sh;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'WebGL2 program link failed');
  }
  return prog;
}

/**
 * Decode 12-byte packed snapshot record from snapshots.bin into float32 instance attributes [N * 17].
 */
export function decodeSnapshotRecordToInstanceBuffer(
  recBytes: Uint8Array,
  nBlobs: number,
  lsMin: number,
  lsMax: number,
  depthBytes?: Uint8Array | null
): Float32Array {
  const out = new Float32Array(nBlobs * 17);
  const dv = new DataView(recBytes.buffer, recBytes.byteOffset, recBytes.byteLength);
  for (let i = 0; i < nBlobs; i++) {
    const off = i * 12;
    const px = (dv.getUint16(off + 0, true) / 65535.0) * 1.5 - 0.25;
    const py = (dv.getUint16(off + 2, true) / 65535.0) * 1.5 - 0.25;
    const lsx = (recBytes[off + 4] / 255.0) * (lsMax - lsMin) + lsMin;
    const lsy = (recBytes[off + 5] / 255.0) * (lsMax - lsMin) + lsMin;
    const rot = (recBytes[off + 6] / 255.0) * Math.PI;
    const r = recBytes[off + 7] / 255.0;
    const g = recBytes[off + 8] / 255.0;
    const b = recBytes[off + 9] / 255.0;
    const amp = recBytes[off + 10] / 255.0;
    const dz = depthBytes && i < depthBytes.length ? depthBytes[i] / 255.0 : 0.65;

    const dst = i * 17;
    out[dst + 0] = px;
    out[dst + 1] = py;
    out[dst + 2] = lsx;
    out[dst + 3] = lsy;
    out[dst + 4] = rot;
    out[dst + 5] = r;
    out[dst + 6] = g;
    out[dst + 7] = b;
    out[dst + 8] = amp;
    out[dst + 9] = dz;
    // Default B target = A
    out[dst + 10] = px;
    out[dst + 11] = py;
    out[dst + 12] = lsx;
    out[dst + 13] = lsy;
    out[dst + 14] = rot;
    out[dst + 15] = r;
    out[dst + 16] = g;
  }
  return out;
}

/**
 * Pack CompactBlobsJSON into interleaved Float32Array [N * 19] for WebGL2 instanced rendering.
 */
export function buildInstanceBufferFromJSON(data: CompactBlobsJSON): Float32Array {
  const n = data.blobs.length;
  const pairedB = data.morph_target?.paired_blobs_b;
  const out = new Float32Array(n * 19);
  for (let i = 0; i < n; i++) {
    const a = data.blobs[i];
    const b = pairedB && i < pairedB.length ? pairedB[i] : a;
    const base = i * 19;
    // A attributes (pos, lsig, rot, rgb, amp, depthZ)
    out[base + 0] = a[0];
    out[base + 1] = a[1];
    out[base + 2] = a[2];
    out[base + 3] = a[3];
    out[base + 4] = a[4];
    out[base + 5] = a[5] > 1.0 ? a[5] / 255.0 : a[5];
    out[base + 6] = a[6] > 1.0 ? a[6] / 255.0 : a[6];
    out[base + 7] = a[7] > 1.0 ? a[7] / 255.0 : a[7];
    out[base + 8] = a[8];
    out[base + 9] = a[9] ?? 0.65;
    // B attributes for A -> B morphing
    out[base + 10] = b[0];
    out[base + 11] = b[1];
    out[base + 12] = b[2];
    out[base + 13] = b[3];
    out[base + 14] = b[4];
    out[base + 15] = b[5] > 1.0 ? b[5] / 255.0 : b[5];
    out[base + 16] = b[6] > 1.0 ? b[6] / 255.0 : b[6];
    out[base + 17] = b[7] > 1.0 ? b[7] / 255.0 : b[7];
    out[base + 18] = b[8];
  }
  return out;
}

/**
 * SuperRender v7.0 — 60fps WebGL2 2.5D Gaussian Splat Reveal + Text-Behind-Subject Z-Sandwich
 */
export const GaussianSplat25DScene: React.FC<GaussianSplat25DProps> = ({
  blobsJsonUrl,
  blobsData,
  headline = 'GAUSSIAN 2.5D',
  subtext = 'WEBGL2 INSTANCED SPLATTING • DEPTH PARALLAX',
  accentColor = '#F59E0B',
  subjectDepthThreshold = 0.25,
  maxYawRad = 0.36,
  maxPitchRad = 0.08,
  enableMorphAB = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedData, setLoadedData] = useState<CompactBlobsJSON | null>(blobsData || null);
  const [handle] = useState(() => (blobsData ? null : delayRender('Loading Gaussian Splat JSON')));

  useEffect(() => {
    if (blobsData) {
      setLoadedData(blobsData);
      return;
    }
    if (!blobsJsonUrl) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let cancelled = false;
    fetch(blobsJsonUrl)
      .then((r) => r.json())
      .then((json: CompactBlobsJSON) => {
        if (!cancelled) {
          setLoadedData(json);
          if (handle !== null) continueRender(handle);
        }
      })
      .catch((err) => {
        console.error('[GaussianSplat25DScene] Failed to fetch blobsJsonUrl:', err);
        if (handle !== null) continueRender(handle);
      });
    return () => {
      cancelled = true;
    };
  }, [blobsJsonUrl, blobsData, handle]);

  // Animation drivers at 60fps
  const reveal = spring({
    frame,
    fps,
    config: { stiffness: 65, damping: 16, mass: 0.9 },
  });

  const normTime = frame / Math.max(durationInFrames, 1);
  const orbitPhase = interpolate(normTime, [0.2, 0.85], [0, Math.PI * 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const yaw = Math.sin(orbitPhase) * maxYawRad * reveal;
  const pitch = Math.cos(orbitPhase * 0.5) * maxPitchRad * reveal;

  const hasMorph = Boolean(loadedData?.morph_target && enableMorphAB);
  const morph = hasMorph
    ? interpolate(normTime, [0.55, 0.88], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  useEffect(() => {
    if (!loadedData) return;
    const instanceBufData = buildInstanceBufferFromJSON(loadedData);
    const nBlobs = loadedData.blobs.length;
    const aspect = loadedData.aspect || width / Math.max(height, 1);
    const ampMax = loadedData.amp_max || 3.0;

    const renderPass = (canvas: HTMLCanvasElement | null, passMode: number) => {
      if (!canvas) return;
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
      if (!gl) return;

      const prog = compileProgram(gl, VERTEX_SHADER_25D, FRAGMENT_SHADER_25D);
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);

      const quadBuf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const instBuf = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, instanceBufData, gl.DYNAMIC_DRAW);

      const stride = 19 * 4;
      const bindAttr = (loc: number, size: number, offsetFloats: number) => {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offsetFloats * 4);
        gl.vertexAttribDivisor(loc, 1);
      };
      bindAttr(1, 2, 0);  // aPosA
      bindAttr(2, 2, 2);  // aLsigA
      bindAttr(3, 1, 4);  // aRotA
      bindAttr(4, 3, 5);  // aColA
      bindAttr(5, 1, 8);  // aAmpA
      bindAttr(6, 1, 9);  // aDepthZ
      bindAttr(7, 2, 10); // aPosB
      bindAttr(8, 2, 12); // aLsigB
      bindAttr(9, 1, 14); // aRotB
      bindAttr(10, 3, 15);// aColB
      bindAttr(11, 1, 18);// aAmpB

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'uReveal'), reveal);
      gl.uniform1f(gl.getUniformLocation(prog, 'uMorph'), morph);
      gl.uniform1f(gl.getUniformLocation(prog, 'uYaw'), yaw);
      gl.uniform1f(gl.getUniformLocation(prog, 'uPitch'), pitch);
      gl.uniform1f(gl.getUniformLocation(prog, 'uAspect'), aspect);
      gl.uniform1f(gl.getUniformLocation(prog, 'uAmpMax'), ampMax);
      gl.uniform1f(gl.getUniformLocation(prog, 'uPassMode'), passMode);
      gl.uniform1f(gl.getUniformLocation(prog, 'uDepthThreshold'), subjectDepthThreshold);

      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nBlobs);

      gl.deleteBuffer(quadBuf);
      gl.deleteBuffer(instBuf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };

    renderPass(bgCanvasRef.current, 0.0);
    renderPass(fgCanvasRef.current, 1.0);
  }, [loadedData, frame, reveal, morph, yaw, pitch, width, height, subjectDepthThreshold]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0D10', overflow: 'hidden' }}>
      {/* Z=5: Background Gaussian Blobs (depth_z < subjectDepthThreshold) */}
      <AbsoluteFill style={{ zIndex: 5 }}>
        <canvas ref={bgCanvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      </AbsoluteFill>

      {/* Z=15: Text-Behind-Subject Layer (Occluded by Foreground Gaussian Subject) */}
      <AbsoluteFill
        style={{
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          transform: `translate3d(${-yaw * 140}px, ${pitch * 90 + (1 - reveal) * 40}px, 0)`,
          opacity: interpolate(reveal, [0.25, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            fontFamily: 'Google Sans, Inter, system-ui, sans-serif',
            fontWeight: 900,
            fontSize: Math.round(width * 0.115),
            lineHeight: 0.9,
            letterSpacing: '-0.04em',
            color: accentColor,
            textTransform: 'uppercase',
            textAlign: 'center',
            textShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          }}
        >
          {headline}
        </div>
        {subtext ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: 'JetBrains Mono, IBM Plex Mono, monospace',
              fontSize: Math.round(width * 0.016),
              letterSpacing: '0.24em',
              color: '#E2E8F0',
              textTransform: 'uppercase',
            }}
          >
            {subtext}
          </div>
        ) : null}
      </AbsoluteFill>

      {/* Z=25: Foreground Subject Gaussian Blobs (depth_z >= subjectDepthThreshold) */}
      <AbsoluteFill style={{ zIndex: 25, pointerEvents: 'none' }}>
        <canvas ref={fgCanvasRef} width={width} height={height} style={{ width: '100%', height: '100%' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default GaussianSplat25DScene;
