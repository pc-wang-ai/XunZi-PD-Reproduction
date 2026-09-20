/* XunZi-PD — v1.6 pages: Pathway context, PD reference evidence, and the shared
 * "What am I looking at?" help panel.
 *
 * The pathway page separates two things that are easy to confuse and must not be:
 *   MEMBERSHIP  — which pathways contain this gene. An annotation lookup.
 *   ENRICHMENT  — whether a gene SET is over-represented. A statistical test.
 * They are rendered in separate panels with separate labels, and the enrichment panel
 * carries the background and the correction method on its face.
 *
 * The PD page shows external context. That layer is never an input to any ranking, and
 * the page says so rather than leaving a reader to assume otherwise.
 */
const V16Pages = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = (v, d = 3) => (v === null || v === undefined || Number.isNaN(v)) ? 'NA' : (+v).toFixed(d);
  const sci = v => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'NA';
    v = +v;
    if (v === 0) return '0';
    return (v < 0.001 || v >= 10000) ? v.toExponential(2) : v.toPrecision(3);
  };

  /* ------------------------------------------------------------------ help */
  /** The same three questions on every page. Collapsed by default so it informs without
   *  taking over the first screen, and phrased so a reader who has never met the
   *  underlying methods can still follow where they are. */
  function helpPanel(id) {
    const H = HELP[I18N.getLang()] || HELP.en;
    const h = H[id];
    if (!h) return '';
    const zh = I18N.getLang() === 'zh';
    return `<details class="helpPanel">
      <summary>${esc(zh ? '我现在在看什么？' : 'What am I looking at?')}</summary>
      <div class="helpBody">
        <div class="helpRow"><span class="hk">${esc(zh ? '这页回答什么？' : 'What does this page answer?')}</span>
          <span class="hv">${esc(h.q)}</span></div>
        <div class="helpRow"><span class="hk">${esc(zh ? '主要看什么？' : 'What should I look at?')}</span>
          <span class="hv">${esc(h.fields)}${h.judge ? `<br><span class="hj">${esc(h.judge)}</span>` : ''}</span></div>
        <div class="helpRow"><span class="hk">${esc(zh ? '看完下一步去哪？' : 'Where do I go next?')}</span>
          <span class="hv">${esc(h.next)}</span></div>
      </div>
    </details>`;
  }

  const HELP = {
    en: {
      home: { q: 'What this system does, and what it refuses to claim.',
        fields: 'The six steps from a PD model to a candidate list.',
        judge: 'Read the flow, not the numbers — the numbers live on the later pages.',
        next: 'Candidate genes.' },
      candidates: { q: 'Which genes are worth studying further.',
        fields: 'Direction and size of the change, how strong the evidence is, whether the '
              + 'protein has interaction partners, and what the other PD model shows.',
        judge: 'Read the two written blocks under each card — they are generated from the '
             + 'same fields shown above them.',
        next: 'Open a card to see its protein network, or add it to your research list.' },
      overview: { q: 'What this system does and what it stands on.',
        fields: 'Discovery model, validation model, structural universe, ranked genes.',
        judge: 'Read the first screen for what the system does; open Technical details for how.',
        next: 'Guided Screening.' },
      screening: { q: 'How to go from 15,688 genes to a shortlist you can defend.',
        fields: 'log2FC, FDR, eligibility, STAT rank, RWR rank, degree, validation state.',
        judge: 'Each step answers one question; no step produces a verdict.',
        next: 'Research Workspace, to compare what you kept.' },
      workspace: { q: 'How your chosen candidates compare, field by field.',
        fields: 'Every evidence field, side by side, plus the evidence matrix and funnel.',
        judge: 'Read across a row to compare the same field; there is no total and no winner.',
        next: 'Gene Detail for one gene, or the pathway page for a set.' },
      de: { q: 'Which genes change between disease and control.',
        fields: 'log2FC (size), FDR (evidence), eligibility (was it analysed at all).',
        judge: 'No significance threshold is applied here; both numbers are shown so you can judge.',
        next: 'Ranking.' },
      ranking: { q: 'How the two baselines order the same genes.',
        fields: 'STAT rank, RWR rank, Δrank.',
        judge: 'Δrank compares two different rank universes, so it is indicative only.',
        next: 'Network.' },
      network: { q: 'What the protein network around a gene looks like.',
        fields: 'degree, edge weight, neighbour evidence, STAT/RWR rank.',
        judge: 'A connection is context, not mechanism. Isolated nodes stay in the app.',
        next: 'Validation.' },
      validation: { q: 'Whether a signal still shows up in an independent PD model.',
        fields: 'PFF log2FC, PFF FDR, validation state.',
        judge: 'State is an effect-magnitude classification only — not significance, replication or validation.',
        next: 'Research Workspace.' },
      gene: { q: 'One gene across every layer.',
        fields: 'Expression, ranks, network, validation, pathway membership, PD reference.',
        judge: 'Each panel names the layer it comes from; none of them is a verdict.',
        next: 'Research Workspace.' },
      pathway: { q: 'Which biological processes the candidates sit in.',
        fields: 'Pathway membership, and for a set, candidate hits vs background counts.',
        judge: 'Membership is a lookup. Enrichment is exploratory — the background is stated on the panel.',
        next: 'Research Workspace to record what you found.' },
      pd: { q: 'Whether existing PD genetics already mentions these genes.',
        fields: 'GWAS association count, strongest p, study accessions.',
        judge: 'This is external context. Absence of evidence is not evidence of novelty.',
        next: 'Research Workspace.' },
      provenance: { q: 'What this build is made of and what it refuses to claim.',
        fields: 'Sources, versions, hashes, guards.',
        judge: 'Everything scientific here is frozen; the v1.6 layers are extensions.',
        next: 'Anywhere.' },
    },
    zh: {
      home: { q: '本系统做什么，以及它拒绝声称什么。',
        fields: '从 PD 模型到候选清单的六个步骤。',
        judge: '先看流程，不要先看数字 —— 数字在后面的页面。',
        next: '候选基因。' },
      candidates: { q: '哪些基因值得进一步研究。',
        fields: '变化的方向与幅度、证据强度、对应蛋白有没有互作伙伴、另一个 PD 模型中的表现。',
        judge: '读每张卡片下方两段文字 —— 它们由上方同样的字段生成。',
        next: '打开卡片查看蛋白网络，或把它加入你的研究清单。' },
      overview: { q: '本系统做什么，建立在什么之上。',
        fields: '发现模型、验证模型、结构全集、被排名的基因。',
        judge: '第一屏看“做什么”，展开技术细节看“怎么做”。',
        next: '候选筛选。' },
      screening: { q: '如何从 15,688 个基因走到一份站得住脚的候选清单。',
        fields: 'log2FC、FDR、可分析性、STAT 排名、RWR 排名、degree、验证状态。',
        judge: '每一步只回答一个问题，任何一步都不产生结论。',
        next: 'PD研究工作台，比较你保留下来的候选。' },
      workspace: { q: '你选择的候选在各层证据上如何比较。',
        fields: '所有证据字段并排展示，另有证据矩阵与候选漏斗。',
        judge: '横向阅读同一行即为同一字段的比较；没有总分，也没有最优基因。',
        next: '单个基因看基因详情，一组基因看通路页。' },
      de: { q: '疾病组与对照组之间哪些基因发生变化。',
        fields: 'log2FC（变化幅度）、FDR（证据强度）、可分析性（是否进入分析）。',
        judge: '此处不施加显著性阈值；两个数值都列出，由你判断。',
        next: '候选排名。' },
      ranking: { q: '两套基线方法如何排列同一批基因。',
        fields: 'STAT 排名、RWR 排名、Δrank。',
        judge: 'Δrank 比较的是两个不同的排名全集，因此仅供参考。',
        next: '网络。' },
      network: { q: '某个基因周围的蛋白网络是什么样的。',
        fields: 'degree、边权、邻居证据、STAT/RWR 排名。',
        judge: '连接是背景信息，不是机制。孤立节点同样保留在应用中。',
        next: '验证。' },
      validation: { q: '信号在独立的 PD 模型中是否仍然出现。',
        fields: 'PFF log2FC、PFF FDR、验证状态。',
        judge: '该状态只是效应幅度的分类 —— 不等于统计显著、可重复或已验证。',
        next: 'PD研究工作台。' },
      gene: { q: '单个基因在各层证据上的表现。',
        fields: '表达、排名、网络、验证、通路成员关系、PD 参考证据。',
        judge: '每个面板都标明来源层；没有任何一个面板构成结论。',
        next: 'PD研究工作台。' },
      pathway: { q: '候选基因涉及哪些生物过程。',
        fields: '通路成员关系；对基因集则是候选命中数与背景数。',
        judge: '成员关系是查询；富集是探索性的 —— 背景数直接写在面板上。',
        next: '到研究工作台记录你的发现。' },
      pd: { q: '已有的 PD 遗传学研究是否提到这些基因。',
        fields: 'GWAS 关联数、最强 p 值、研究编号。',
        judge: '这是外部背景信息。没有找到证据不等于证明其新颖。',
        next: 'PD研究工作台。' },
      provenance: { q: '本次构建由什么组成，以及它拒绝声称什么。',
        fields: '来源、版本、哈希、保护规则。',
        judge: '所有科学结果均已冻结；v1.6 各层属于扩展。',
        next: '任意页面。' },
    },
  };

  /* --------------------------------------------------------------- pathway page */
  /* Two panels that answer two different questions, in that order:
   *   ① 单个基因参与哪些通路？      — an annotation lookup, no statistic at all
   *   ② 一组候选是否集中在某些生物过程？ — an exploratory enrichment test
   * The beginner face states each question in plain Chinese and keeps the method
   * vocabulary (hypergeometric, FDR, Reactome, GO) in the technical fold. Expert mode
   * leads with the method names instead. Values in this dictionary are developer
   * literals; the few that embed an identifier carry the notranslate guard inline and
   * are therefore interpolated without esc(). */
  const PV = {
    en: {
      title: 'Pathway Context',
      sub: 'Which biological processes your candidates sit in. Two separate things are '
         + 'shown here and they are labelled separately.',
      memberTitleQ: 'Which pathways does a single gene take part in?',
      memberTitle: 'Pathway membership — an annotation lookup',
      memberSubQ: 'This only looks up which known pathways or biological processes this '
                + 'gene belongs to. No statistical test is performed here.',
      memberSub: 'Pathways that contain this gene in the loaded reference. No statistic is '
               + 'computed and nothing is compared against anything.',
      memberNone: 'This gene carries no annotation in the loaded pathway reference.',
      inReference: 'Present in reference',
      notInReference: 'Not in reference',
      pathwaysPlain: 'Recorded pathways',
      gobpPlain: 'Recorded biological processes',
      enrichTitleQ: 'Do a set of candidates concentrate in some biological processes?',
      enrichTitle: 'Candidate-set enrichment — exploratory analysis',
      enrichSubQ: 'This runs an exploratory enrichment analysis. A term near the top of the '
                + 'list is not proof that the pathway is causally involved in PD.',
      enrichSub: 'A one-sided hypergeometric test asking whether the genes you selected are '
               + 'over-represented in a pathway relative to the background.',
      enrichSet: 'Gene set',
      // Plain text: this one is rendered inside an <option>, where markup is not allowed.
      enrichK: 'Top-K of the STAT-DE-v1 ranking',
      enrichSL: 'My shortlist',
      enrichWS: 'Workspace candidates',
      colPathway: 'Pathway', colSource: 'Source', colHits: 'Candidate hits',
      colBg: 'Background in pathway', colP: 'p value', colQ: 'FDR (BH)',
      colGenes: 'Contributing genes',
      noHits: 'No pathway in this set has a candidate hit.',
      expand: 'Method and limits',
      reactome: 'Reactome', gobp: 'GO biological process',
      srcLine: 'Pathway sources: Reactome and GO Biological Process (loaded from the frozen '
             + 'reference). Official pathway names are kept as published and are never translated.',
      topN: 'Showing the top',
      ofTested: 'of',
      testedPathways: 'pathways tested',
      bgLine: 'Background',
      membersOf: 'genes',
      defTitle: 'How this was computed',
    },
    zh: {
      title: '通路背景',
      sub: '你的候选基因涉及哪些生物过程。此处展示两类不同的信息，并分别标注。',
      memberTitleQ: '单个基因参与哪些通路？',
      memberTitle: '通路成员关系 —— 注释查询',
      memberSubQ: '这里仅查询该基因属于哪些已知通路或生物过程，不进行统计检验。',
      memberSub: '在当前加载的参考层中包含该基因的通路。不计算任何统计量，也不与任何东西比较。',
      memberNone: '该基因在当前通路参考层中没有注释。',
      inReference: '参考层中存在',
      notInReference: '参考层中不存在',
      pathwaysPlain: '已收录的通路',
      gobpPlain: '已收录的生物过程',
      enrichTitleQ: '一组候选是否集中在某些生物过程？',
      enrichTitle: '候选集富集 —— 探索性分析',
      enrichSubQ: '这里进行探索性富集分析。排名靠前不等于已经证明这些通路与 PD 存在因果关系。',
      enrichSub: '单侧超几何检验（hypergeometric test），用于判断你所选的基因在某条通路中相对于背景是否过表达。',
      enrichSet: '基因集',
      enrichK: 'STAT-DE-v1 排名的 Top-K',
      enrichSL: '我的候选清单',
      enrichWS: '工作台候选',
      colPathway: '通路', colSource: '来源', colHits: '候选命中数',
      colBg: '通路内背景数', colP: 'p 值', colQ: 'FDR (BH)',
      colGenes: '贡献基因',
      noHits: '该基因集在任何通路中都没有命中。',
      expand: '技术细节：方法与限制',
      reactome: 'Reactome', gobp: 'GO 生物过程',
      srcLine: '通路来源：Reactome 与 GO Biological Process（读取自冻结参考层）。'
             + '官方通路名称按原文保留，不做翻译。',
      topN: '显示前',
      ofTested: '共',
      testedPathways: '条通路被检验',
      bgLine: '背景',
      membersOf: '个基因',
      defTitle: '这是如何计算的',
    },
  };
  const P = (k) => {
    const d = PV[I18N.getLang()] || PV.en;
    return (d[k] !== undefined) ? d[k] : (PV.en[k] !== undefined ? PV.en[k] : k);
  };

  function pathway(host, state) {
    state = Object.assign({ gene: null, set: 'k100', topN: 40 }, state || {});
    const zh = I18N.getLang() === 'zh';

    function paint() {
      if (!Pathways.ready()) {
        host.innerHTML = `<h1 class="titleBeginner">${esc(T('path2.q'))}</h1>`
          + `<h1 class="titleExpert">${esc(P('title'))}</h1>`
          + `<div class="note">${esc(zh ? '当前无法打开通路参考层。你仍可返回候选基因或查看其他证据。'
            : 'The pathway reference is unavailable. You can return to candidate genes or inspect other evidence.')}</div>`
          + `<div class="toolbar"><a class="btnLink primary" href="#candidates">${esc(zh ? '返回候选基因' : 'Back to candidate genes')}</a></div>`;
        return;
      }
      const gene = state.gene !== null ? DataService.get_gene_detail(state.gene)
                  : DataService.get_gene_by_any('SNCA');
      const mem = gene ? Pathways.forGene(gene.gene_id) : null;

      // candidate set
      let ids = [], setLabel = '';
      if (state.set === 'shortlist') {
        ids = Shortlist.rows().map(g => g.gene_id);
        setLabel = P('enrichSL');
      } else if (state.set === 'workspace') {
        ids = WorkspaceState.genes.map(i => DataService.get_gene_detail(i))
          .filter(Boolean).map(g => g.gene_id);
        setLabel = P('enrichWS');
      } else {
        const k = Number(String(state.set).replace('k', '')) || 100;
        ids = DataService.get_rankings('STAT-DE-v1').filter(x => x.g.eligP)
          .slice(0, k).map(x => x.g.gene_id);
        setLabel = `${P('enrichK')} ${k}`;
      }
      const enr = Pathways.enrich(ids);
      const def = Pathways.definition() || {};
      const rows = enr ? enr.rows.slice(0, state.topN) : [];

      const beg = (document.documentElement.dataset.mode || 'beginner') === 'beginner';
      host.innerHTML = `
        <h1 class="titleBeginner">${esc(T('path2.q'))}</h1>
        <h1 class="titleExpert">${esc(P('title'))}</h1>
        <p class="lede screeningLede">${esc(P('sub'))}</p>
        ${helpPanel('pathway')}
        ${Pages.scientificBoundary(zh
          ? '通路成员关系是注释查询；候选集富集是探索性分析，不能证明通路与 PD 存在因果关系。'
          : 'Pathway membership is an annotation lookup; candidate-set enrichment is exploratory and cannot establish a causal role in PD.')}

        <div class="panel">
          <h2 class="partT" style="margin-top:0"><span class="partN">1</span>
            ${esc(beg ? P('memberTitleQ') : P('memberTitle'))}</h2>
          <p class="lede">${esc(beg ? P('memberSubQ') : P('memberSub'))}</p>
          <div class="toolbar">
            <div class="searchWrap"><input id="pwq"
              placeholder="${esc(zh ? '搜索基因' : 'search a gene')}" style="min-width:280px"></div>
            ${gene ? `<span class="badge">${NT(gene.symbol || gene.gene_id)}</span>
              <span class="badge">${esc(mem && mem.inReference ? P('inReference') : P('notInReference'))}</span>
              <span class="mono" style="color:var(--dim)">${NT(gene.gene_id)}</span>` : ''}
          </div>
          ${!gene ? '' : (!mem || (!mem.reactome.length && !mem.gobp.length)
            ? `<div class="note">${esc(P('memberNone'))}</div>`
            : `<div class="two">
                 <div><h2 class="srcH" style="margin-top:0">${esc(beg ? P('pathwaysPlain') : P('reactome'))}
                   <span class="na">${mem.reactome.length}</span></h2>
                   ${pathList(mem.reactome)}</div>
                 <div><h2 class="srcH" style="margin-top:0">${esc(beg ? P('gobpPlain') : P('gobp'))}
                   <span class="na">${mem.gobp.length}</span></h2>
                   ${pathList(mem.gobp)}</div>
               </div>`)}
        </div>

        <div class="panel">
          <h2 class="partT" style="margin-top:0"><span class="partN">2</span>
            ${esc(beg ? P('enrichTitleQ') : P('enrichTitle'))}</h2>
          <p class="lede">${esc(beg ? P('enrichSubQ') : P('enrichSub'))}</p>
          <div class="toolbar">
            <label>${esc(P('enrichSet'))}
              <select id="pwSet">
                <option value="k20" ${state.set === 'k20' ? 'selected' : ''}>${esc(P('enrichK'))} 20</option>
                <option value="k50" ${state.set === 'k50' ? 'selected' : ''}>${esc(P('enrichK'))} 50</option>
                <option value="k100" ${state.set === 'k100' ? 'selected' : ''}>${esc(P('enrichK'))} 100</option>
                <option value="shortlist" ${state.set === 'shortlist' ? 'selected' : ''}>${esc(P('enrichSL'))}</option>
                <option value="workspace" ${state.set === 'workspace' ? 'selected' : ''}>${esc(P('enrichWS'))}</option>
              </select></label>
            <span class="badge warnBadge">${esc(zh ? '探索性 —— 本应用不施加显著性阈值' : 'Exploratory — no significance threshold is applied')}</span>
          </div>
          ${enr ? `<div class="note">
            <b>${esc(setLabel)}</b> ·
            ${enr.requested !== undefined && enr.not_in_reference
              ? esc(zh ? `${enr.requested} 个基因中 ${enr.candidate_n} 个在参考层中有注释，其余无法参与检验。`
                       : `${enr.candidate_n} of ${enr.requested} genes carry annotation and could be tested; the rest cannot contribute a hit.`)
              : ''}
            <br>${esc(P('bgLine'))}: <b>${Pathways.background().toLocaleString()}</b> ${esc(P('membersOf'))} ·
            <b>${enr.tested_pathways.toLocaleString()}</b> ${esc(P('testedPathways'))}
          </div>` : ''}
          ${rows.length ? `
            <div class="tableWrap" style="max-height:420px"><table>
              <thead><tr>
                <th scope="col">${esc(P('colPathway'))}</th>
                <th scope="col">${esc(P('colSource'))}</th>
                <th scope="col">${esc(P('colHits'))}</th>
                <th scope="col">${esc(P('colBg'))}</th>
                <th scope="col">${esc(P('colP'))}</th>
                <th scope="col">${esc(P('colQ'))}</th>
                <th scope="col">${esc(P('colGenes'))}</th>
              </tr></thead><tbody>
              ${rows.map(r => `<tr>
                <td>${NT(r.pathway_name)}</td>
                <td class="mono notranslate" translate="no">${esc(r.source)}</td>
                <td class="num">${r.candidate_hits}</td>
                <td class="num">${r.pathway_bg_genes.toLocaleString()}</td>
                <td class="num">${sci(r.p_value)}</td>
                <td class="num">${sci(r.fdr_bh)}</td>
                <td class="mono" style="white-space:normal">${NT(contributors(r))}</td>
              </tr>`).join('')}</tbody></table></div>
            <div class="legend">${esc(P('topN'))} ${rows.length} ${esc(P('ofTested'))}
              ${enr.rows.length} ${esc(zh ? '条有命中的通路' : 'pathways with a hit')}.</div>`
          : `<div class="note">${esc(P('noHits'))}</div>`}

          <details class="why" style="margin-top:12px">
            <summary>${esc(P('expand'))}</summary>
            <div class="defBox">
              <div class="defRow"><span class="dk">${esc(zh ? '通路来源' : 'Pathway sources')}</span>
                <span class="dv">${esc(P('srcLine'))}</span></div>
              <div class="defRow"><span class="dk">${esc(zh ? '检验方法' : 'Test')}</span><span class="dv">${esc(def.test || '')}</span></div>
              <div class="defRow"><span class="dk">${esc(zh ? '候选集定义' : 'Candidate set')}</span><span class="dv">${esc(def.candidate_set || '')}</span></div>
              <div class="defRow"><span class="dk">${esc(P('bgLine'))}</span><span class="dv">${esc(def.background || '')}</span></div>
              <div class="defRow"><span class="dk">${esc(zh ? '多重检验校正' : 'Multiple testing')}</span><span class="dv">${esc(def.multiple_testing || '')}</span></div>
              <div class="defRow"><span class="dk">${esc(zh ? '可检验通路' : 'Testable pathway')}</span><span class="dv">${esc(def.testable_pathway || '')}</span></div>
              <div class="defRow"><span class="dk">${esc(zh ? '状态' : 'Status')}</span><span class="dv">${esc(def.status || '')}</span></div>
            </div>
            <div class="note warn" style="margin-bottom:0">${esc(zh
              ? '基因本体（GO）分析的一个已知特性是：大型、注释广泛的条目容易在排序靠前处聚集。'
                + '在此列出 FDR 并不意味着该通路与该疾病相关。'
              : 'A known property of GO over-representation is that large, broadly annotated terms '
                + 'tend to cluster near the top of the list. An FDR shown here does not mean the '
                + 'pathway is related to the disease.')}</div>
          </details>
        </div>
        ${beg && gene ? Pages.nextStep(
          zh ? '接下来查看已有 PD 遗传学研究是否提到这个基因。' : 'Next, check whether existing PD genetics research mentions this gene.',
          zh ? '查看 PD 证据 →' : 'Inspect PD evidence →', '#pd/' + gene.i) : ''}`;
      wire();
      Glossary.bind(host);
    }

    function contributors(r) {
      return (r.contributing_genes || []).map(gid => {
        const g = DataService.ready().byGene.get(gid);
        return g ? (g.symbol || gid) : gid;
      }).join(', ');
    }

    function pathList(list) {
      if (!list.length) return `<div class="na">—</div>`;
      // Official pathway names are shown exactly as published, never translated.
      return `<div class="pathList">${list.slice(0, 60).map(p =>
        `<div class="pathRow"><span class="pn">${NT(p.name)}</span>
          <span class="pb">${p.bg !== null ? p.bg.toLocaleString() : ''}</span></div>`).join('')}
        ${list.length > 60 ? `<div class="na">+${list.length - 60}</div>` : ''}</div>`;
    }

    function wire() {
      const q = host.querySelector('#pwq');
      if (q) Pages.bindSearch(q, g => { state.gene = g.i; paint(); });
      const sel = host.querySelector('#pwSet');
      if (sel) sel.onchange = e => { state.set = e.target.value; paint(); };
    }
    paint();
    return { get set() { return state.set; }, setSet: v => { state.set = v; paint(); } };
  }

  /* ------------------------------------------------------------ PD evidence page */
  const PD = {
    en: {
      title: 'PD Reference Evidence',
      sub: 'Whether existing Parkinson\'s disease genetics already mentions these genes. '
         + 'This layer is external context and never feeds any ranking.',
      ask: 'What this page answers:',
      askQ: 'Has published Parkinson\'s disease genetics ever mentioned this gene?',
      askNote: 'A record here does not make it a validated drug target. No record here does '
             + 'not make it a new gene.',
      srcTitle: 'Source and provenance',
      cntTitle: 'Candidates with PD reference evidence',
      known: 'With PD reference evidence',
      emerging: 'Without PD reference evidence',
      gwasN: 'GWAS association records',
      strongest: 'Smallest p value',
      studies: 'Studies involved',
      mapped: 'Mapped to the current gene universe',
      none: 'None found in the loaded reference',
      geneSearch: 'Look up a gene',
      notLoaded: 'The PD reference layer is not loaded in this build.',
      warn: 'Lack of reference evidence does not mean novelty, and it does not establish a '
          + 'new PD gene. It means the sources loaded here did not mention it.',
      mapRule: 'Gene mapping rule',
      fold: 'Technical details: source and mapping',
      assocTitle: 'All PD associations for this gene',
      rsid: 'Risk variant', risk: 'Risk allele', or: 'OR / beta',
      study: 'Study', pmid: 'PubMed',
      colGene: 'Gene',
      colGwasN: 'GWAS association records',
      tableTitle: 'Candidates, by reference evidence',
    },
    zh: {
      title: 'PD 参考证据',
      sub: '已有的帕金森病遗传学研究是否提到这些基因。该层属于外部背景信息，从不参与任何排名。',
      ask: '这里回答的是：',
      askQ: '已有帕金森病遗传学研究是否曾涉及这个基因？',
      askNote: '有记录 ≠ 已验证治疗靶点。没有记录 ≠ 新基因。',
      srcTitle: '来源与溯源',
      cntTitle: '有 PD 参考证据的候选基因',
      known: '有 PD 参考证据',
      emerging: '无 PD 参考证据',
      gwasN: 'GWAS 关联记录',
      strongest: '最小 P 值',
      studies: '涉及研究',
      mapped: '映射到当前基因全集',
      none: '当前参考层中未找到该基因的关联记录',
      geneSearch: '查询基因',
      notLoaded: '本次构建未加载 PD 参考层。',
      warn: '缺少参考证据不代表新颖性，也不能据此认定这是一个新的 PD 基因。它只说明此处加载的来源没有提到它。',
      mapRule: '基因映射规则',
      fold: '技术细节：来源与映射规则',
      assocTitle: '该基因的全部 PD 关联记录',
      rsid: '风险变异（rsID）', risk: '风险等位', or: 'OR / beta',
      study: '研究编号', pmid: 'PubMed',
      colGene: '基因',
      colGwasN: 'GWAS 关联记录数',
      tableTitle: '按参考证据列出的候选基因',
    },
  };
  const D = (k) => {
    const d = PD[I18N.getLang()] || PD.en;
    return (d[k] !== undefined) ? d[k] : (PD.en[k] !== undefined ? PD.en[k] : k);
  };

  function pd(host, state) {
    state = Object.assign({ gene: null }, state || {});
    const zh = I18N.getLang() === 'zh';

    function paint() {
      if (typeof PdEvidence === 'undefined' || !PdEvidence.ready()) {
        host.innerHTML = `<h1 class="titleBeginner">${esc(T('pd2.q'))}</h1>`
          + `<h1 class="titleExpert">${esc(D('title'))}</h1>`
          + `<div class="note warn">${esc(D('notLoaded'))}</div>`
          + `<div class="toolbar"><a class="btnLink primary" href="#candidates">${esc(zh ? '返回候选基因' : 'Back to candidate genes')}</a></div>`;
        return;
      }
      const src = PdEvidence.source();
      const gene = state.gene !== null ? DataService.get_gene_detail(state.gene)
                  : DataService.get_gene_by_any('SNCA');
      const ev = gene ? PdEvidence.forGene(gene.gene_id) : null;
      const all = DataService.ready().byIdx.filter(Boolean);
      const withEv = all.filter(g => (PdEvidence.forGene(g.gene_id)?.gwas_associations || 0) > 0);
      const beg = (document.documentElement.dataset.mode || 'beginner') === 'beginner';

      host.innerHTML = `
        <h1 class="titleBeginner">${esc(T('pd2.q'))}</h1>
        <h1 class="titleExpert">${esc(D('title'))}</h1>
        <p class="lede screeningLede">${esc(D('sub'))}</p>
        ${helpPanel('pd')}

        <div class="askBox">
          <span class="askK">${esc(D('ask'))}</span>
          <span class="askQ">${esc(D('askQ'))}</span>
          <span class="askN">${esc(D('askNote'))}</span>
        </div>
        ${Pages.scientificBoundary(zh
          ? '这里只覆盖当前加载的遗传学来源；没有记录不表示新颖，有记录也不表示已验证治疗靶点。'
          : 'This covers only the loaded genetics sources; no record does not imply novelty, and a record does not identify a validated therapeutic target.')}

        <div class="grid cards">
          <div class="card"><div class="k">${esc(D('cntTitle'))}</div>
            <div class="v">${withEv.length.toLocaleString()}</div>
            <div class="n">${zh ? '15,688 个结构节点中' : 'of 15,688 structural nodes'}</div></div>
          <div class="card"><div class="k">${esc(D('gwasN'))}</div>
            <div class="v">${(src.association_count || 0).toLocaleString()}</div>
            <div class="n">${zh ? 'PD 关联记录总数' : 'PD association records loaded'}</div></div>
          <div class="card"><div class="k">${esc(D('studies'))}</div>
            <div class="v">${(src.study_count || 0).toLocaleString()}</div>
            <div class="n">${zh ? '项独立研究' : 'distinct studies'}</div></div>
          <div class="card"><div class="k">${esc(D('mapped'))}</div>
            <div class="v">${(src.mapped_to_universe || 0).toLocaleString()}</div>
            <div class="n">${zh ? '个基因' : 'genes'}</div></div>
        </div>

        <div class="panel" style="margin-top:14px">
          <div class="toolbar">
            <div class="searchWrap"><input id="pdq"
              placeholder="${esc(D('geneSearch'))}" style="min-width:280px"></div>
            ${gene ? `<span class="badge">${NT(gene.symbol || gene.gene_id)}</span>
              <span class="mono" style="color:var(--dim)">${NT(gene.gene_id)}</span>
              <span class="valState ${ev && ev.gwas_associations > 0 ? 'v-green' : 'v-grey'}">
                <span class="vsTag">${esc(ev && ev.gwas_associations > 0 ? D('known') : D('emerging'))}</span>
              </span>` : ''}
          </div>
          ${!gene ? '' : (ev && ev.gwas_associations > 0 ? `
            <div class="grid cards" style="margin-bottom:10px">
              <div class="card"><div class="k">${esc(D('gwasN'))}</div>
                <div class="v">${ev.gwas_associations}</div></div>
              <div class="card"><div class="k">${esc(D('strongest'))}</div>
                <div class="v" style="font-size:16px">${esc(sci(ev.strongest_p))}</div></div>
              <div class="card"><div class="k">${esc(D('studies'))}</div>
                <div class="v">${ev.studies.length}</div></div>
            </div>
            <h2>${esc(D('assocTitle'))}</h2>
            <div class="tableWrap" style="max-height:340px"><table>
              <thead><tr>
                <th scope="col">${esc(D('rsid'))}</th><th scope="col">${esc(D('risk'))}</th>
                <th scope="col">${esc(D('or'))}</th><th scope="col">p</th>
                <th scope="col">${esc(D('study'))}</th><th scope="col">${esc(D('pmid'))}</th>
              </tr></thead><tbody>
              ${ev.associations.slice(0, 200).map(a => `<tr>
                <td class="mono notranslate" translate="no">${esc(a.rsid || '')}</td>
                <td class="mono">${esc(a.risk_allele || '')}</td>
                <td class="num">${esc(a.or_beta || '')}</td>
                <td class="num">${esc(sci(a.p_value))}</td>
                <td class="mono notranslate" translate="no">${esc(a.study || '')}</td>
                <td class="mono">${esc(a.pmid || '')}</td>
              </tr>`).join('')}</tbody></table></div>`
            : `<div class="note">${esc(D('none'))} —— ${esc(D('askNote'))}</div>`)}
        </div>

        <div class="panel">
          <h2 style="margin-top:0">${esc(D('tableTitle'))}</h2>
          <div class="tableWrap" style="max-height:420px"><table>
            <thead><tr>
              <th scope="col">${esc(D('colGene'))}</th><th scope="col">${esc(D('colGwasN'))}</th>
              <th scope="col">${esc(D('strongest'))}</th><th scope="col">${esc(D('studies'))}</th>
            </tr></thead><tbody>
            ${withEv.sort((a, b) => (PdEvidence.forGene(b.gene_id).gwas_associations)
                                    - (PdEvidence.forGene(a.gene_id).gwas_associations))
              .slice(0, 100).map(g => {
                const e = PdEvidence.forGene(g.gene_id);
                return `<tr data-i="${g.i}" class="clickRow">
                  <td class="sym">${NT(g.symbol || g.gene_id)}</td>
                  <td class="num">${e.gwas_associations}</td>
                  <td class="num">${esc(sci(e.strongest_p))}</td>
                  <td class="mono notranslate" translate="no">${esc(e.studies.slice(0, 3).join(', '))}</td></tr>`;
              }).join('')}
            </tbody></table></div>
        </div>

        <details class="why">
          <summary>${esc(D('fold'))}</summary>
          <div class="note">${esc(D('srcTitle'))}:
            <b>${esc(src.name || '')}</b> · ${esc(src.release || '')} ·
            ${zh ? '检索' : 'trait'} <span class="mono notranslate" translate="no">${esc(src.trait || '')}</span> ·
            ${zh ? '拉取时间' : 'fetched'} <span class="mono">${esc(src.fetched_utc || '')}</span> ·
            sha256 <span class="mono">${esc(String(src.sha256 || '').slice(0, 16))}…</span>
            <br><b>${esc(D('mapRule'))}</b>: ${esc(src.mapping_rule || '')}
          </div>
        </details>

        <div class="note warn">${esc(D('warn'))}</div>
        ${beg && gene ? Pages.nextStep(
          zh ? '把这个候选带到“我的研究”，汇总当前证据。' : 'Take this candidate to My Research and review the evidence together.',
          zh ? '加入我的研究 →' : 'Add to My Research →', '#workspace/' + gene.i) : ''}`;

      const q = host.querySelector('#pdq');
      if (q) Pages.bindSearch(q, g => { state.gene = g.i; paint(); });
      host.querySelectorAll('tr[data-i]').forEach(tr => {
        tr.onclick = () => { location.hash = '#gene/' + tr.dataset.i; };
      });
      Glossary.bind(host);
    }
    paint();
  }

  /* Cross-module state holder so the pathway page can use the Workspace selection. */
  const WorkspaceState = { genes: [] };

  return { pathway, pd, helpPanel, HELP, WorkspaceState, PV, PD };
})();
