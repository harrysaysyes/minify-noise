/**
 * Minify Noise — Wave Grid
 * Adapted from Minify Radio wave-grid.js.
 * Tuned for a meditative, sand-feel interaction.
 */

(function () {
  'use strict';

  const config = {
    xGap: 16,
    yGap: 26,
    xScale: 0.0016,
    yScale: 0.0012,
    speedX: 0.012,
    speedY: 0.007,
    angleGain: 3.5,
    waveAmpX: 0,
    waveAmpY: 9,
    influenceRadius: 300,
    cursorStrength: 1.6,
    velocityScale: 0.16,
    pointerLerp: 0.08,
    cursorXScale: 0.25,
    maxCursorMoveY: 26,
    tension: 0.010,  // barely-there spring — grooves fill back slowly
    friction: 0.62   // heavy damping — no oscillation, no bounce
  };

  const BACKGROUND = '#0a0a0a';
  const LINE_COLOR  = 'rgba(200, 185, 255, 0.065)';

  let canvas = null, ctx = null, time = 0, lastTime = 0;
  const grid = { points: [], rows: 0, cols: 0 };
  const pointer = { x: 0, y: 0, prevX: 0, prevY: 0, velocityX: 0, velocityY: 0, isActive: false };

  function initGrid(w, h) {
    grid.cols = Math.ceil(w / config.xGap) + 1;
    grid.rows = Math.ceil(h / config.yGap) + 1;
    grid.points = [];
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        grid.points.push({ baseX: col * config.xGap, baseY: row * config.yGap,
          currentX: 0, currentY: 0, cx: 0, cy: 0, cvx: 0, cvy: 0 });
      }
    }
  }

  function update(deltaTime) {
    time += deltaTime * 0.001;
    const dtSeconds = Math.max(1/120, Math.min(1/30, deltaTime / 1000));
    for (let i = 0; i < grid.points.length; i++) {
      const pt = grid.points[i];
      const t = config.angleGain * simplex.noise2D(
        pt.baseX * config.xScale + time * config.speedX,
        pt.baseY * config.yScale + time * config.speedY
      );
      if (pointer.isActive) {
        const dx = pt.baseX - pointer.x;
        const dy = pt.baseY - pointer.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const velMag = Math.sqrt(pointer.velocityX*pointer.velocityX + pointer.velocityY*pointer.velocityY);
        if (dist < config.influenceRadius) {
          const alignment = (dx*pointer.velocityX + dy*pointer.velocityY) / (velMag || 1);
          const alignFactor = Math.max(0, alignment / Math.max(dist, config.yGap * 0.5));
          const falloff = Math.pow(1 - dist / config.influenceRadius, 2);
          const impulse = falloff * alignFactor * config.cursorStrength;
          pt.cvx += pointer.velocityX * impulse * config.velocityScale;
          pt.cvy += pointer.velocityY * impulse * config.velocityScale;
        }
      }
      pt.cvx += (-pt.cx) * config.tension;
      pt.cvy += (-pt.cy) * config.tension;
      pt.cvx *= config.friction;
      pt.cvy *= config.friction;
      const dtScale = dtSeconds * 60;
      pt.cx = Math.max(-config.maxCursorMoveY, Math.min(config.maxCursorMoveY, pt.cx + pt.cvx * dtScale));
      pt.cy = Math.max(-config.maxCursorMoveY, Math.min(config.maxCursorMoveY, pt.cy + pt.cvy * dtScale));
      pt.currentX = pt.baseX + Math.cos(t) * config.waveAmpX + pt.cx * config.cursorXScale;
      pt.currentY = pt.baseY + Math.sin(t) * config.waveAmpY + pt.cy;
    }
  }

  function draw(context) {
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = LINE_COLOR;
    context.lineWidth = 1;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    for (let row = 0; row < grid.rows; row++) {
      context.beginPath();
      context.moveTo(grid.points[row * grid.cols].currentX, grid.points[row * grid.cols].currentY);
      for (let col = 1; col < grid.cols; col++) {
        const pt = grid.points[row * grid.cols + col];
        context.lineTo(pt.currentX, pt.currentY);
      }
      context.stroke();
    }
  }

  function animate(now) {
    if (lastTime === 0) lastTime = now;
    update(now - lastTime);
    lastTime = now;
    draw(ctx);
    requestAnimationFrame(animate);
  }

  function initPointer(el) {
    el.addEventListener('pointermove', function (e) {
      const rect = el.getBoundingClientRect();
      pointer.prevX = pointer.x; pointer.prevY = pointer.y;
      pointer.x += (e.clientX - rect.left - pointer.x) * config.pointerLerp;
      pointer.y += (e.clientY - rect.top  - pointer.y) * config.pointerLerp;
      pointer.velocityX = pointer.x - pointer.prevX;
      pointer.velocityY = pointer.y - pointer.prevY;
      const mag = Math.sqrt(pointer.velocityX*pointer.velocityX + pointer.velocityY*pointer.velocityY);
      if (mag > 100) { pointer.velocityX *= 100/mag; pointer.velocityY *= 100/mag; }
      pointer.isActive = true;
    });
    el.addEventListener('pointerleave', function () { pointer.isActive = false; });
    el.addEventListener('pointerenter', function () { pointer.isActive = true; });
  }

  let resizeTimer;
  window.waveGrid = {
    init: function (canvasElement) {
      canvas = canvasElement;
      ctx = canvas.getContext('2d');
      function applySize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth, h = window.innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);
        initGrid(w, h);
      }
      applySize();
      initPointer(canvas);
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applySize, 100);
      });
      requestAnimationFrame(animate);
    }
  };
})();
