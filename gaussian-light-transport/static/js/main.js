/* =============================================================
   Academic project page — behaviour
   Vanilla JS, no dependencies. Every widget is opt-in through a
   data-* attribute, so deleting a section from index.html never
   breaks anything here.
   ============================================================= */

(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Nav: shadow, progress bar, scroll spy -------- */

  (function nav() {
    const bar  = $('[data-progress]');
    const head = $('[data-nav]');
    const links = $$('.nav__links a');
    const sections = links
      .map(a => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    let ticking = false;

    function update() {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;

      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      if (head) head.classList.toggle('is-stuck', y > 8);

      // Highlight the section whose top has most recently passed the navbar.
      const line = y + (head ? head.offsetHeight : 0) + 24;
      let active = null;
      sections.forEach(s => { if (s.offsetTop <= line) active = s; });
      links.forEach(a => {
        a.classList.toggle('is-current', !!active && a.getAttribute('href') === '#' + active.id);
      });
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();


  /* ---------- 2. Reveal on scroll ----------------------------- */

  (function reveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    // threshold 0 rather than a fraction: a block taller than the viewport
    // (the teaser video, a comparison slider) may never reach a fractional one.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0 });

    items.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      io.observe(el);
    });
  })();


  /* ---------- 3. Pause videos that are off screen ------------- */

  (function autoPause() {
    const videos = $$('video[data-autopause]');
    if (!videos.length || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload === 'none') v.preload = 'auto';
          const p = v.play();
          if (p && p.catch) p.catch(() => {});   // autoplay can be refused; the poster stays
        } else {
          v.pause();
        }
      });
    }, { rootMargin: '150px 0px', threshold: 0.15 });

    videos.forEach(v => io.observe(v));
  })();


  /* ---------- 4. Carousel ------------------------------------- */

  $$('[data-carousel]').forEach(root => {
    const viewport = $('[data-carousel-viewport]', root);
    const slides   = $$('.carousel__slide', root);
    const prev     = $('[data-carousel-prev]', root);
    const next     = $('[data-carousel-next]', root);
    const dotsWrap = $('[data-carousel-dots]', root);
    if (!viewport || !slides.length) return;

    const dots = slides.map((slide, i) => {
      if (!dotsWrap) return null;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Go to result ' + (i + 1));
      b.addEventListener('click', () => scrollToSlide(i));
      dotsWrap.appendChild(b);
      return b;
    });

    function scrollToSlide(i) {
      const target = slides[clamp(i, 0, slides.length - 1)];
      viewport.scrollTo({
        left: target.offsetLeft - slides[0].offsetLeft,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }

    function currentIndex() {
      const mid = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      slides.forEach((s, i) => {
        const c = s.offsetLeft - slides[0].offsetLeft + s.offsetWidth / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    function sync() {
      const i = currentIndex();
      dots.forEach((d, j) => d && d.classList.toggle('is-active', j === i));
      const atStart = viewport.scrollLeft <= 2;
      const atEnd   = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 2;
      if (prev) prev.disabled = atStart;
      if (next) next.disabled = atEnd;
    }

    if (prev) prev.addEventListener('click', () => scrollToSlide(currentIndex() - 1));
    if (next) next.addEventListener('click', () => scrollToSlide(currentIndex() + 1));

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollToSlide(currentIndex() + 1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollToSlide(currentIndex() - 1); }
    });

    let raf = null;
    viewport.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; sync(); });
    }, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    sync();
  });


  /* ---------- 5. Before/after comparison sliders -------------- */

  $$('[data-compare]').forEach(root => {
    const frame  = $('[data-cmp-frame]', root);
    const handle = $('[data-cmp-handle]', root);
    const base   = $('[data-cmp-base]', root);   // the "previous approach" layer
    const name   = $('[data-cmp-name]', root);
    if (!frame || !handle) return;

    let pos = 50;

    function setPos(next, announce) {
      pos = clamp(next, 0, 100);
      frame.style.setProperty('--pos', pos + '%');
      handle.setAttribute('aria-valuenow', Math.round(pos));
      if (announce !== false) {
        handle.setAttribute('aria-valuetext', Math.round(100 - pos) + '% ours');
      }
    }

    function posFromEvent(e) {
      const rect = frame.getBoundingClientRect();
      return ((e.clientX - rect.left) / rect.width) * 100;
    }

    let dragging = false;

    frame.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      // Capture keeps the drag alive past the edge of the image; if the
      // browser refuses the id we simply fall back to in-frame dragging.
      try { frame.setPointerCapture(e.pointerId); } catch (err) {}
      setPos(posFromEvent(e));
      handle.focus({ preventScroll: true });
      e.preventDefault();
    });

    frame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      setPos(posFromEvent(e));
    });

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
      frame.addEventListener(type, () => { dragging = false; });
    });

    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      const moves = {
        ArrowLeft:  -step, ArrowDown: -step,
        ArrowRight:  step, ArrowUp:    step,
        Home: -100, End: 100,
        PageDown: -20, PageUp: 20
      };
      if (!(e.key in moves)) return;
      e.preventDefault();
      setPos(e.key === 'Home' ? 0 : e.key === 'End' ? 100 : pos + moves[e.key]);
    });

    // Baseline picker — swaps the clipped layer, its label and the metric line.
    const chips = $$('[data-cmp-method]', root);
    const note  = $('[data-cmp-note]', root);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (!base) return;
        chips.forEach(c => c.classList.toggle('is-active', c === chip));
        base.src = chip.dataset.src;
        base.alt = chip.textContent.trim() + ' result for this scene';
        if (name) name.textContent = chip.textContent.trim();
        if (note && chip.dataset.note) note.textContent = chip.dataset.note;
      });
    });

    setPos(50);

    // A one-off nudge the first time the slider scrolls into view, so it
    // reads as interactive without the visitor having to guess.
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          const start = performance.now();
          const dur = 1100;
          (function tick(now) {
            const t = clamp((now - start) / dur, 0, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            setPos(50 + Math.sin(eased * Math.PI * 2) * 14, false);
            if (t < 1) requestAnimationFrame(tick); else setPos(50);
          })(start);
        });
      }, { threshold: 0.45 });
      io.observe(frame);
    }
  });


  /* ---------- 6. YouTube: load the iframe only on click ------- */

  $$('[data-youtube]').forEach(root => {
    const btn = $('.yt__play', root);
    const id  = root.dataset.videoId;
    if (!btn || !id) return;

    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
                   '?autoplay=1&rel=0&modestbranding=1';
      iframe.title = root.dataset.title || 'Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      root.innerHTML = '';
      root.appendChild(iframe);
    });
  });


  /* ---------- 7. Copy-to-clipboard ---------------------------- */

  $$('[data-copy]').forEach(btn => {
    const block = btn.closest('.codeblock');
    const src = block && $('[data-copy-source]', block);
    const label = $('[data-copy-label]', btn);
    if (!src) return;

    btn.addEventListener('click', async () => {
      const text = src.textContent;
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
      }
      btn.classList.add('is-done');
      if (label) label.textContent = 'Copied';
      setTimeout(() => {
        btn.classList.remove('is-done');
        if (label) label.textContent = 'Copy';
      }, 1800);
    });
  });


  /* ---------- 8. Hero title, drawn as a mixture of 2D Gaussians -------
     The heading is rasterised once, then covered greedily with flat
     anisotropic ellipses: biggest first, each one seated on the medial axis
     of a stroke, its minor axis the local half stroke width and its major
     axis the furthest it can stretch without leaving the glyph. Nothing is
     optimised at run time and nothing moves — the ellipses fade in left to
     right and then hand the letters back to the real text.
     ------------------------------------------------------------------- */

  (function titleFit() {
    const host = $('[data-glyph-fit]');
    if (!host || reduceMotion) return;

    const words = $$('.gfit__w', host);
    if (!words.length || !document.createElement('canvas').getContext) return;

    const PAD      = 12;     // px of slack around the heading box
    const MAX_E    = 900;    // hard ceiling on the ellipse count
    const ASPECT   = 3.6;    // longest an ellipse may get, in minor axes
    const FAT      = 1.42;   // how far a primitive is allowed to overshoot its stroke
    const LONG     = 1.10;
    const DIRS     = 12;     // orientations probed per ellipse
    const SWEEP_MS = 1700;   // how long the wipe takes to cross the heading
    const POP_MS   = 520;    // how long one primitive takes to grow in
    const HOLD_MS  = 500;    // beat on the finished mixture
    const TIGHT_MS = 520;    // "converge" only: primitives shrinking onto the glyphs

    // data-glyph-fit="converge" — the mixture tightens from its overshoot onto
    //   the exact letterforms, then swaps to real text as the two coincide.
    // data-glyph-fit="keep"     — the mixture is the heading; the text stays in
    //   the DOM for a11y, search and copy-paste, but is never shown.
    const MODE = host.dataset.glyphFit === 'keep' ? 'keep' : 'converge';

    const rootStyle = getComputedStyle(document.documentElement);
    const scratch   = document.createElement('canvas').getContext('2d');

    let raf = 0, running = false, canvas = null;

    // Let the canvas parse whatever a custom property holds; it hands back
    // a normalised #rrggbb.
    function rgb(value) {
      scratch.fillStyle = '#000';
      scratch.fillStyle = String(value).trim() || '#000';
      const hex = scratch.fillStyle;
      if (hex.charAt(0) !== '#') return [128, 128, 128];
      return [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));
    }

    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';

    // Zero-height inline-blocks sit with their box on the baseline, which is
    // the only dependable way to place a glyph in canvas space.
    words.forEach(w => {
      const i = document.createElement('i');
      i.className = 'gfit__strut';
      i.setAttribute('aria-hidden', 'true');
      w.appendChild(i);
    });

    /* -- rasterise the heading ------------------------------------- */

    function raster() {
      const hb = host.getBoundingClientRect();
      const W = hb.width + 2 * PAD, H = hb.height + 2 * PAD;
      if (W < 20 || H < 20) return null;

      let size = 0;
      words.forEach(w => { size = Math.max(size, parseFloat(getComputedStyle(w).fontSize)); });

      // Enough resolution that a stem is several pixels across, whatever the
      // viewport has done to the responsive type.
      const rs = clamp(140 / size, 0.6, 3);
      const rw = Math.round(W * rs), rh = Math.round(H * rs);

      const rc = document.createElement('canvas');
      rc.width = rw; rc.height = rh;
      const g = rc.getContext('2d', { willReadFrequently: true });
      g.scale(rs, rs);
      g.textBaseline = 'alphabetic';

      words.forEach((w, i) => {
        const cs = getComputedStyle(w);
        g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' +
                 parseFloat(cs.fontSize) + 'px ' + cs.fontFamily;
        if ('letterSpacing' in g) g.letterSpacing = cs.letterSpacing;
        // The red channel carries the word index, so every ellipse knows
        // which run it belongs to and can take that run's colour.
        g.fillStyle = 'rgb(' + (20 + i * 40) + ',0,0)';
        const r = w.getBoundingClientRect();
        const base = w.querySelector('.gfit__strut').getBoundingClientRect().top;
        g.fillText(w.textContent, r.left - hb.left + PAD, base - hb.top + PAD);
      });

      const px = g.getImageData(0, 0, rw, rh).data;
      const n = rw * rh;
      const mask = new Uint8Array(n);
      const owner = new Uint8Array(n);
      let ink = 0;
      for (let i = 0; i < n; i++) {
        if (px[i * 4 + 3] > 140) {
          mask[i] = 1;
          owner[i] = Math.round((px[i * 4] - 20) / 40);
          ink++;
        }
      }
      if (ink < 200) return null;                    // webfont not in yet
      return { mask: mask, owner: owner, rw: rw, rh: rh, rs: rs, W: W, H: H, size: size };
    }

    /* -- distance to the nearest background pixel, 3-4 chamfer ------ */

    function distance(m) {
      const rw = m.rw, rh = m.rh, mask = m.mask;
      const d = new Float32Array(rw * rh);
      const BIG = 1e9;
      for (let i = 0; i < d.length; i++) d[i] = mask[i] ? BIG : 0;

      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          const i = y * rw + x;
          if (!mask[i]) continue;
          let v = d[i];
          if (x > 0)            v = Math.min(v, d[i - 1] + 3);
          if (y > 0)            v = Math.min(v, d[i - rw] + 3);
          if (x > 0 && y > 0)   v = Math.min(v, d[i - rw - 1] + 4);
          if (x < rw - 1 && y > 0) v = Math.min(v, d[i - rw + 1] + 4);
          d[i] = v;
        }
      }
      for (let y = rh - 1; y >= 0; y--) {
        for (let x = rw - 1; x >= 0; x--) {
          const i = y * rw + x;
          if (!mask[i]) continue;
          let v = d[i];
          if (x < rw - 1)             v = Math.min(v, d[i + 1] + 3);
          if (y < rh - 1)             v = Math.min(v, d[i + rw] + 3);
          if (x < rw - 1 && y < rh - 1) v = Math.min(v, d[i + rw + 1] + 4);
          if (x > 0 && y < rh - 1)      v = Math.min(v, d[i + rw - 1] + 4);
          d[i] = v;
        }
      }
      for (let i = 0; i < d.length; i++) d[i] /= 3;   // back to pixel units
      return d;
    }

    /* -- greedy cover: biggest ellipse first ------------------------ */

    function fit(m) {
      const rw = m.rw, rh = m.rh, mask = m.mask;
      const dist = distance(m);
      const minB = Math.max(1.2, m.rs * m.size * 0.026);

      // Seeds, thickest part of a stroke first.
      const seeds = [];
      for (let i = 0; i < mask.length; i++) if (dist[i] >= minB) seeds.push(i);
      seeds.sort((a, b) => dist[b] - dist[a]);

      const taken = new Uint8Array(mask.length);
      const out = [];

      for (let s = 0; s < seeds.length && out.length < MAX_E; s++) {
        const i = seeds[s];
        if (taken[i]) continue;

        const cx = i % rw, cy = (i / rw) | 0;
        const b = dist[i];
        const reach = b * ASPECT;

        // Probe orientations; keep the one with the most room either way.
        let bestA = 0, bestTh = 0;
        for (let k = 0; k < DIRS; k++) {
          const th = k * Math.PI / DIRS;
          const ux = Math.cos(th), uy = Math.sin(th);
          let lo = 0, hi = 0;
          for (let t = 1; t <= reach; t++) {
            const x = Math.round(cx + ux * t), y = Math.round(cy + uy * t);
            if (x < 0 || y < 0 || x >= rw || y >= rh || !mask[y * rw + x]) break;
            hi = t;
          }
          for (let t = 1; t <= reach; t++) {
            const x = Math.round(cx - ux * t), y = Math.round(cy - uy * t);
            if (x < 0 || y < 0 || x >= rw || y >= rh || !mask[y * rw + x]) break;
            lo = t;
          }
          const a = Math.min(lo, hi);
          if (a > bestA) { bestA = a; bestTh = th; }
        }

        const a = clamp(bestA, b, b * ASPECT);
        const ux = Math.cos(bestTh), uy = Math.sin(bestTh);

        // Claim the area this ellipse covers so the next seed lands elsewhere.
        const ext = Math.ceil(a) + 1;
        for (let y = Math.max(0, cy - ext); y <= Math.min(rh - 1, cy + ext); y++) {
          for (let x = Math.max(0, cx - ext); x <= Math.min(rw - 1, cx + ext); x++) {
            const ex = x - cx, ey = y - cy;
            const u = (ex * ux + ey * uy) / (a * 1.15);
            const v = (-ex * uy + ey * ux) / (b * 1.35);
            if (u * u + v * v <= 1) taken[y * rw + x] = 1;
          }
        }

        // True stroke-fitting axes. The overshoot is applied when drawing so
        // that "converge" can animate it away.
        out.push({
          x: cx / m.rs, y: cy / m.rs,
          a: a / m.rs, b: b / m.rs,
          th: bestTh,
          word: m.owner[i]
        });
      }
      return out;
    }

    /* -- colour the ellipses like the text they replace ------------- */

    function paint(list) {
      const hb = host.getBoundingClientRect();
      const acc = rgb(rootStyle.getPropertyValue('--accent'));
      const acc2 = rgb(rootStyle.getPropertyValue('--accent-2'));

      // The <em> carries a left-to-right accent gradient; match its span so
      // the mixture lands on the colours the words are about to take.
      let emLo = Infinity, emHi = -Infinity;
      const inEm = words.map(w => {
        const em = w.parentNode && w.parentNode.closest ? w.parentNode.closest('em') : null;
        if (em) {
          const r = w.getBoundingClientRect();
          emLo = Math.min(emLo, r.left - hb.left + PAD);
          emHi = Math.max(emHi, r.right - hb.left + PAD);
        }
        return !!em;
      });
      const plain = words.map(w => rgb(getComputedStyle(w).color));

      list.forEach(e => {
        const w = clamp(e.word, 0, words.length - 1);
        let c;
        if (inEm[w] && emHi > emLo) c = mix(acc, acc2, clamp((e.x - emLo) / (emHi - emLo), 0, 1));
        else c = plain[w];
        // A little brightness scatter keeps neighbouring ellipses legible
        // as separate primitives rather than one poured shape.
        const j = 1 + (Math.random() - 0.5) * 0.18;
        e.css = css(c.map(v => clamp(Math.round(v * j), 0, 255)));
      });
    }

    /* -- run -------------------------------------------------------- */

    function start() {
      const m = raster();
      if (!m) { host.classList.remove('is-fitting'); return; }

      const list = fit(m);
      if (!list.length) { host.classList.remove('is-fitting'); return; }
      paint(list);

      // Left to right, with just enough jitter to soften the leading edge
      // without losing the sense of a wipe.
      const xs = list.map(e => e.x + (Math.random() - 0.5) * m.W * 0.045);
      const order = list.map((e, i) => i).sort((p, q) => xs[p] - xs[q]);
      order.forEach((idx, rank) => { list[idx].t0 = rank / order.length * SWEEP_MS; });

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas = document.createElement('canvas');
      canvas.className = 'gfit__canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width  = Math.round(m.W * dpr);
      canvas.height = Math.round(m.H * dpr);
      canvas.style.cssText = 'width:' + m.W + 'px;height:' + m.H + 'px;' +
                             'left:' + (-PAD) + 'px;top:' + (-PAD) + 'px';
      host.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const edge = css(rgb(rootStyle.getPropertyValue('--bg')));
      const lw = clamp(m.size * 0.012, 0.5, 1.4);
      const total = SWEEP_MS + POP_MS;
      let t0 = -1;

      function frame(now) {
        if (!running) return;
        if (t0 < 0) t0 = now;
        const t = now - t0;

        ctx.clearRect(0, 0, m.W, m.H);
        ctx.strokeStyle = edge;
        ctx.lineWidth = lw;

        // Overshoot, easing to 1 through the converge phase.
        let k = 0;
        if (MODE === 'converge' && t > total + HOLD_MS) {
          const c = clamp((t - total - HOLD_MS) / TIGHT_MS, 0, 1);
          k = c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
        }
        const fat = FAT + (1 - FAT) * k, lng = LONG + (1 - LONG) * k;

        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          const p = clamp((t - e.t0) / POP_MS, 0, 1);
          if (p <= 0) continue;
          // Back-ease: each primitive grows from a speck, overshoots its own
          // covariance slightly and settles. Opacity arrives well ahead of
          // the scale, so what you watch is the growing, not a fade.
          const q = p - 1;
          const s = clamp(1 + 2.70158 * q * q * q + 1.70158 * q * q, 0.05, 1.2);

          ctx.globalAlpha = clamp(p * 2.4, 0, 1);
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, e.a * lng * s, e.b * fat * s, e.th, 0, Math.PI * 2);
          ctx.fillStyle = e.css;
          ctx.fill();
          ctx.stroke();
        }

        if (MODE === 'keep') {
          // Nothing changes once every primitive has grown in; stop burning
          // frames and leave the last one on screen.
          if (t > total) { running = false; return; }
        } else if (t > total + HOLD_MS + TIGHT_MS) {
          finish();
          return;
        }
        raf = requestAnimationFrame(frame);
      }

      running = true;
      raf = requestAnimationFrame(frame);
    }

    function finish() {
      running = false;
      cancelAnimationFrame(raf);
      host.classList.remove('is-fitting');           // CSS cross-fades the two
      const dying = canvas;
      canvas = null;
      if (dying) setTimeout(function () { dying.remove(); }, 700);
    }

    function run() {
      if (running && MODE !== 'keep') return;
      running = false;
      cancelAnimationFrame(raf);
      if (canvas) { canvas.remove(); canvas = null; }
      host.classList.add('is-fitting');
      start();
    }

    // A reflowed heading invalidates every ellipse. In "keep" mode the mixture
    // *is* the heading, so it has to be refitted — and it has to be refitted
    // against the heading's own box, not the window's: a resize event fires
    // before the text has rewrapped, so measuring there yields a stale width.
    let resizeTimer = 0;
    const refit = function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(run, 180); };

    if (MODE === 'keep' && 'ResizeObserver' in window) {
      let primed = false, lastW = 0, lastH = 0;
      new ResizeObserver(function (entries) {
        const r = entries[0].contentRect;
        if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
        lastW = r.width; lastH = r.height;
        // The observe() call itself delivers one entry; that is the fit we
        // have just done, not a change.
        if (!primed) { primed = true; return; }
        refit();
      }).observe(host);
    }

    window.addEventListener('resize', function () {
      if (MODE === 'keep') {
        if (!('ResizeObserver' in window)) refit();
      } else if (running) {
        finish();                              // hand the letters back early
      }
    }, { passive: true });
    host.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.gfit__w')) run();
    });

    host.classList.add('is-fitting');                // hide the words before first paint

    // The heading must not sit blank behind a slow webfont: if the faces are
    // not in quickly, drop the effect and let the text render normally.
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    let fontsIn = false;
    ready.then(function () { fontsIn = true; });
    Promise.race([ready, new Promise(function (r) { setTimeout(r, 900); })]).then(function () {
      if (fontsIn) start();
      else host.classList.remove('is-fitting');
    });
  })();


  /* ---------- 9. Paired clips under one shared toggle ---------------
     Every card holds both takes of the same camera move — the render and
     the flattened Gaussians — stacked and cross-faded by CSS. This module
     owns their playback: only the layer named by data-vswap-show is ever
     played, and only while its card is on screen, so a grid of n cards
     costs n decodes rather than 2n. The playhead is carried across on a
     swap, so the two takes read as one continuous shot.
     ------------------------------------------------------------------ */

  $$('[data-vswap]').forEach(root => {
    const btns  = $$('[data-vswap-btn]', root);
    const cards = $$('[data-vswap-card]', root);
    if (!btns.length || !cards.length) return;

    let key = btns[0].dataset.vswapBtn;
    const onScreen = new Set();

    const layers = card => $$('[data-vswap-layer]', card);
    const shown  = card => layers(card).filter(v => v.dataset.vswapLayer === key)[0];

    // currentTime only takes once there is a timeline to seek in.
    function seek(v, t) {
      if (!(t > 0)) return;
      if (v.readyState >= 1) { try { v.currentTime = t; } catch (e) {} }
      else v.addEventListener('loadedmetadata', function once() {
        v.removeEventListener('loadedmetadata', once);
        try { v.currentTime = t; } catch (e) {}
      });
    }

    function apply(card) {
      const on = shown(card);
      if (!on) return;
      let at = 0;
      layers(card).forEach(v => {
        if (v === on) return;
        if (v.currentTime > at) at = v.currentTime;
        v.pause();
      });
      if (!onScreen.has(card) || reduceMotion) return;
      if (on.preload === 'none') on.preload = 'auto';   // load() here would abort and refetch
      seek(on, at);
      const p = on.play();
      if (p && p.catch) p.catch(() => {});   // autoplay can be refused; the poster stays
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
          apply(entry.target);
        });
      }, { rootMargin: '200px 0px', threshold: 0.1 });
      cards.forEach(c => io.observe(c));
    } else {
      cards.forEach(c => onScreen.add(c));
    }

    btns.forEach(btn => btn.addEventListener('click', () => {
      key = btn.dataset.vswapBtn;
      root.dataset.vswapShow = key;
      btns.forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(apply);
    }));

    root.dataset.vswapShow = key;
    // Reduced motion gets the controls instead of an animation it did not ask for.
    if (reduceMotion) cards.forEach(c => layers(c).forEach(v => { v.controls = true; }));
  });


  /* ---------- 10. Fullscreen a scene card --------------------- */

  /* The card, not the video: that keeps both layers and whatever the
     rendered/flat switch has selected. iOS Safari has no element
     fullscreen at all, so there we hand the visible layer to the native
     player instead. */
  (function fullscreenCards() {
    const btns = $$('[data-fullscreen]');
    if (!btns.length) return;

    const request = el =>
      el.requestFullscreen ? el.requestFullscreen()
      : el.webkitRequestFullscreen ? el.webkitRequestFullscreen()
      : null;

    const current = () => document.fullscreenElement || document.webkitFullscreenElement;

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-vswap-card]');
        if (!card) return;

        if (current()) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          return;
        }

        const done = request(card);
        if (done && done.catch) done.catch(() => {});
        if (!done) {
          // iOS: no element fullscreen, so use the native player on the
          // layer that is actually showing.
          const shown = $$('[data-vswap-layer]', card)
            .filter(v => getComputedStyle(v).opacity !== '0')[0];
          if (shown && shown.webkitEnterFullscreen) {
            shown.play().catch(() => {});
            shown.webkitEnterFullscreen();
          }
        }
      });
    });
  })();

})();
