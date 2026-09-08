/**
 * Minify Noise — Wave Grid
 * Adapted from Minify Radio wave-grid.js
 * Tuned for a very slow, very gentle, meditative feel.
 */

(function () {
  'use strict';

  // ===== CONFIGURATION =====
  // All values pulled significantly back from Radio defaults for a calmer feel.
  const config = {
    // Grid — wider gaps mean fewer, more spacious lines
    xGap: 16,
    yGap: 26,

    // Noise field — lower frequencies = broader, slower waves
    xScale: 0.0016,
    yScale: 0.0012,

    // Time scroll — half Radio's speed for meditative drift
    speedX: 0.012,
    speedY: 0.007,

    // Angle gain — reduced for smoother, gentler undulation
    angleGain: 3.5,

    // Wave displacement — subtle vertical movement only
    waveAmpY: 9,

    // Field character (ported from the Radio wave kit, becalmed)
    warp: 0.2,                 // domain warp — marbled, organic flow
    drift: 0.008,              // whitney drift — rows slowly slide through alignment
    gerstnerAmp: 4,            // gentle horizontal bunching toward crests
    gerstnerWavelength: 260,
    gerstnerSpeed: 0.28,

    // Cursor interaction
    influenceRadius: 300,
    cursorStrength: 1.6,       // lighter touch — less dramatic displacement
    velocityScale: 0.16,       // modest velocity-to-impulse conversion
    pointerLerp: 0.08,         // pointer lags behind the finger = felt resistance
    cursorXScale: 0.25,
    maxCursorMoveY: 26,        // shallower grooves

    // Spring physics — overdamped, no oscillation
    // friction 0.62 kills 38% of velocity per frame: points stop, they don't ring
    // tension 0.010 is a barely-there drift back: grooves fill slowly, like sand
    tension: 0.010,
    friction: 0.62
  };

  // ===== THEME — one fixed, extremely subtle palette =====
  const BACKGROUND  = '#0a0a0a';
  const LINE_COLOR  = 'rgba(200, 185, 255, 0.065)'; // ghostly lavender whisper

  // ===== STATE =====
  let canvas = null;
  let ctx    = null;
  let time   = 0;
  let lastTime = 0;

  const grid = { points: [], rows: 0, cols: 0 };

  const pointer = {
    x: 0, y: 0,
    prevX: 0, prevY: 0,
    velocityX: 0, velocityY: 0,
    isActive: false
  };

  // ===== GRID INIT =====
  function initGrid(w, h) {
    const cols = Math.ceil(w / config.xGap) + 1;
    const rows = Math.ceil(h / config.yGap) + 1;
    grid.cols = cols;
    grid.rows = rows;
    grid.points = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        grid.points.push({
          baseX: col * config.xGap,
          baseY: row * config.yGap,
          currentX: col * config.xGap,
          currentY: row * config.yGap,
          cx: 0, cy: 0,
          cvx: 0, cvy: 0
        });
      }
    }
  }

  // Two octaves of simplex — the second adds fine grain
  function fbm(a, b) {
    return simplex.noise2D(a, b) + 0.5 * simplex.noise2D(a * 2.03 + 17.1, b * 2.11 + 9.2);
  }

  // ===== UPDATE =====
  function update(deltaTime) {
    time += deltaTime * 0.001;
    const dtSeconds = Math.max(1 / 120, Math.min(1 / 30, deltaTime / 1000));

    for (let i = 0; i < grid.points.length; i++) {
      const pt = grid.points[i];
      const x  = pt.baseX;
      const y  = pt.baseY;

      // Domain-warped two-octave field with per-row whitney drift
      const rowFrac = grid.rows > 1 ? Math.floor(i / grid.cols) / (grid.rows - 1) : 0;
      const u = x * config.xScale + time * config.speedX + rowFrac * config.drift * time;
      const v = y * config.yScale + time * config.speedY;
      const q = fbm(u + 5.2, v + 1.3);
      const n = fbm(u + config.warp * q, v + config.warp * q) / 1.5;
      const wy = Math.sin(config.angleGain * n) * config.waveAmpY;
      const k  = 2 * Math.PI / config.gerstnerWavelength;
      const wx = config.gerstnerAmp * Math.cos(k * x + time * config.gerstnerSpeed + rowFrac * 2.4);

      // Cursor velocity injection
      if (pointer.isActive) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const velMag = Math.sqrt(pointer.velocityX * pointer.velocityX + pointer.velocityY * pointer.velocityY);

        if (dist < config.influenceRadius) {
          const alignment = (dx * pointer.velocityX + dy * pointer.velocityY) / (velMag || 1);
          const minDist   = Math.max(dist, config.yGap * 0.5);
          const alignFactor = Math.max(0, alignment / minDist);
          const normDist  = dist / config.influenceRadius;
          const falloff   = Math.pow(1 - normDist, 2);
          const impulse   = falloff * alignFactor * config.cursorStrength;
          pt.cvx += pointer.velocityX * impulse * config.velocityScale;
          pt.cvy += pointer.velocityY * impulse * config.velocityScale;
        }
      }

      // Spring + friction
      pt.cvx += (-pt.cx) * config.tension;
      pt.cvy += (-pt.cy) * config.tension;
      pt.cvx *= config.friction;
      pt.cvy *= config.friction;

      const dtScale = dtSeconds * 60;
      pt.cx += pt.cvx * dtScale;
      pt.cy += pt.cvy * dtScale;
      pt.cx = Math.max(-config.maxCursorMoveY, Math.min(config.maxCursorMoveY, pt.cx));
      pt.cy = Math.max(-config.maxCursorMoveY, Math.min(config.maxCursorMoveY, pt.cy));

      pt.currentX = pt.baseX + wx + pt.cx * config.cursorXScale;
      pt.currentY = pt.baseY + wy + pt.cy;
    }
  }

  // ===== DRAW =====
  function draw(context) {
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    context.strokeStyle = LINE_COLOR;
    context.lineWidth   = 1;
    context.lineJoin    = 'round';
    context.lineCap     = 'round';

    for (let row = 0; row < grid.rows; row++) {
      context.beginPath();
      const base = row * grid.cols;
      context.moveTo(grid.points[base].currentX, grid.points[base].currentY);
      for (let col = 1; col < grid.cols - 1; col++) {
        const pt   = grid.points[base + col];
        const next = grid.points[base + col + 1];
        context.quadraticCurveTo(
          pt.currentX, pt.currentY,
          (pt.currentX + next.currentX) / 2, (pt.currentY + next.currentY) / 2
        );
      }
      const last = grid.points[base + grid.cols - 1];
      context.lineTo(last.currentX, last.currentY);
      context.stroke();
    }
  }

  // ===== ANIMATION LOOP =====
  function animate(now) {
    if (lastTime === 0) lastTime = now;
    const delta = now - lastTime;
    lastTime = now;
    update(delta);
    draw(ctx);
    requestAnimationFrame(animate);
  }

  // ===== POINTER TRACKING =====
  function initPointer(el) {
    el.addEventListener('pointermove', function (e) {
      const rect = el.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      pointer.x += (rawX - pointer.x) * config.pointerLerp;
      pointer.y += (rawY - pointer.y) * config.pointerLerp;
      pointer.velocityX = pointer.x - pointer.prevX;
      pointer.velocityY = pointer.y - pointer.prevY;
      const mag = Math.sqrt(pointer.velocityX * pointer.velocityX + pointer.velocityY * pointer.velocityY);
      if (mag > 100) {
        pointer.velocityX *= 100 / mag;
        pointer.velocityY *= 100 / mag;
      }
      pointer.isActive = true;
    });
    el.addEventListener('pointerleave', function () { pointer.isActive = false; });
    el.addEventListener('pointerenter', function () { pointer.isActive = true; });
  }

  // ===== RESIZE =====
  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = window.innerWidth;
      const h   = window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      initGrid(w, h);
    }, 100);
  }

  // ===== PUBLIC API =====
  window.waveGrid = {
    init: function (canvasElement) {
      canvas = canvasElement;
      ctx    = canvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      const w   = window.innerWidth;
      const h   = window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);

      initGrid(w, h);
      initPointer(canvas);
      window.addEventListener('resize', handleResize);
      requestAnimationFrame(animate);
    }
  };
})();
