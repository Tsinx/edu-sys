/* Original, deterministic motion design. One logical 1600 × 1000 canvas.
   The browser preview and the exported film use this exact renderer. */
(function (root) {
  'use strict';
  const WIDTH = 1600, HEIGHT = 1000, DURATION = 36, FPS = 30, BPM = 120;
  const C = { paper: '#fbf6e9', ink: '#161c23', blue: '#2151f5', lime: '#e4ef55', coral: '#ff745a', mint: '#a4dbc9' };
  const shots = [
    { id: 'one', from: 0, to: 2, text: 'ONE', description: 'A single circle opens into a huge, elastic ONE.' },
    { id: 'more', from: 2, to: 4, text: 'MORE', description: 'The circle becomes a plus; MORE expands across cobalt.' },
    { id: 'business', from: 4, to: 8, text: 'PRICE. COST. PROFIT.', description: 'Three economic quantities enter as distinct typographic compositions.' },
    { id: 'curve', from: 8, to: 12, text: 'EVERY DECISION HAS A CURVE.', description: 'A typographic line resolves into an illustrative profit curve.' },
    { id: 'rate', from: 12, to: 18, text: 'HOW FAST? RATE OF CHANGE. DERIVATIVE.', description: 'A secant approaches a tangent. Finite and local rates are labelled separately.' },
    { id: 'total', from: 18, to: 24, text: 'HOW MUCH? ACCUMULATED TOTAL. INTEGRAL.', description: 'Cash-flow rectangles refine into a shaded accumulation area.' },
    { id: 'calculus', from: 24, to: 28, text: 'CALCULUS. CHANGE + ACCUMULATION.', description: 'Type assembles from two directions; a moving plus connects the ideas.' },
    { id: 'question', from: 28, to: 36, text: 'Higher Mathematics: Calculus for Economics and Business. When does one more stop being worth it?', description: 'An eight-second, calmer course-title and question hold.' }
  ];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, p) => a + (b - a) * p;
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const smooth = v => { const p = clamp(v); return p * p * (3 - 2 * p); };
  const spring = v => 1 - Math.exp(-9 * clamp(v)) * Math.cos(11 * clamp(v));
  const profit = q => 40 * q - q * q;
  const marginalProfit = q => 40 - 2 * q;
  const cashFlow = t => 10 + 2 * t;
  const accumulation = t => 10 * t + t * t;
  const secant = h => h === 0 ? marginalProfit(10) : (profit(10 + h) - profit(10)) / h;
  let ctx, bounds;

  function rect(x, y, w, h, colour, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = colour; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function line(x1, y1, x2, y2, colour, width = 4, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = colour; ctx.lineWidth = width;
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function circle(x, y, r, colour, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = colour;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function plus(x, y, size, colour, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    rect(-size / 2, -size / 10, size, size / 5, colour);
    rect(-size / 10, -size / 2, size / 5, size, colour); ctx.restore();
  }
  function type(text, x, y, size, colour, options = {}) {
    const { align = 'left', max = WIDTH - 160, sx = 1, sy = 1, alpha = 1, rotation = 0, mono = false, math = false, essential = true } = options;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.font = math ? `italic ${size}px Georgia, "Times New Roman", serif` : mono ? `${size}px "Prelude Mono", monospace` : `${size}px "Prelude Black", "Arial Black", sans-serif`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = align; ctx.fillStyle = colour;
    const metrics = ctx.measureText(text), fit = Math.min(1, max / Math.max(1, metrics.width));
    ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(sx * fit, sy); ctx.fillText(text, 0, 0);
    // Audit settled, essential words; entering/leaving words and echoes are decorative.
    if (essential && alpha > 0.95 && rotation === 0) {
      const w = metrics.width * fit * sx;
      const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      bounds.push({ text, x: left, y: y - metrics.actualBoundingBoxAscent * sy, width: w,
        height: (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * sy });
    }
    ctx.restore();
  }
  function label(text, x, y, colour = C.ink, options = {}) { type(text, x, y, 24, colour, { mono: true, ...options }); }
  function frameLabel(number, title, colour = C.ink) {
    label(`0${number} / ${title}`, 80, 74, colour);
    label('HIGHER MATHEMATICS', 1520, 74, colour, { align: 'right' });
  }
  function grain(colour = C.ink, alpha = 0.06) {
    // Sparse fixed dot texture, rather than random noise that changes between renders.
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = colour;
    for (let y = 18; y < HEIGHT; y += 26) for (let x = 14 + (Math.floor(y / 26) % 2) * 13; x < WIDTH; x += 26) ctx.fillRect(x, y, 1, 1);
    ctx.restore();
  }
  function arrow(x, y, length, colour) {
    line(x, y, x + length, y, colour, 7);
    line(x + length - 18, y - 18, x + length, y, colour, 7);
    line(x + length - 18, y + 18, x + length, y, colour, 7);
  }
  function pill(text, x, y, w, colour, ink = C.ink) {
    rect(x, y, w, 62, colour); type(text, x + 22, y + 42, 25, ink, { mono: true, max: w - 44 });
  }
  function pathGraph(map, fn, end, colour, width = 8) {
    ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= 140; i++) { const p = map(i / 140 * end, fn(i / 140 * end)); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
    ctx.stroke();
  }
  function profitGraph(progress, { x = 730, y = 755, w = 770, h = 410, alpha = 1 } = {}) {
    const map = (q, p) => [x + q / 40 * w, y - p / 440 * h];
    ctx.save(); ctx.globalAlpha *= alpha;
    for (const value of [100, 200, 300, 400]) line(x, map(0, value)[1], x + w, map(0, value)[1], C.ink, 1, 0.12);
    line(x, y, x + w + 12, y, C.ink, 3); line(x, y, x, y - h - 12, C.ink, 3);
    label('profit (USD)', x, y - h - 33);
    label('output q (items)', x + w, y + 56, C.ink, { align: 'right' });
    for (const q of [0, 20, 40]) label(String(q), map(q, 0)[0], y + 29, C.ink, { align: 'center' });
    label('400', x - 15, map(0, 400)[1] + 8, C.ink, { align: 'right' });
    pathGraph(map, profit, 40 * clamp(progress), C.blue);
    ctx.restore(); return map;
  }

  function opening(t) {
    rect(0, 0, WIDTH, HEIGHT, C.paper); grain(); frameLabel(1, 'A SMALL CHANGE');
    const enter = spring(t / 0.5), settled = t > 0.5;
    circle(1270, 745, 120 * ease(t / 0.6), C.coral);
    for (let i = 3; i >= 1; i--) type('ONE', 800 - i * 21 * (1 - smooth(t / 1.1)), 660 + i * 16, 390, C.blue,
      { align: 'center', sx: 1.03, sy: 1 + 0.2 * (1 - smooth(t / 1.1)), alpha: 0.07 * i, essential: false });
    type('ONE', 800, mix(1050, 664, enter), 390, C.ink, { align: 'center', sx: 1.03, sy: mix(0.4, 1, enter), essential: settled });
    label('A COFFEE. A TICKET. AN EXTRA ITEM.', 80, 910, C.ink, { alpha: ease((t - 0.75) / 0.4) });
    if (t > 1.6) circle(1270, 745, 120 + 1620 * smooth((t - 1.6) / 0.4), C.blue);
  }
  function more(t) {
    rect(0, 0, WIDTH, HEIGHT, C.blue); frameLabel(1, 'A SMALL CHANGE', C.paper);
    plus(800, 482, 680 * (1 - ease(t / 0.75)), C.lime, Math.PI / 4 * (1 - ease(t / 0.8)));
    const p = spring((t - 0.2) / 0.6);
    type('MORE', 800, 665, 300, C.paper, { align: 'center', sx: mix(0.5, 1, p), sy: mix(1.9, 1, p), alpha: ease(t / 0.25), essential: t > 0.8 });
    plus(1395, 802, 128, C.lime, Math.PI / 2 * ease((t - 0.8) / 0.6));
    label('ONE MORE CAN CHANGE THE WHOLE PICTURE.', 80, 910, C.paper, { alpha: ease((t - 0.75) / 0.4) });
  }
  function businessWords(t) {
    const index = t < 1.25 ? 0 : t < 2.5 ? 1 : 2;
    const local = t - [0, 1.25, 2.5][index], p = spring(local / 0.4);
    const bg = [C.lime, C.coral, C.paper][index]; rect(0, 0, WIDTH, HEIGHT, bg); grain(); frameLabel(2, 'ECONOMICS + BUSINESS');
    if (index === 0) {
      rect(80, 245, 180, 515, C.ink);
      type('PRICE.', 340, mix(850, 656, p), 260, C.ink, { max: 1200, essential: local > 0.4 });
      label('WHAT DO WE CHARGE?', 345, 805);
    } else if (index === 1) {
      for (let i = 3; i >= 0; i--) type('COST.', 800, 370 + i * 145 + (1 - p) * (i % 2 ? -450 : 450), 200, i === 2 ? C.paper : C.ink,
        { align: 'center', max: 1250, alpha: i === 2 ? 1 : 0.16, essential: i === 2 && local > 0.4 });
      label('WHAT DOES IT TAKE?', 80, 910);
    } else {
      circle(1330, 292, 136, C.lime);
      type('PROFIT.', 800, 646, 252, C.ink, { align: 'center', max: 1440, sx: mix(0.7, 1, p), essential: local > 0.4 });
      arrow(85, 785, 1260 * ease(local / 0.8), C.blue);
      label('WHAT IS LEFT?', 80, 910);
    }
  }
  function curve(t) {
    rect(0, 0, WIDTH, HEIGHT, C.paper); grain(); frameLabel(3, 'FIND THE RELATIONSHIP');
    const p = smooth(t / 1.5), layout = smooth(t / 0.9), graph = smooth((t - 1.15) / 1.25);
    const shift = 150 * layout;
    type('EVERY', 80, 310 - shift, mix(154, 96, layout), C.ink);
    type('DECISION', 80, 510 - shift, mix(172, 128, layout), C.blue, { max: mix(1440, 650, layout) });
    type('HAS A', 84, 636 - shift, 66, C.ink, { alpha: ease((t - 0.2) / 0.4) });
    type('CURVE.', 80, 861 - shift, mix(205, 170, layout), C.ink, { max: 650, alpha: ease((t - 0.5) / 0.4) });
    if (graph > 0) {
      ctx.save(); ctx.globalAlpha = graph;
      const map = profitGraph(ease((t - 1.15) / 1.4), { x: 800, y: 780, w: 700, h: 390 });
      const q = mix(4, 28, p), pos = map(q, profit(q)); circle(...pos, 12, C.coral);
      ctx.restore();
      label('ILLUSTRATIVE MODEL · P(q) = 40q − q²', 80, 930, C.ink, { alpha: graph });
    }
  }
  function rate(t) {
    rect(0, 0, WIDTH, HEIGHT, C.paper); grain(); frameLabel(4, 'LOOK AT CHANGE');
    type('HOW', 80, 280, 138, C.ink);
    type('FAST?', 80, 455, 176, C.blue, { max: 610, sx: 1 + 0.025 * Math.exp(-t * 2) * Math.sin(t * 16) });
    const map = profitGraph(1, { x: 765, y: 735, w: 690, h: 400 });
    const h = t < 4.5 ? mix(12, 0.5, smooth(t / 4.5)) : 0;
    const p1 = map(10, profit(10)), p2 = map(10 + h, profit(10 + h));
    const slope = secant(h), left = 3, right = 28;
    const a = map(left, profit(10) + slope * (left - 10)), b = map(right, profit(10) + slope * (right - 10));
    line(...a, ...b, C.coral, 7);
    circle(...p1, 11, C.ink); if (h > 0) circle(...p2, 11, C.coral);
    if (h > 0) { line(p1[0], p1[1], p2[0], p1[1], C.ink, 2, 0.55); line(p2[0], p1[1], p2[0], p2[1], C.ink, 2, 0.55); }
    if (t < 4.5) {
      pill('AVERAGE RATE', 80, 580, 480, C.coral);
      type('ΔP / Δq', 80, 745, 95, C.ink, { math: true, max: 550 });
      label(`Δq = ${h.toFixed(1)} items`, 80, 805);
    } else {
      pill('LOCAL RATE', 80, 580, 480, C.blue, C.paper);
      type('P′(q)', 80, 745, 104, C.ink, { math: true, max: 550 });
      label('DERIVATIVE', 80, 805, C.blue);
    }
    label('ILLUSTRATIVE MODEL · P(q) = 40q − q²', 80, 930);
    label('RATE: USD PER ITEM', 1520, 930, C.ink, { align: 'right' });
  }
  function total(t) {
    rect(0, 0, WIDTH, HEIGHT, C.ink); grain(C.paper, 0.06); frameLabel(5, 'ADD UP CHANGE', C.paper);
    type('HOW', 80, 280, 138, C.paper);
    type('MUCH?', 80, 455, 166, C.lime, { max: 650 });
    const x = 790, y = 735, w = 680, h = 400;
    const map = (v, r) => [x + v / 6 * w, y - r / 24 * h];
    const end = mix(1, 6, smooth(t / 4.8));
    const n = t < 1.5 ? 6 : t < 3 ? 12 : t < 4.5 ? 24 : 48;
    for (const r of [10, 20]) line(x, map(0, r)[1], x + w, map(0, r)[1], C.paper, 1, 0.13);
    line(x, y, x + w + 12, y, C.paper, 3); line(x, y, x, y - h - 12, C.paper, 3);
    label('cash flow (USD/hour)', x, y - h - 33, C.paper);
    label('time t (hours)', x + w, y + 56, C.paper, { align: 'right' });
    for (const v of [0, 3, 6]) label(String(v), map(v, 0)[0], y + 29, C.paper, { align: 'center' });
    label('20', x - 15, map(0, 20)[1] + 8, C.paper, { align: 'right' });
    if (t < 4.5) {
      for (let i = 0; i < n; i++) {
        const q = i * 6 / n; if (q >= end) continue;
        const from = map(q, cashFlow(q));
        rect(from[0] + 1, from[1], Math.min(6 / n, end - q) / 6 * w - 2, y - from[1], C.mint, 0.85);
      }
    } else {
      ctx.fillStyle = C.mint; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i <= 80; i++) ctx.lineTo(...map(i / 80 * end, cashFlow(i / 80 * end)));
      ctx.lineTo(map(end, 0)[0], y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    pathGraph(map, cashFlow, 6, C.lime, 6);
    pill('ACCUMULATED TOTAL', 80, 580, 610, C.lime);
    // Keep the limits with the integral, instead of placing a misleading ∫ on a graph axis.
    type('∫', 84, 772, 152, C.paper, { math: true });
    type('6', 129, 662, 33, C.paper, { math: true }); type('0', 109, 804, 33, C.paper, { math: true });
    type('r(t) dt', 190, 741, 92, C.paper, { math: true, max: 485 });
    label('INTEGRAL', 80, 860, C.lime);
    label('ILLUSTRATIVE MODEL · r(t) = 10 + 2t', 80, 930, C.paper);
    label('TOTAL: USD', 1520, 930, C.paper, { align: 'right' });
  }
  function calculus(t) {
    rect(0, 0, WIDTH, HEIGHT, C.blue); frameLabel(6, 'CONNECT THE IDEAS', C.paper);
    const text = 'CALCULUS', size = 226;
    ctx.font = `${size}px "Prelude Black", "Arial Black", sans-serif`;
    const letters = [...text], widths = letters.map(c => ctx.measureText(c).width), width = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, 1430 / width); let x = (WIDTH - width * scale) / 2;
    letters.forEach((letter, i) => {
      const p = spring((t - i * 0.07) / 0.7), y = 570 + (1 - p) * (i % 2 ? -700 : 700);
      type(letter, x, y, size, C.paper, { sx: scale, essential: t > 1.2 }); x += widths[i] * scale;
    });
    const u = ease((t - 1) / 0.5);
    rect(90, 698, 550, 95, C.coral, u); type('CHANGE', 365, 765, 43, C.ink, { align: 'center', alpha: u });
    plus(800, 745, 74, C.lime, Math.PI / 2 * smooth((t - 1) / 0.75));
    rect(960, 698, 550, 95, C.mint, u); type('ACCUMULATION', 1235, 762, 38, C.ink, { align: 'center', alpha: u, max: 500 });
    label('MAKE THE CONNECTION. EXPLAIN THE DECISION.', 800, 908, C.paper, { align: 'center', alpha: u });
    if (t > 3.5) {
      const s = smooth((t - 3.5) / 0.5); rect(0, 1000 * (1 - s), WIDTH, 1000 * s, C.paper);
    }
  }
  function question(t) {
    rect(0, 0, WIDTH, HEIGHT, C.paper); grain();
    label('HIGHER MATHEMATICS', 80, 85, C.blue);
    type('CALCULUS', 80, 253, 162, C.ink, { max: 1200 });
    type('for Economics & Business', 84, 328, 54, C.ink, { max: 1280 });
    line(80, 384, 1520, 384, C.ink, 2);
    const p = ease(t / 0.8);
    type('When does', 80, 517 + 50 * (1 - p), 74, C.ink, { alpha: p });
    type('ONE MORE', 80, 704 + 50 * (1 - p), 170, C.blue, { alpha: p, max: 1300 });
    type('stop being worth it?', 84, 808 + 35 * (1 - p), 76, C.ink, { alpha: p, max: 1320 });
    circle(1403, 562, 113, C.lime); plus(1403, 562, 90, C.ink, Math.PI / 2 * smooth(t / 1.1));
    label('32 TEACHING HOURS · 16 LESSONS', 80, 930);
    label('JACQUES · 9TH EDITION', 1520, 930, C.ink, { align: 'right' });
  }
  function render(canvas, seconds) {
    ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw new Error('A 2D canvas is required.');
    const t = clamp(Number.isFinite(seconds) ? seconds : 0, 0, DURATION - 1 / FPS);
    bounds = []; ctx.save(); ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    if (t < 2) opening(t); else if (t < 4) more(t - 2); else if (t < 8) businessWords(t - 4);
    else if (t < 12) curve(t - 8); else if (t < 18) rate(t - 12); else if (t < 24) total(t - 18);
    else if (t < 28) calculus(t - 24); else question(t - 28);
    ctx.restore();
    return { time: t, shot: shots.find(s => t >= s.from && t < s.to).id, bounds: [...bounds] };
  }
  const api = Object.freeze({ WIDTH, HEIGHT, DURATION, FPS, BPM, colours: C, shots, render,
    model: Object.freeze({ profit, marginalProfit, secant, cashFlow, accumulation }) });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathPrelude = api;
})(typeof window !== 'undefined' ? window : this);
