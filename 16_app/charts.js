/* Hand-rolled SVG charts — no external libraries, no CDN, works offline. */
const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a = {}) => { const e = document.createElementNS(NS, n);
    for (const k in a) e.setAttribute(k, a[k]); return e; };
  // Identifiers reach a tooltip through innerHTML; escape them at the source.
  const esc = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 3) => (v === null || v === undefined || Number.isNaN(v)) ? 'NA' : (+v).toFixed(d);
  // DESeq2 p-values/FDRs are often far below 1e-3; fixed-point would render them as 0.000.
  const pv = v => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'NA';
    v = +v;
    if (v === 0) return '0';
    if (v < 1e-3) return v.toExponential(2);
    return v.toFixed(4);
  };

  let TIP = null;
  function tip() {
    if (!TIP) { TIP = document.createElement('div'); TIP.className = 'tip'; TIP.style.display = 'none';
      document.body.appendChild(TIP); }
    return TIP;
  }
  function attachTip(target, html) {
    target.addEventListener('mousemove', e => {
      const t = tip(); t.innerHTML = html; t.style.display = 'block';
      t.style.left = Math.min(e.clientX + 14, window.innerWidth - 345) + 'px';
      t.style.top = Math.max(8, e.clientY - 12) + 'px';
    });
    target.addEventListener('mouseleave', () => { tip().style.display = 'none'; });
  }

  /* Compact axis label for a tick: keeps 3 significant digits without exponent soup. */
  function tickLabel(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1000) return (v / 1000).toFixed(a % 1000 === 0 ? 0 : 1) + 'k';
    if (a >= 1) return String(Math.round(v * 10) / 10);
    if (a >= 0.01) return v.toFixed(2);
    return v.toExponential(1);
  }

  /** "Nice" tick values spanning [lo, hi], roughly `count` of them. */
  function ticks(lo, hi, count = 5) {
    if (!isFinite(lo) || !isFinite(hi) || lo === hi) return [lo];
    const raw = (hi - lo) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(v);
    return out;
  }

  function axes(svg, W, H, pad, xlab, ylab, sx = null, sy = null) {
    const g = el('g');
    g.appendChild(el('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b,
      stroke: '#33404f' }));
    g.appendChild(el('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b,
      stroke: '#33404f' }));

    // Numeric ticks. Without these the axes are unreadable: a reader can see that two
    // points differ but not by how much.
    if (sx) {
      ticks(sx.lo, sx.hi).forEach(v => {
        const x = sx.at(v);
        if (x < pad.l - 0.5 || x > W - pad.r + 0.5) return;
        g.appendChild(el('line', { x1: x, y1: H - pad.b, x2: x, y2: H - pad.b + 5,
          stroke: '#33404f' }));
        const t = el('text', { x, y: H - pad.b + 17, fill: '#8b98a5', 'font-size': 10,
          'text-anchor': 'middle' });
        t.textContent = tickLabel(v);
        g.appendChild(t);
      });
    }
    if (sy) {
      ticks(sy.lo, sy.hi).forEach(v => {
        const y = sy.at(v);
        if (y < pad.t - 0.5 || y > H - pad.b + 0.5) return;
        g.appendChild(el('line', { x1: pad.l - 5, y1: y, x2: pad.l, y2: y, stroke: '#33404f' }));
        g.appendChild(el('line', { x1: pad.l, y1: y, x2: W - pad.r, y2: y,
          stroke: '#1c2330', 'stroke-width': 1 }));
        const t = el('text', { x: pad.l - 9, y: y + 3.5, fill: '#8b98a5', 'font-size': 10,
          'text-anchor': 'end' });
        t.textContent = tickLabel(v);
        g.appendChild(t);
      });
    }

    const xt = el('text', { x: (pad.l + W - pad.r) / 2, y: H - 6, fill: '#8b98a5',
      'font-size': 11, 'text-anchor': 'middle' }); xt.textContent = xlab; g.appendChild(xt);
    // Rotated along the left edge. Drawn horizontally above the plot it collided with
    // the chart title on every figure.
    const yt = el('text', { x: 12, y: (pad.t + H - pad.b) / 2, fill: '#8b98a5',
      'font-size': 11, 'text-anchor': 'middle',
      transform: `rotate(-90 12 ${(pad.t + H - pad.b) / 2})` });
    yt.textContent = ylab; g.appendChild(yt);
    svg.appendChild(g);
  }

  /** A fixed 440px chart inside a 390px column is a cramped square. Scale the drawing
   *  height to the space it actually has, but never below what the axes need. */
  function fitH(host, H, min = 240) {
    const w = host.clientWidth || 640;
    return w < 520 ? Math.max(min, Math.round(H * (0.72 + 0.28 * (w / 520)))) : H;
  }

  /**
   * Make an SVG shape activate on click and on Enter/Space.
   *
   * `tabstop` defaults to true, but a dense point cloud must NOT use it: a 12,577-point
   * scatter with tabindex on every circle is 12,577 tab stops, which is worse than no
   * keyboard support at all. Dense marks are passed `{tabstop:false, hidden:true}` —
   * mouse/touch still work, the container carries one role="img" summary, and the
   * accessible route to the same genes is the table and the search box.
   */
  function interactive(node, label, onActivate, { tabstop = true, hidden = false } = {}) {
    node.classList.add('chartClickable');
    if (tabstop) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', label);
    } else {
      node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      if (!hidden) node.setAttribute('role', 'button');
    }
    node.addEventListener('click', () => onActivate());
    if (tabstop) {
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          onActivate();
        }
      });
    }
    return node;
  }

  /* ---------- volcano ---------- */
  function volcano(host, pts, { W = 660, H = 420, title = '', onSelect = null, highlight = null } = {}) {
    const hl = highlight;
    host.innerHTML = '';
    H = fitH(host, H, 300);
    const pad = { l: 52, r: 16, t: title ? 34 : 14, b: 42 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    if (title) { const t = el('text', { x: 12, y: 20, fill: '#e6edf3', 'font-size': 13,
      'font-weight': 600 }); t.textContent = title; svg.appendChild(t); }
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const xm = Math.max(1, Math.max(...xs.map(Math.abs)));
    const ym = Math.max(1, Math.max(...ys));
    const X = v => pad.l + (v + xm) / (2 * xm) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v / ym) * (H - pad.t - pad.b);
    axes(svg, W, H, pad, 'shrunken log2 fold change (case / control)', '-log10 p-value',
         { lo: -xm, hi: xm, at: X }, { lo: 0, hi: ym, at: Y });
    // zero line
    svg.appendChild(el('line', { x1: X(0), y1: pad.t, x2: X(0), y2: H - pad.b,
      stroke: '#33404f', 'stroke-dasharray': '3 3' }));
    pts.forEach(p => {
      const on = hl && p.i !== undefined && hl.has(p.i);
      const c = el('circle', { cx: X(p.x), cy: Y(p.y), r: on ? (p.r || 2.1) + 3.4 : (p.r || 2.1),
        fill: on ? '#e3b341' : p.color, opacity: on ? 1 : (p.opacity ?? 0.62),
        stroke: on ? '#fff' : 'none', 'stroke-width': on ? 1.2 : 0 });
      c.classList.add('pt');
      if (p.tip) attachTip(c, p.tip);
      if (p.i !== undefined && onSelect) {
        interactive(c, p.aria || `point at ${fmt(p.x, 2)}, ${fmt(p.y, 2)}`,
                    () => onSelect(p.i), { tabstop: false, hidden: true });
      } else {
        c.setAttribute('aria-hidden', 'true');
      }
      svg.appendChild(c);
    });
    host.appendChild(svg);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label',
      `${title || 'volcano plot'}: ${pts.length} points. ${pointsSummary(pts)}`);
  }

  /** Screen-reader summary of a dense scatter — a plot with 12k unlabelled circles is
   *  otherwise a blank rectangle to assistive tech. */
  function pointsSummary(pts) {
    if (!pts.length) return 'No points.';
    const xs = pts.map(p => p.x).filter(Number.isFinite);
    const ys = pts.map(p => p.y).filter(Number.isFinite);
    return `x from ${fmt(Math.min(...xs), 2)} to ${fmt(Math.max(...xs), 2)}; `
         + `y from ${fmt(Math.min(...ys), 2)} to ${fmt(Math.max(...ys), 2)}.`;
  }

  /* ---------- histogram ---------- */
  function histogram(host, vals, { W = 620, H = 300, bins = 60, title = '', color = '#4c9aff' } = {}) {
    host.innerHTML = '';
    H = fitH(host, H, 230);
    const pad = { l: 50, r: 16, t: title ? 34 : 14, b: 40 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    if (title) { const t = el('text', { x: 12, y: 20, fill: '#e6edf3', 'font-size': 13,
      'font-weight': 600 }); t.textContent = title; svg.appendChild(t); }
    if (!vals.length) { host.appendChild(svg); return; }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const w = (hi - lo) / bins || 1;
    const counts = new Array(bins).fill(0);
    vals.forEach(v => { let b = Math.floor((v - lo) / w); if (b >= bins) b = bins - 1; if (b < 0) b = 0; counts[b]++; });
    const cmax = Math.max(...counts);
    const X = i => pad.l + i / bins * (W - pad.l - pad.r);
    const Y = c => H - pad.b - (c / cmax) * (H - pad.t - pad.b);
    axes(svg, W, H, pad, 'log2 fold change', 'gene count',
         { lo, hi, at: v => X(bins * (v - lo) / ((hi - lo) || 1)) },
         { lo: 0, hi: cmax, at: Y });
    counts.forEach((c, i) => {
      const bw = (W - pad.l - pad.r) / bins - 1;
      const r = el('rect', { x: X(i), y: Y(c), width: Math.max(1, bw), height: Math.max(0, H - pad.b - Y(c)),
        fill: color, opacity: 0.8 });
      r.classList.add('pt');
      attachTip(r, `<b>${(lo + i * w).toFixed(2)} .. ${(lo + (i + 1) * w).toFixed(2)}</b><br>${c} genes`);
      svg.appendChild(r);
    });
    svg.appendChild(el('line', { x1: X(bins * (0 - lo) / (hi - lo)), y1: pad.t,
      x2: X(bins * (0 - lo) / (hi - lo)), y2: H - pad.b, stroke: '#8b98a5',
      'stroke-dasharray': '3 3' }));
    host.appendChild(svg);
  }

  /* ---------- generic scatter ---------- */
  function scatter(host, pts, { W = 660, H = 440, xlab = '', ylab = '', title = '',
                               color = '#4c9aff', diag = false,
                               onSelect = null, highlight = null } = {}) {
    const hl = highlight;
    host.innerHTML = '';
    H = fitH(host, H, 300);
    const pad = { l: 58, r: 18, t: title ? 34 : 14, b: 44 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    if (title) { const t = el('text', { x: 12, y: 20, fill: '#e6edf3', 'font-size': 13,
      'font-weight': 600 }); t.textContent = title; svg.appendChild(t); }
    if (!pts.length) { host.appendChild(svg); return; }
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const X = v => pad.l + (v - x0) / ((x1 - x0) || 1) * (W - pad.l - pad.r);
    const Y = v => H - pad.b - (v - y0) / ((y1 - y0) || 1) * (H - pad.t - pad.b);
    axes(svg, W, H, pad, xlab, ylab, { lo: x0, hi: x1, at: X }, { lo: y0, hi: y1, at: Y });
    if (diag) {
      svg.appendChild(el('line', { x1: X(x0), y1: Y(x0), x2: X(x1), y2: Y(x1),
        stroke: '#33404f', 'stroke-dasharray': '4 4' }));
      svg.appendChild(el('line', { x1: X(x0), y1: Y(-(x0)), x2: X(x1), y2: Y(-(x1)),
        stroke: '#33404f', 'stroke-dasharray': '4 4', opacity: .5 }));
    }
    svg.appendChild(el('line', { x1: X(x0), y1: Y(0), x2: X(x1), y2: Y(0), stroke: '#2a3441' }));
    svg.appendChild(el('line', { x1: X(0), y1: pad.t, x2: X(0), y2: H - pad.b, stroke: '#2a3441' }));
    pts.forEach(p => {
      const on = hl && p.i !== undefined && hl.has(p.i);
      const c = el('circle', { cx: X(p.x), cy: Y(p.y), r: on ? (p.r || 2.2) + 4 : (p.r || 2.2),
        fill: on ? '#e3b341' : (p.color || color), opacity: on ? 1 : (p.opacity ?? 0.6),
        stroke: on ? '#fff' : 'none', 'stroke-width': on ? 1.3 : 0 });
      c.classList.add('pt');
      if (p.tip) attachTip(c, p.tip);
      if (p.i !== undefined && onSelect) {
        interactive(c, p.aria || `point at ${fmt(p.x, 3)}, ${fmt(p.y, 3)}`,
                    () => onSelect(p.i), { tabstop: false, hidden: true });
      } else {
        c.setAttribute('aria-hidden', 'true');
      }
      svg.appendChild(c);
    });
    host.appendChild(svg);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', `${title || 'scatter plot'}: ${pts.length} points. ${pointsSummary(pts)}`);
  }

  /* ---------- network ---------- */
  function network(host, net, { W = 900, H = 620, onSelect = null } = {}) {
    host.innerHTML = '';
    if (!net) return;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    const cx = W / 2, cy = H / 2;
    const maxHop = net.hops;
    const byHop = new Map();
    net.nodes.forEach(n => { if (!byHop.has(n.hop)) byHop.set(n.hop, []); byHop.get(n.hop).push(n); });
    const R = h => (h === 0 ? 0 : (h / maxHop) * (Math.min(W, H) / 2 - 78));
    const pos = new Map();
    byHop.forEach((list, h) => {
      list.sort((a, b) => (b.degree - a.degree) || String(a.symbol).localeCompare(String(b.symbol)));
      list.forEach((n, k) => {
        if (h === 0) { pos.set(n.i, { x: cx, y: cy }); return; }
        const a = (k / list.length) * Math.PI * 2 - Math.PI / 2;
        pos.set(n.i, { x: cx + R(h) * Math.cos(a), y: cy + R(h) * Math.sin(a) });
      });
    });
    const maxDeg = Math.max(1, ...net.nodes.map(n => n.degree));
    const classOf = n => n.i === net.center.i ? 'center'
                        : (n.hop === 1 ? 'hop1' : 'hop2');
    net.edges.forEach(e => {
      const a = pos.get(e.u), b = pos.get(e.v);
      if (!a || !b) return;
      svg.appendChild(el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'edge',
        stroke: '#39506e', 'stroke-width': Math.max(.6, e.w * 2.6), opacity: .55 }));
    });
    // Roving tabindex: ~30 nodes for a 1-hop is workable one-at-a-time, 2,273 is not.
    // Exactly one node is a tab stop; the arrow keys move it, Enter re-centres.
    const order = net.nodes.slice().sort((a, b) => a.hop - b.hop || b.degree - a.degree);
    const circles = [];
    order.forEach(n => {
      const p = pos.get(n.i);
      const r = 4 + 11 * Math.sqrt(n.degree / maxDeg);
      const c = el('circle', { cx: p.x, cy: p.y, r, class: `node ${classOf(n)}`,
        fill: n.i === net.center.i ? '#e3b341' : (n.hop === 1 ? '#4c9aff' : '#38d39f'),
        stroke: '#0e1116', 'stroke-width': 1.4, opacity: .95 });
      const label = `${n.symbol || n.gene_id}, degree ${n.degree}, ${n.hop}-hop, `
        + `STAT rank ${n.statRank ?? 'NA'}, RWR rank ${n.rwrRank ?? 'NA'}`;
      attachTip(c, `<b class="notranslate" translate="no">${esc(n.symbol || n.gene_id)}</b>`
        + `<br><span class="mono notranslate" translate="no">${esc(n.gene_id)}</span><br>` +
        `degree ${n.degree} · hop ${n.hop}<br>STAT rank ${n.statRank ?? 'NA'}<br>` +
        `RWR rank ${n.rwrRank ?? 'NA'}<br>log2FC ${fmt(n.lp, 4)}<br>FDR ${fmt(n.fp, 4)}`);
      interactive(c, label, () => {
        onSelect ? onSelect(n.i) : (location.hash = '#gene/' + n.i);
      }, { tabstop: false, hidden: true });
      c.dataset.idx = String(circles.length);
      c.setAttribute('tabindex', '-1');
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', label);
      c.addEventListener('keydown', e => {
        const k = Number(c.dataset.idx);
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const nx = circles[(k + step + circles.length) % circles.length];
        if (nx) { nx.setAttribute('tabindex', '0'); c.setAttribute('tabindex', '-1'); nx.focus(); }
      });
      circles.push(c);
      svg.appendChild(c);
      if (n.degree === 0) {
        const t = el('text', { x: p.x, y: p.y + 3, fill: '#0e1116', 'font-size': 10,
          'text-anchor': 'middle', 'font-weight': 700 }); t.textContent = '0';
        svg.appendChild(t);
      }
      if (n.i === net.center.i || n.hop <= 1) {
        const t = el('text', { x: p.x, y: p.y - r - 5, fill: '#c9d5e3', 'font-size': 10,
          'text-anchor': 'middle', class: 'notranslate' });
        t.textContent = n.symbol || n.gene_id;
        svg.appendChild(t);
      }
    });
    if (circles.length) circles[0].setAttribute('tabindex', '0');   // single tab stop
    host.appendChild(svg);
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label',
      `Network around ${net.center.symbol || net.center.gene_id}: `
      + `${net.nodes.length} nodes, ${net.edges.length} edges drawn, ${net.hops}-hop.`);
    const zh = I18N.getLang() === 'zh';
    const lg = document.createElement('div');
    lg.className = 'legend';
    lg.innerHTML = `<span><i style="background:#e3b341"></i>${zh ? '当前基因' : 'queried gene'}</span>
      <span><i style="background:#4c9aff"></i>1-hop</span>
      <span><i style="background:#38d39f"></i>2-hop</span>
      <span>${zh ? '节点大小 ∝ √degree · 边宽 ∝ 权重' : 'node size ∝ √degree · edge width ∝ weight'}</span>
      <span>${zh ? '用 Tab 选中节点，回车以它为中心重绘' : 'Tab to a node, Enter to re-centre'}</span>`;
    host.appendChild(lg);
  }

  /* ---------- top-k overlap bars ---------- */
  function topkBar(host, rows, { W = 520, H = 220, title = '' } = {}) {
    host.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H });
    if (title) { const t = el('text', { x: 12, y: 18, fill: '#e6edf3', 'font-size': 13,
      'font-weight': 600 }); t.textContent = title; svg.appendChild(t); }
    const x0 = 52, x1 = W - 130;
    const y0 = 34, h = (H - y0 - 22) / rows.length;
    // 0% and 100% guides: without them a 10% bar and a 90% bar look like the same shape.
    [0, 0.5, 1].forEach(f => {
      const x = x0 + (x1 - x0) * f;
      svg.appendChild(el('line', { x1: x, y1: y0 - 6, x2: x, y2: H - 22,
        stroke: f === 0 ? '#33404f' : '#1c2330' }));
      const t = el('text', { x, y: H - 12, fill: '#8b98a5', 'font-size': 10, 'text-anchor': 'middle' });
      t.textContent = `${f * 100}%`;
      svg.appendChild(t);
    });
    rows.forEach((r, i) => {
      const y = y0 + i * h;
      const full = x1 - x0;
      const frac = r.overlap / r.k;
      const lab = el('text', { x: 12, y: y + 12, fill: '#8b98a5', 'font-size': 11 });
      lab.textContent = `k=${r.k}`;
      svg.appendChild(lab);
      svg.appendChild(el('rect', { x: x0, y: y + 2, width: full, height: h - 10,
        fill: '#1c2330', rx: 4 }));
      const bar = svg.appendChild(el('rect', { x: x0, y: y + 2, width: full * frac,
        height: h - 10, fill: '#4c9aff', rx: 4, opacity: .85 }));
      bar.classList.add('pt');
      attachTip(bar, `<b>top-${r.k} overlap</b><br>${r.overlap} of ${r.k} shared `
        + `(${(frac * 100).toFixed(1)}%)`);
      const t = el('text', { x: x1 + 10, y: y + 12, fill: '#c9d5e3', 'font-size': 11,
        'font-family': 'var(--mono)' });
      t.textContent = `${r.overlap}/${r.k}  (${(frac * 100).toFixed(0)}%)`;
      svg.appendChild(t);
    });
    host.appendChild(svg);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', `${title}: `
      + rows.map(r => `top-${r.k} ${r.overlap} of ${r.k}`).join('; '));
  }

  return { volcano, histogram, scatter, network, topkBar, fmt, pv, attachTip, ticks };
})();
