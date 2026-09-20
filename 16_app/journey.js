/* XunZi-PD — candidate review journey (v1.8).
 *
 * Tracks which evidence surfaces the reader has looked at for a given gene, so a
 * beginner never has to remember where they have been. It is the READER's progress,
 * not the gene's status: every box ticked means "you looked at this", never "this gene
 * passed". Nothing here is scientific and nothing leaves the browser.
 */
const Journey = (() => {
  const KEY = 'xz.journey.v1';

  /** The six surfaces, in the order the guided path visits them. */
  const STEPS = ['expression', 'ranking', 'network', 'pairs', 'pathways', 'pd', 'research'];

  let DATA = {};          // { [node_index]: { [step]: true } }
  const subs = new Set();

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(k => {
          if (!/^\d+$/.test(k)) return;
          const seen = parsed[k];
          if (seen && typeof seen === 'object') {
            DATA[k] = {};
            STEPS.forEach(s => { if (seen[s] === true) DATA[k][s] = true; });
          }
        });
      }
    }
  } catch (e) { DATA = {}; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(DATA)); } catch (e) { /* private mode */ }
  }
  function notify() { subs.forEach(fn => { try { fn(); } catch (e) {} }); }

  const seen = (i, step) => !!(DATA[i] && DATA[i][step]);

  function mark(i, step) {
    if (!Number.isInteger(i) || !STEPS.includes(step)) return false;
    if (seen(i, step)) return false;
    DATA[i] = DATA[i] || {};
    DATA[i][step] = true;
    persist(); notify();
    return true;
  }
  function unmark(i, step) {
    if (!seen(i, step)) return false;
    delete DATA[i][step];
    persist(); notify();
    return true;
  }
  function toggle(i, step) { return seen(i, step) ? (unmark(i, step), false) : (mark(i, step), true); }
  function clearGene(i) { if (DATA[i]) { delete DATA[i]; persist(); notify(); } }
  function clearAll() { DATA = {}; persist(); notify(); }

  /** How many of the six surfaces the reader has visited for this gene. */
  function progress(i) {
    return { done: STEPS.filter(s => seen(i, s)).length, total: STEPS.length,
             steps: STEPS.map(s => ({ id: s, seen: seen(i, s) })) };
  }
  const count = () => Object.keys(DATA).length;
  const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };

  return { STEPS, seen, mark, unmark, toggle, clearGene, clearAll, progress, count,
           subscribe, STORAGE_KEY: KEY };
})();
