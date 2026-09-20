/* XunZi-PD — candidate shortlist.
 *
 * Pure browser-local state. It is the reader's own working list: it writes nothing back
 * to outputs/app_data/, changes no rank, score or threshold, and is not part of the
 * reconstruction. Clearing it or losing localStorage simply empties the list.
 *
 * Stored as node_index values, so every exported row can be re-resolved against the
 * frozen data rather than against a copy that could drift.
 */
const Shortlist = (() => {
  const KEY = 'xz.shortlist.v2';       // v2 adds a per-entry review state and note
  const LEGACY = 'xz.shortlist.v1';
  let items = [];                       // [{ i, state, note }]
  const subs = new Set();

  /* Review states are the READER's own bookkeeping. They record what the reader intends
   * to do next — they are not findings, they do not change any ranking, and the app never
   * reads them back into anything scientific. */
  const STATES = ['unreviewed', 'keep', 'lit', 'pathway', 'validation', 'lower'];

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed
          .filter(x => x && Number.isInteger(x.i) && x.i >= 0)
          .map(x => ({ i: x.i, state: STATES.includes(x.state) ? x.state : 'unreviewed',
                       note: typeof x.note === 'string' ? x.note.slice(0, 2000) : '' }));
      }
    } else {
      // Migrate a v1 list (bare node indices). Unknown fields default; nothing is lost.
      const old = localStorage.getItem(LEGACY);
      if (old) {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed)) {
          items = parsed.filter(v => Number.isInteger(v) && v >= 0)
            .map(i => ({ i, state: 'unreviewed', note: '' }));
        }
      }
    }
  } catch (e) { items = []; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ }
  }
  function notify() { subs.forEach(fn => { try { fn(items.slice()); } catch (e) {} }); }

  const has = (i) => items.some(x => x.i === i);
  const size = () => items.length;
  const all = () => items.map(x => x.i);
  const entry = (i) => items.find(x => x.i === i) || null;

  function add(i) {
    if (!Number.isInteger(i) || i < 0 || has(i)) return false;
    items.push({ i, state: 'unreviewed', note: '' }); persist(); notify(); return true;
  }
  function remove(i) {
    const k = items.findIndex(x => x.i === i);
    if (k < 0) return false;
    items.splice(k, 1); persist(); notify(); return true;
  }
  function toggle(i) { return has(i) ? (remove(i), false) : (add(i), true); }
  function clear() { items = []; persist(); notify(); }

  /** Set the reader's review state for one entry. */
  function setState(i, state) {
    const e = entry(i);
    if (!e || !STATES.includes(state)) return false;
    e.state = state; persist(); notify(); return true;
  }
  function setNote(i, note) {
    const e = entry(i);
    if (!e) return false;
    e.note = String(note || '').slice(0, 2000); persist(); notify(); return true;
  }
  const counts = () => STATES.reduce((acc, s) => {
    acc[s] = items.filter(x => x.state === s).length; return acc;
  }, {});

  /** Rows for the shortlist table, resolved against the frozen data. */
  function rows() {
    if (typeof DataService === 'undefined') return [];
    return items.map(x => DataService.get_gene_detail(x.i)).filter(Boolean);
  }
  /** Rows paired with their reader-owned state. */
  function entries() {
    if (typeof DataService === 'undefined') return [];
    return items.map(x => ({ ...x, g: DataService.get_gene_detail(x.i) })).filter(x => x.g);
  }

  const CSV_HEADER = [
    'node_index', 'gene_symbol', 'gene_id', 'mouse_gene_id',
    'primary_log2FC', 'primary_FDR', 'STAT_reported_rank', 'RWR_reported_rank',
    'graph_degree', 'validation_log2FC', 'validation_FDR',
    'analysis_eligible_primary', 'analysis_eligible_validation',
    'review_state', 'notes',
  ];

  const cell = v => (v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)))
    ? 'NA' : String(v);

  /**
   * Export as CSV. The two preamble comment lines are not decoration: a shortlist that
   * leaves this app must carry the statement that it is the reader's own exploratory
   * list and not a validated target set.
   */
  function toCSV() {
    const notes = (typeof I18N !== 'undefined' && I18N.getLang() === 'zh')
      ? '# 用户自建的探索性候选清单。'
      : '# User-generated exploratory shortlist.';
    const lines = [
      notes,
      '# Not a validated therapeutic-target list. Ranks are the authoritative reported_rank values.',
      CSV_HEADER.join(','),
    ];
    entries().forEach(({ g, state, note }) => {
      lines.push([
        g.i, g.symbol || '', g.gene_id, g.mouse || '',
        cell(g.lp), cell(g.fp), cell(g.statRank), cell(g.rwrRank),
        g.degree, cell(g.lv), cell(g.fv),
        g.eligP ? 'TRUE' : 'FALSE', g.eligV ? 'TRUE' : 'FALSE',
        state || 'unreviewed', note || '',
      ].map(v => {
        const s = cell(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
    });
    return lines.join('\n') + '\n';
  }

  function filename() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `xunzi-pd-shortlist-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
      + `-${p(d.getHours())}${p(d.getMinutes())}.csv`;
  }

  /** Browser download. Uses a Blob URL; no server round trip, nothing written to disk
   *  until the user's own browser saves it. */
  function download() {
    const blob = new Blob([toCSV()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

  /** "Add to shortlist" / "In shortlist" button markup for a gene row. */
  function button(i, { compact = false } = {}) {
    const on = has(i);
    const zh = (typeof I18N !== 'undefined' && I18N.getLang() === 'zh');
    const label = on ? (zh ? '✓ 已加入候选清单' : '✓ In shortlist')
                     : (zh ? '+ 加入候选清单' : '+ Add to shortlist');
    return `<button type="button" class="slBtn${on ? ' on' : ''}" data-sl="${i}"`
      + ` aria-pressed="${on}" aria-label="${escAttr(label)}"`
      + `${compact ? ' data-compact="1"' : ''}>${escAttr(label)}</button>`;
  }

  const escAttr = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /** Wire any [data-sl] buttons inside `root` (delegated, so re-renders are covered). */
  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-sl]').forEach(btn => {
      if (btn.__slBound) return;
      btn.__slBound = true;
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const i = Number(btn.dataset.sl);
        const now = has(i) ? (remove(i), false) : (add(i), true);
        const zh = I18N.getLang() === 'zh';
        btn.textContent = now ? (zh ? '✓ 已加入候选清单' : '✓ In shortlist')
                              : (zh ? '+ 加入候选清单' : '+ Add to shortlist');
        btn.classList.toggle('on', now);
        btn.setAttribute('aria-pressed', String(now));
      });
    });
  }

  return { add, remove, toggle, clear, has, size, all, rows, entries, entry,
           setState, setNote, counts, STATES,
           toCSV, download, filename, subscribe, button, bind,
           CSV_HEADER, STORAGE_KEY: KEY, LEGACY_KEY: LEGACY };
})();
