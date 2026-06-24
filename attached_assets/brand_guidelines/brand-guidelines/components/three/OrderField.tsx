"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ============================================================= *
 *  ORDER FIELD — the LexOps signature scene.
 *
 *  A cloud of scattered particles (work as it actually arrives:
 *  fragmented, manual, all over the place) resolves left-to-right
 *  into a structured register of rows — the system LexOps builds.
 *  Once formed, a soft pulse sweeps the grid: the automation
 *  running through it.
 *
 *  Modes
 *   - "external": order driven by `progressRef` (0–1), e.g. scroll
 *   - "auto":     orders itself once in view, then breathes
 *   - "ambient":  hovers half-formed forever (background texture)
 * ============================================================= */

export type OrderFieldMode = "external" | "auto" | "ambient";

type Props = {
  className?: string;
  mode?: OrderFieldMode;
  /** 0–1 order driver, read every frame when mode="external" */
  progressRef?: React.RefObject<number>;
  /** structured particles — defaults to 328, one per intake field */
  fieldCount?: number;
  /** loose particles that never settle */
  ambientCount?: number;
  rows?: number;
  /** overall brightness multiplier */
  opacity?: number;
  /** draw the faint row lanes once the grid forms */
  lanes?: boolean;
  /** vertical shift of the formed grid, world units */
  yOffset?: number;
};

const VERT = /* glsl */ `
  attribute vec3 aScatter;
  attribute vec3 aTarget;
  attribute float aSeed;
  attribute float aDelay;
  attribute float aCol;
  attribute float aKind; // 0 = field particle, 1 = ambient drifter

  uniform float uTime;
  uniform float uOrder;
  uniform float uSize;
  uniform float uPixelRatio;

  varying float vOrder;
  varying float vSeed;
  varying float vCol;
  varying float vKind;

  vec3 drift(vec3 p, float t, float s) {
    return vec3(
      sin(t * 0.30 + s * 17.0 + p.y * 0.85),
      cos(t * 0.26 + s * 23.0 + p.x * 0.65),
      sin(t * 0.22 + s * 31.0)
    );
  }

  void main() {
    float o = clamp(uOrder * 1.8 - aDelay, 0.0, 1.0);
    o = o * o * (3.0 - 2.0 * o);
    o *= (1.0 - aKind); // drifters never settle

    vec3 chaotic = aScatter + drift(aScatter, uTime, aSeed) * mix(0.6, 0.25, aKind);
    vec3 ordered = aTarget;
    ordered.y += sin(uTime * 0.6 + aSeed * 40.0) * 0.03;
    vec3 pos = mix(chaotic, ordered, o);

    vOrder = o;
    vSeed = aSeed;
    vCol = aCol;
    vKind = aKind;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uSize * (0.55 + 0.45 * aSeed) * (1.0 + o * 0.15) * mix(1.0, 0.7, aKind);
    gl_PointSize = size * uPixelRatio * (130.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColorChaos;
  uniform vec3 uColorOrder;
  uniform vec3 uColorAccent;

  varying float vOrder;
  varying float vSeed;
  varying float vCol;
  varying float vKind;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float disc = smoothstep(0.5, 0.08, d);

    vec3 col = mix(uColorChaos, uColorOrder, vOrder);
    col = mix(col, uColorAccent, vSeed * 0.35 * (1.0 - vOrder));

    // once a particle has settled, a pulse sweeps the grid column by column
    float sweep = fract(uTime * 0.16);
    float pulse = exp(-pow((vCol - sweep) * 9.0, 2.0));
    col += uColorOrder * pulse * vOrder * 0.45;

    float base = mix(0.30, 0.62, vOrder);
    base *= mix(1.0, 0.4, vKind);
    gl_FragColor = vec4(col, disc * base * uOpacity);
  }
`;

export default function OrderField({
  className = "",
  mode = "auto",
  progressRef,
  fieldCount = 328,
  ambientCount = 700,
  rows = 8,
  opacity = 1,
  lanes = true,
  yOffset = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    } catch {
      return; // no WebGL — the section gradient stands on its own
    }
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
    const group = new THREE.Group();
    scene.add(group);

    /* ---------- geometry ---------- */
    const GRID_W = 12;
    const GRID_H = 3.4;
    const cols = Math.ceil(fieldCount / rows);
    const total = fieldCount + ambientCount;

    const scatter = new Float32Array(total * 3);
    const target = new Float32Array(total * 3);
    const seed = new Float32Array(total);
    const delay = new Float32Array(total);
    const colN = new Float32Array(total);
    const kind = new Float32Array(total);
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    for (let i = 0; i < total; i++) {
      const isField = i < fieldCount;
      scatter[i * 3] = rand(-10.5, 10.5);
      scatter[i * 3 + 1] = rand(-5.5, 5.5);
      scatter[i * 3 + 2] = rand(-3.5, 1.5);

      if (isField) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cn = cols > 1 ? c / (cols - 1) : 0;
        target[i * 3] = -GRID_W / 2 + cn * GRID_W;
        target[i * 3 + 1] = GRID_H / 2 - (r / Math.max(1, rows - 1)) * GRID_H + yOffset;
        target[i * 3 + 2] = 0;
        colN[i] = cn;
        // left-to-right settle, like fields filling in
        delay[i] = cn * 0.55 + Math.random() * 0.25;
      } else {
        target[i * 3] = scatter[i * 3];
        target[i * 3 + 1] = scatter[i * 3 + 1];
        target[i * 3 + 2] = scatter[i * 3 + 2];
        colN[i] = Math.random();
        delay[i] = 0.8;
        kind[i] = 1;
      }
      seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(scatter.slice(), 3));
    geo.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    geo.setAttribute("aCol", new THREE.BufferAttribute(colN, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));

    const uniforms = {
      uTime: { value: 0 },
      uOrder: { value: mode === "external" ? (progressRef?.current ?? 0) : 0 },
      uSize: { value: 2.1 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uColorChaos: { value: new THREE.Color("#9DB5C9") },
      uColorOrder: { value: new THREE.Color("#E4F1F8") },
      uColorAccent: { value: new THREE.Color("#375971") },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(geo, mat));

    /* ---------- row lanes, fading in as the register forms ---------- */
    let laneMat: THREE.LineBasicMaterial | null = null;
    let laneGeo: THREE.BufferGeometry | null = null;
    if (lanes) {
      const pts: number[] = [];
      for (let r = 0; r < rows; r++) {
        const y = GRID_H / 2 - (r / Math.max(1, rows - 1)) * GRID_H + yOffset;
        pts.push(-GRID_W / 2 - 0.4, y, -0.02, GRID_W / 2 + 0.4, y, -0.02);
      }
      laneGeo = new THREE.BufferGeometry();
      laneGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
      laneMat = new THREE.LineBasicMaterial({ color: new THREE.Color("#9DB5C9"), transparent: true, opacity: 0 });
      group.add(new THREE.LineSegments(laneGeo, laneMat));
    }

    /* ---------- sizing ---------- */
    const fit = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uPixelRatio.value = dpr;
      camera.aspect = w / h;
      // pull the camera back until the grid width fits the viewport
      const halfFov = (camera.fov * Math.PI) / 360;
      const needed = (GRID_W / 2 + 1.2) / (Math.tan(halfFov) * camera.aspect);
      camera.position.z = Math.max(8.5, needed);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);

    /* ---------- pointer parallax ---------- */
    let tx = 0, ty = 0;
    const onPointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    /* ---------- order driver ---------- */
    let visibleAt: number | null = null;
    const orderAt = (t: number) => {
      if (mode === "external") return Math.min(1, Math.max(0, progressRef?.current ?? 0));
      if (mode === "ambient") return 0.48 + 0.22 * Math.sin(t * 0.1);
      // auto: settle over ~5s once seen, then breathe
      if (visibleAt === null) return 0;
      const p = Math.min(1, (t - visibleAt) / 5);
      const eased = 1 - Math.pow(1 - p, 3);
      return p >= 1 ? 0.96 + 0.04 * Math.sin(t * 0.3) : eased;
    };

    /* ---------- loop, paused offscreen ---------- */
    let raf = 0;
    let running = false;
    const clock = new THREE.Clock();
    let elapsed = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      elapsed += Math.min(clock.getDelta(), 0.05);
      if (mode === "auto" && visibleAt === null) visibleAt = elapsed;

      const order = orderAt(elapsed);
      uniforms.uTime.value = elapsed;
      uniforms.uOrder.value = order;
      if (laneMat) laneMat.opacity = Math.max(0, (order - 0.55) / 0.45) * 0.16;

      group.rotation.y += (tx * 0.05 - group.rotation.y) * 0.04;
      group.rotation.x += (-ty * 0.03 - group.rotation.x) * 0.04;
      renderer.render(scene, camera);
    };

    const start = () => { if (!running) { running = true; clock.start(); raf = requestAnimationFrame(frame); } };
    const stop = () => { if (running) { running = false; cancelAnimationFrame(raf); } };

    if (reduceMotion) {
      // a single, fully-ordered frame — no motion at all
      uniforms.uOrder.value = mode === "ambient" ? 0.6 : 1;
      uniforms.uTime.value = 4;
      if (laneMat) laneMat.opacity = mode === "ambient" ? 0 : 0.16;
      renderer.render(scene, camera);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (reduceMotion) return;
        if (entries.some((e) => e.isIntersecting)) start();
        else stop();
      },
      { rootMargin: "100px" }
    );
    io.observe(container);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      geo.dispose();
      mat.dispose();
      laneGeo?.dispose();
      laneMat?.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // scene parameters are fixed per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
