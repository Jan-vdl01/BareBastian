import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Erzeugt eine weiche, runde Partikel-Textur per Canvas (keine externen Assets). */
function createDotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const PALETTE = ['#22d3ee', '#3b82f6', '#6366f1', '#a855f7', '#e2e8f0'].map((c) => new THREE.Color(c));

/**
 * Fixierter Three.js-Partikelhintergrund.
 * Partikel driften sanft per Sinus-Bewegung, reagieren leicht auf Maus & Scroll
 * und pausieren, wenn der Tab nicht sichtbar ist.
 */
export function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      return; // WebGL nicht verfügbar → CSS-Hintergrund bleibt sichtbar
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = () => window.innerWidth;
    const height = () => window.innerHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width(), height());
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.0014);
    const camera = new THREE.PerspectiveCamera(60, width() / height(), 1, 2000);
    camera.position.z = 420;

    const count = width() < 768 ? 1000 : 2400;
    const base = new Float32Array(count * 3);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      base[i3] = (Math.random() - 0.5) * 1400;
      base[i3 + 1] = (Math.random() - 0.5) * 1000;
      base[i3 + 2] = (Math.random() - 0.5) * 800;
      positions.set([base[i3], base[i3 + 1], base[i3 + 2]], i3);
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      colors.set([color.r, color.g, color.b], i3);
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const texture = createDotTexture();
    const material = new THREE.PointsMaterial({
      size: 5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / width() - 0.5) * 2;
      mouse.y = (e.clientY / height() - 0.5) * 2;
    };
    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frame = 0;

    const render = () => {
      const t = clock.getElapsedTime();
      const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const p = phases[i];
        arr[i3] = base[i3] + Math.sin(t * 0.25 + p) * 14;
        arr[i3 + 1] = base[i3 + 1] + Math.cos(t * 0.2 + p * 1.3) * 18;
        arr[i3 + 2] = base[i3 + 2] + Math.sin(t * 0.15 + p * 0.7) * 10;
      }
      attr.needsUpdate = true;

      const scroll = window.scrollY / Math.max(1, document.body.scrollHeight - height());
      points.rotation.y = t * 0.02 + scroll * 0.6;
      points.rotation.x = scroll * 0.25;

      camera.position.x += (mouse.x * 40 - camera.position.x) * 0.03;
      camera.position.y += (-mouse.y * 30 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    const loop = () => {
      render();
      frame = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reducedMotion) frame = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);

    if (reducedMotion) render();
    else frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.12),transparent_55%)]"
    />
  );
}
