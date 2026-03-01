/**
 * Simplex Noise Implementation
 * Based on Stefan Gustavson's implementation
 */

const simplex = (function () {
  'use strict';

  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  const p = [];
  for (let i = 0; i < 256; i++) p[i] = Math.floor(Math.random() * 256);

  const perm = [];
  const permMod12 = [];
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }

  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  function dot(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }

  function noise2D(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = permMod12[ii + perm[jj]];
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 < 0) { n0 = 0; } else { t0 *= t0; n0 = t0 * t0 * dot(grad3[gi0], x0, y0, 0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 < 0) { n1 = 0; } else { t1 *= t1; n1 = t1 * t1 * dot(grad3[gi1], x1, y1, 0); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 < 0) { n2 = 0; } else { t2 *= t2; n2 = t2 * t2 * dot(grad3[gi2], x2, y2, 0); }
    return 70.0 * (n0 + n1 + n2);
  }

  return { noise2D: noise2D };
})();
