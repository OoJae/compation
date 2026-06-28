'use client';

import { useEffect } from 'react';
import * as THREE from 'three';

/**
 * Landing-page enhancers, ported faithfully from the brand artifact: the
 * scroll-spy side-nav, the hero count-up, the mini what-if widget, and the
 * scroll-driven Three.js hero (cost ribbon crossing the hedge ribbon). The
 * scroll-reveal fades are handled separately by <Reveal/>. No-ops gracefully if
 * WebGL or the hooks are absent; respects prefers-reduced-motion.
 */
export function LandingFx() {
  useEffect(() => {
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let isMobile = window.innerWidth < 760;
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const qa = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];

    let heroEnd = 1;
    let smP = 0;
    let raf = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let three: any = null;
    type Item = { el: HTMLAnchorElement; sec: HTMLElement; tick: HTMLElement; lab: HTMLElement };
    let sideItems: Item[] = [];
    let cv: THREE.Vector3 | null = null;
    let tv: THREE.Vector3 | null = null;
    let crossT = 0.62;
    let crossPoint = new THREE.Vector3();

    const smoothstep = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const costY = (t: number) => 0.45 + 0.75 * t + 1.85 * smoothstep(0.38, 1, t) + 0.13 * Math.sin(t * 23) * smoothstep(0.32, 1, t);
    const hedgeY = (t: number) => {
      const k = Math.max(0, (t - 0.2) / 0.8);
      return 0.16 + 2.95 * Math.pow(Math.min(1, k), 1.12);
    };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const v3lerp = (out: THREE.Vector3, a: number[], b: number[], t: number) => {
      out.set(lerp(a[0]!, b[0]!, t), lerp(a[1]!, b[1]!, t), lerp(a[2]!, b[2]!, t));
      return out;
    };

    function measure() {
      const shift = q('[data-section="shift"]');
      heroEnd = shift ? Math.max(1, shift.offsetTop + shift.offsetHeight - window.innerHeight) : Math.max(1, window.innerHeight * 2.6);
    }
    function scrolledPx() {
      const hero = q('[data-section="hero"]');
      if (hero) return Math.max(0, -hero.getBoundingClientRect().top);
      return window.scrollY || document.scrollingElement?.scrollTop || 0;
    }
    function heroProgress() {
      return Math.max(0, Math.min(1, scrolledPx() / heroEnd));
    }

    function setupSideNav() {
      const nav = q('[data-sidenav]');
      if (!nav) return;
      sideItems = qa('main > section').map((s) => {
        const a = document.createElement('a');
        a.href = s.id ? '#' + s.id : '#top';
        a.style.cssText = 'display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer;';
        const label = (s.getAttribute('data-label') || '').toUpperCase();
        a.innerHTML =
          '<span style="width:18px;height:1.5px;background:rgba(236,238,241,0.22);display:block;transition:all .4s cubic-bezier(0.16,1,0.3,1);"></span>' +
          '<span style="font-family:var(--font-jetbrains),monospace;font-size:9.5px;letter-spacing:.14em;color:#5C6472;opacity:0;transition:opacity .4s ease;white-space:nowrap;">' +
          label +
          '</span>';
        nav.appendChild(a);
        return { el: a, sec: s, tick: a.firstChild as HTMLElement, lab: a.lastChild as HTMLElement };
      });
      updateSideNav();
    }
    function updateSideNav() {
      if (!sideItems.length) return;
      const mid = window.innerHeight * 0.42;
      let active: Item | null = null;
      let best = 1e9;
      for (const it of sideItems) {
        const r = it.sec.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) {
          active = it;
          break;
        }
        const d = Math.abs(r.top - mid);
        if (d < best) {
          best = d;
          active = it;
        }
      }
      for (const it of sideItems) {
        const on = it === active;
        it.tick.style.width = on ? '30px' : '18px';
        it.tick.style.background = on ? '#34D399' : 'rgba(236,238,241,0.22)';
        it.tick.style.boxShadow = on ? '0 0 8px rgba(52,211,153,0.6)' : 'none';
        it.lab.style.opacity = on ? '1' : '0';
        it.lab.style.color = on ? '#9AA1AC' : '#5C6472';
      }
    }

    function setupWhatIf() {
      const slider = q('[data-wf-slider]') as HTMLInputElement | null;
      if (!slider) return;
      const money = (n: number) => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
      const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + money(n);
      const base = 40000;
      const ratio = 0.8;
      const set = (sel: string, txt: string, color?: string) => {
        const el = q(sel);
        if (el) {
          el.textContent = txt;
          if (color) el.style.color = color;
        }
      };
      const upd = () => {
        const v = parseFloat(slider.value) || 0;
        const pct = v / 100;
        const billDelta = base * pct;
        const hedge = base * pct * ratio;
        const carry = base * Math.abs(pct) * (1 - ratio);
        set('[data-wf-rate]', (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%', v >= 0 ? '#F5B544' : '#7DD3FC');
        set('[data-wf-bill]', money(base + billDelta));
        set('[data-wf-billd]', billDelta === 0 ? 'no change' : signed(billDelta), billDelta > 0 ? '#F5B544' : billDelta < 0 ? '#7DD3FC' : '#5C6472');
        set('[data-wf-hedge]', hedge === 0 ? '$0' : signed(hedge), hedge >= 0 ? '#34D399' : '#FB7185');
        set('[data-wf-net]', money(carry));
      };
      slider.addEventListener('input', upd);
      upd();
    }

    function countUp() {
      const cu = q('[data-countup]');
      if (!cu) return;
      const target = parseFloat(cu.getAttribute('data-countup') || '0') || 0;
      if (reduced) {
        cu.textContent = '$' + target.toFixed(2);
        return;
      }
      const dur = 1100;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        cu.textContent = '$' + (target * e).toFixed(2);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function initThree() {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x07080b, 0.058);
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
      const EM = 0x34d399;
      const AM = 0xf5b544;
      const N = 44;
      const X0 = -7;
      const X1 = 7;
      const costPts: THREE.Vector3[] = [];
      const hedgePts: THREE.Vector3[] = [];
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const x = X0 + (X1 - X0) * t;
        costPts.push(new THREE.Vector3(x, costY(t), 0.55));
        hedgePts.push(new THREE.Vector3(x, hedgeY(t), -0.55));
      }
      const costCurve = new THREE.CatmullRomCurve3(costPts);
      const hedgeCurve = new THREE.CatmullRomCurve3(hedgePts);
      for (let i = 1; i < 200; i++) {
        const t = i / 200;
        if (hedgeY(t) >= costY(t)) {
          crossT = t;
          break;
        }
      }
      const seg = 240;
      const costMesh = new THREE.Mesh(new THREE.TubeGeometry(costCurve, seg, 0.05, 12, false), new THREE.MeshBasicMaterial({ color: AM, transparent: true, opacity: 0.92, fog: true }));
      const hedgeMesh = new THREE.Mesh(new THREE.TubeGeometry(hedgeCurve, seg, 0.062, 12, false), new THREE.MeshBasicMaterial({ color: EM, transparent: true, opacity: 0.96, fog: true }));
      const hedgeGlow = new THREE.Mesh(new THREE.TubeGeometry(hedgeCurve, seg, 0.2, 10, false), new THREE.MeshBasicMaterial({ color: EM, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(costMesh, hedgeMesh, hedgeGlow);
      const barGeo = new THREE.BufferGeometry();
      const bn = 30;
      const pos: number[] = [];
      const col: number[] = [];
      const cA = new THREE.Color(AM);
      const cE = new THREE.Color(EM);
      for (let i = 0; i < bn; i++) {
        const t = i / (bn - 1);
        const x = X0 + (X1 - X0) * t;
        pos.push(x, costY(t), 0.55, x, hedgeY(t), -0.55);
        const c = t < crossT ? cA : cE;
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      barGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      barGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const bars = new THREE.LineSegments(barGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, fog: true }));
      scene.add(bars);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grid = new THREE.GridHelper(46, 46, 0x16352b, 0x10151c) as any;
      grid.position.y = -0.06;
      grid.material.transparent = true;
      grid.material.opacity = 0.42;
      grid.material.fog = true;
      scene.add(grid);
      const headCost = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 18), new THREE.MeshBasicMaterial({ color: 0xf7d9a0 }));
      const headHedge = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 20), new THREE.MeshBasicMaterial({ color: 0xcff7e6 }));
      scene.add(headCost, headHedge);
      crossPoint = new THREE.Vector3(X0 + (X1 - X0) * crossT, (costY(crossT) + hedgeY(crossT)) / 2, 0);
      const crossDot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 22, 22), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const crossGlow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 22), new THREE.MeshBasicMaterial({ color: EM, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      crossDot.position.copy(crossPoint);
      crossGlow.position.copy(crossPoint);
      crossDot.scale.setScalar(0.001);
      crossGlow.scale.setScalar(0.001);
      scene.add(crossDot, crossGlow);
      three = { renderer, scene, camera, bars, headCost, headHedge, crossDot, crossGlow, costCurve, hedgeCurve };
      resizeThree();
      applyProgress(reduced ? 1 : heroProgress());
      renderOnce();
    }
    function resizeThree() {
      if (!three) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
      three.renderer.setSize(w, h, false);
      three.camera.aspect = w / h;
      three.camera.updateProjectionMatrix();
    }
    function applyProgress(p: number) {
      if (!three) return;
      const T = three;
      const e = smoothstep(0, 1, p);
      const camA = [-7.6, 1.5, 7.4];
      const camB = [6.6, 4.4, 10.2];
      const tgtA = [-4, 0.7, 0];
      const tgtB = [2.2, 2.2, 0];
      if (!cv) {
        cv = new THREE.Vector3();
        tv = new THREE.Vector3();
      }
      v3lerp(cv, camA, camB, e);
      const idle = reduced ? 0 : performance.now() * 0.001;
      T.camera.position.set(cv.x + Math.sin(idle * 0.5) * 0.06, cv.y + Math.sin(idle * 0.7) * 0.05, cv.z);
      v3lerp(tv!, tgtA, tgtB, e);
      T.camera.lookAt(tv!);
      const hc = Math.min(1, p * 1.05);
      const hh = Math.min(1, Math.max(0, p - 0.04) * 1.08);
      T.headCost.position.copy(T.costCurve.getPoint(hc));
      T.headHedge.position.copy(T.hedgeCurve.getPoint(hh));
      T.bars.material.opacity = 0.08 + 0.34 * smoothstep(0.1, 0.8, p);
      const cs = smoothstep(crossT - 0.06, crossT + 0.05, Math.min(1, p * 1.05));
      T.crossDot.scale.setScalar(0.001 + cs);
      const pulse = reduced ? 1 : 1 + 0.12 * Math.sin(performance.now() * 0.005);
      T.crossGlow.scale.setScalar(0.001 + cs * pulse);
      const fade = 1 - smoothstep(0.93, 1, p);
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) canvas.style.opacity = String(fade * 0.85 + 0.15);
    }
    function updateChips(p: number) {
      if (!three || isMobile) {
        ['cost', 'hedge', 'cross'].forEach((k) => {
          const c = q('[data-chip="' + k + '"]');
          if (c) c.style.opacity = '0';
        });
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const place = (key: string, pt: THREE.Vector3, vis: number) => {
        const c = q('[data-chip="' + key + '"]');
        if (!c) return;
        const v = pt.clone().project(three.camera);
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        const onScreen = v.z < 1 && x > 40 && x < w - 40 && y > 80 && y < h - 60;
        c.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px)';
        c.style.opacity = (onScreen ? vis : 0).toFixed(2);
      };
      place('cost', three.costCurve.getPoint(0.92), smoothstep(0.04, 0.16, p));
      place('hedge', three.hedgeCurve.getPoint(0.8), smoothstep(0.34, 0.5, p));
      place('cross', crossPoint, smoothstep(crossT - 0.02, crossT + 0.08, Math.min(1, p * 1.05)));
    }
    function renderOnce() {
      if (!three) return;
      three.renderer.render(three.scene, three.camera);
      updateChips(reduced ? 1 : heroProgress());
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      updateSideNav();
      const target = heroProgress();
      smP += (target - smP) * 0.12;
      const past = scrolledPx() > heroEnd + window.innerHeight * 1.3;
      if (three && !past) {
        applyProgress(smP);
        updateChips(smP);
        three.renderer.render(three.scene, three.camera);
      }
    }

    setupSideNav();
    setupWhatIf();
    countUp();
    const onScroll = () => updateSideNav();
    const onResize = () => {
      isMobile = window.innerWidth < 760;
      measure();
      resizeThree();
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onResize);
    measure();
    try {
      initThree();
    } catch {
      /* no WebGL — keep the static gradient backdrop */
    }
    if (!reduced) {
      smP = heroProgress();
      loop();
    } else {
      renderOnce();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onResize);
      if (three?.renderer) {
        try {
          three.renderer.dispose();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return null;
}
