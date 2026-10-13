/* DOM renderer: only public, currently revealed material enters the canvas. */
(function () {
  'use strict';
  const api = window.EconomicPrelude, ns = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const sv = (tag, attrs, text) => { const n = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text) n.textContent = text; return n; };
  function art(kind) {
    const s = sv('svg', { viewBox: '0 0 650 600', 'aria-hidden': 'true', class: 'geometry' });
    const path = (d, stroke = '#278b88', width = 3, fill = 'none') => s.append(sv('path', { d, stroke, 'stroke-width': width, fill }));
    const dot = (x, y, r = 9, color = '#e4653e') => s.append(sv('circle', { cx: x, cy: y, r, fill: color }));
    if (['orbit', 'rays', 'network', 'loop'].includes(kind)) {
      for (let i = 0; i < (kind === 'rays' ? 40 : 12); i++) {
        const angle = i / (kind === 'rays' ? 40 : 12) * Math.PI * 2, x = 325 + Math.cos(angle) * 230, y = 300 + Math.sin(angle) * 230;
        if (kind === 'network' || kind === 'rays') path(`M325 300L${x} ${y}`, '#8ca8a3', 1.7);
        if (kind !== 'rays') s.append(sv('ellipse', { cx: 325, cy: 300, rx: 240 - i * 13, ry: 220 - i * 9, transform: `rotate(${i * 11} 325 300)`, fill: 'none', stroke: i % 3 === 0 ? '#379e98' : '#b6c7bc', 'stroke-width': 2 }));
        dot(x, y, kind === 'rays' ? 6 : 4, '#5ba49a');
      }
      dot(480, 155, 25); dot(325, 300, 12);
    } else if (kind === 'limit') {
      path('M70 480H600M70 480V90', '#8ca8a3', 2);
      const f = x => 480 - 320 * (1 - Math.exp(-(x - 70) / 210));
      path(Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${80 + i * 5} ${f(80 + i * 5)}`).join(''));
      [100, 200, 300, 370, 410, 428].forEach((x, i) => dot(x, f(x), 9 - i * .6));
      s.append(sv('circle', { cx: 450, cy: f(450), r: 12, fill: '#f1ede3', stroke: '#e4653e', 'stroke-width': 4 }));
    } else if (kind === 'area') {
      path('M55 490H608', '#8ca8a3', 2);
      for (let i = 0; i < 24; i++) { const x = i / 24 * 8, h = (120 + 24 * x - 3 * x * x) * 1.5; s.append(sv('rect', { x: 66 + i * 21.5, y: 490 - h, width: 20, height: h, fill: i % 4 === 0 ? '#45ada3' : '#99c8bd' })); }
    } else if (kind === 'contour') {
      for (let level = 160; level <= 650; level += 35) { let d = ''; for (let x = 0; x <= 100; x++) { const r = (level - 40 * Math.sqrt(x)) / 30, y = r * r; if (r < 0 || y > 100) continue; d += `${d ? 'L' : 'M'}${55 + x * 5.4} ${540 - y * 4.8}`; } path(d, level % 2 ? '#97c8bf' : '#278b88', 2); }
      dot(400, 280, 17);
    } else if (kind === 'allocation' || kind === 'steps') {
      for (let i = 0; i < 100; i++) s.append(sv('rect', { x: 83 + i % 10 * 46, y: 65 + Math.floor(i / 10) * 46, width: 38, height: 38, fill: i < 64 ? '#46a79c' : '#d9b79a' }));
    } else if (kind === 'ninety-nine') {
      for (let i = 0; i < 100; i++) s.append(sv('rect', { x: 77 + i % 10 * 47, y: 66 + Math.floor(i / 10) * 47, width: 41, height: 41, fill: i === 99 ? '#e4653e' : '#548f88', opacity: i === 99 ? .25 : 1 }));
    } else {
      path('M65 500H603M65 500V90', '#96b0a8', 2);
      if (kind === 'family') for (let k = -2; k <= 2; k++) path(`M85 ${470 + k * 37} Q350 ${380 + k * 37} 580 ${160 + k * 37}`, k === 0 ? '#e4653e' : '#78aaa0', k === 0 ? 4 : 2);
      else {
        const f = x => 480 - .0013 * (x - 70) ** 2;
        path(Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${80 + i * 5} ${f(80 + i * 5)}`).join(''), '#278b88', 5);
        if (kind === 'derivative' || kind === 'marginal') { const slope = -.0026 * (340 - 70); path(`M180 ${f(340) + slope * (180 - 340)}L550 ${f(340) + slope * (550 - 340)}`, '#e4653e', 3); dot(340, f(340), 10); }
        else { [165, 400, 539].forEach(x => dot(x, f(x))); }
      }
    }
    return s;
  }
  function renderPage(index, step = 0, print = false) {
    const p = api.pages[index], frame = el('article', `slide layout-${p.layout}${p.special ? ' special' : ''}`);
    const head = el('header', 'slide-head'); head.append(el('span', '', '经济数学 / 第1讲'), el('span', '', p.section)); frame.append(head);
    if (p.layout === 'film') {
      if (print) { const img = el('img', 'film-poster'); img.src = 'poster.png?v=chromatic-motion-v2'; img.alt = '经济数学短片结尾'; frame.append(img); }
      else {
        const video = el('video', 'film'); video.controls = true; video.preload = 'metadata'; video.playsInline = true; video.poster = 'poster.png?v=chromatic-motion-v2'; video.src = 'economic-mathematics-prelude.mp4?v=chromatic-motion-v2'; video.setAttribute('aria-label', '90秒经济数学几何短片'); frame.append(video);
      }
      frame.append(el('h1', 'sr-only', p.title));
    } else {
      const main = el('div', 'slide-main');
      const title = el('h1', '', p.title); main.append(title);
      if (p.subtitle) main.append(el('p', 'subtitle', p.subtitle));
      if (p.layout === 'map') {
        const map = el('div', 'unit-map'); for (const u of api.units) { const item = el('div', 'map-node'); item.append(el('b', '', String(u.n).padStart(2, '0')), el('h2', '', u.title), el('p', '', `${u.hours}学时 · 第${u.lessons}讲`)); map.append(item); } main.append(map);
      }
      if (p.unit) { const u = api.units[p.unit - 1]; main.append(el('div', 'unit-label', `${String(u.n).padStart(2, '0')} / ${u.hours}学时 / 第${u.lessons}讲`)); }
      const content = el('div', 'page-content');
      if (p.visual) content.append(art(p.visual));
      if (p.lines) { const lines = el('div', 'statements'); for (const l of p.lines) lines.append(el('p', '', l)); content.append(lines); }
      if (p.items) { const items = el('div', 'items'); for (const [i, item] of p.items.entries()) { const row = el('div', 'item'); if (p.layout === 'sequence' || p.layout === 'brief') row.append(el('span', 'sequence-number', String(i + 1).padStart(2, '0'))); row.append(el('h2', '', item[0]), el('p', '', item[1])); if (p.layout === 'four') row.prepend(art(['orbit', 'function', 'area', 'contour'][i])); items.append(row); } content.append(items); }
      if (p.rows) { const table = el('table', 'ledger'); const thead = el('thead'), tr = el('tr'); for (const c of p.columns) tr.append(el('th', '', c)); thead.append(tr); table.append(thead); const tbody = el('tbody'); for (const row of p.rows) { const tr = el('tr'); for (const c of row) tr.append(el('td', '', c)); tbody.append(tr); } table.append(tbody); content.append(table); }
      if (p.options) { const opts = el('div', 'choices'); p.options.forEach((v, i) => opts.append(el('div', '', `${String.fromCharCode(65 + i)}  ${v}`))); content.append(opts); }
      main.append(content);
      if (p.reveals) {
        const answers = el('div', `reveals ${p.layout === 'derivation' ? 'math-steps' : ''}`), count = print ? p.reveals.length : api.clampStep(index, step);
        for (let i = 0; i < count; i++) answers.append(el('p', '', p.reveals[i]));
        if (count === p.reveals.length && p.conclusion) answers.append(el('p', 'conclusion', p.conclusion));
        main.append(answers);
      }
      frame.append(main);
    }
    const footer = el('footer', 'slide-foot'); footer.append(el('span', '', p.source ?? '经济数学 · 2026'), el('span', '', `${String(index + 1).padStart(2, '0')} / 40`)); frame.append(footer);
    return frame;
  }
  window.EconomicPreludeSlides = { renderPage };
})();
