/* XunZi-PD — interface copy dictionary.
 *
 * One dictionary for the whole app. Technical identifiers (gene symbols, Ensembl IDs,
 * field names, version numbers, model names, statistical notation such as log2FC /
 * FDR / Δrank) are deliberately NOT translated in either language.
 *
 * Usage:  T('overview.title')   ->  string in the active language
 *         setLang('zh'|'en')    ->  switch + persist + re-render
 *         NT('SNCA')            ->  identifier wrapped in the browser-translation guard
 */
const I18N = (() => {
  const DICT = {
    en: {
      'nav.overview': 'Overview', 'nav.screening': 'Guided Screening', 'nav.de': 'Expression',
      'nav.ranking': 'Ranking', 'nav.network': 'Network', 'nav.validation': 'Validation',
      'nav.gene': 'Gene', 'nav.provenance': 'Provenance',
      'nav.workspace': 'Workspace', 'nav.pathway': 'Pathway', 'nav.pd': 'PD evidence',

      /* Beginner navigation — seven plain-language destinations over the same routes. */
      'navB.home': 'Home', 'navB.candidates': 'Candidate genes',
      'navB.network': 'Protein network', 'navB.pathway': 'Pathways',
      'navB.pd': 'PD evidence', 'navB.workspace': 'My research',
      'navB.sources': 'Sources',

      /* Beginner page titles, phrased as the question the page answers. */
      'net2.q': 'Which proteins is this gene connected to?',
      'val2.q': 'Does the signal still show up in another PD model?',
      'path2.q': 'Which biological processes do these candidates sit in?',
      'pd2.q': 'Does existing Parkinson\'s research mention these genes?',
      'ws2.q': 'My research candidates',
      'g7.evidence': '— evidence page',
      'foot.reads': 'Reads <code>outputs/app_data/</code> only · no raw FASTQ/BAM · pipeline is not re-run',
      'foot.tests': 'test suite',
      'sl.badge': 'shortlisted',

      /* Overview — first screen, "what are we trying to do?" */
      'ov2.goal': 'What this app is trying to do',
      'ov2.what': 'Find genes worth studying further in Parkinson\'s disease, by combining which genes '
        + 'change in a disease model with how the proteins they encode interact.',
      'ov2.find': 'See what changed',
      'ov2.protein': 'See protein connections',
      'ov2.rank': 'Find candidates',
      'ov2.check': 'Compare another model',
      'ov2.start': 'Find candidate genes',
      'ov2.known': 'Look at a known gene',
      'ov2.caveat': 'This ranks genes as worth studying further. It does not identify a '
        + 'treatment target, and a candidate here is not a validated finding.',
      'ov2.where': 'Where would you like to start?',
      'ov2.e1': 'Find candidate genes',
      'ov2.e1d': 'Browse the candidates five different ways, starting from a small set.',
      'ov2.e2': 'Look at a known gene',
      'ov2.e2d': 'Open one gene — for example SNCA — and see its evidence.',
      'ov2.e3': 'Look at the protein network',
      'ov2.e3d': 'See which proteins a gene is connected to.',
      'ov2.e4': 'Compare my candidates',
      'ov2.e4d': 'Put up to four candidates side by side.',
      'ov2.startHere': 'How would you like to begin?',
      'ov2.noGene': 'I do not have a gene yet',
      'ov2.noGeneD': 'Start with a short, guided list of candidates.',
      'ov2.browse': 'Browse candidate genes',
      'ov2.haveGene': 'I already have a gene',
      'ov2.haveGeneD': 'Enter a gene symbol or Ensembl ID to see its complete evidence page.',
      'ov2.genePlaceholder': 'For example: SNCA or ENSG00000145335',
      'ov2.openGene': 'View this gene',
      'ov2.searchHint': 'The search covers the complete fixed gene universe, not only top-ranked genes.',
      'ov2.more': 'Other useful places',
      'ov2.tech': 'Technical details — method, universe, baselines, robustness',
      'ov2.what2': 'Find genes worth studying further in Parkinson\'s disease models, then understand '
        + 'their expression change, protein connections, behaviour in another model, biological '
        + 'processes and existing PD research.',
      'ov2.pdmodel': 'PD model',
      'ov2.expr': 'See what changed',
      'ov2.indep': 'Independent PD model',
      'ov2.biointerp': 'Understand the context',
      'ov2.currentModel': 'Current model',
      'ov2.discovery': 'Discovery', 'ov2.validation': 'Validation',
      'ov2.ranked': 'Ranked', 'ov2.gwasN': 'With PD reference evidence',
      'ov2.pathwayN': 'Testable pathways',

      /* role of each cohort, stated once and reused */
      'val.roles': 'Two models with fixed roles — they are not interchangeable',
      'val.disc': 'Discovery model', 'val.val': 'Validation model',
      'val.discUse': 'Use: find candidate genes here',
      'val.valUse': 'Use: check whether a candidate still shows a signal in a different PD model',
      'val.focus': 'Focused on',
      'val.openGene': 'Open Gene Detail →',
      'val.clearFocus': 'Clear',
      'val.stateRule': 'NEAR ZERO uses the existing validation-analysis definition, '
        + '|validation log2FC| < 0.05. No new cutoff is introduced.',

      'vs.present': 'NON-NEAR-ZERO CHANGE', 'vs.near': 'NEAR ZERO', 'vs.missing': 'NOT COMPARABLE',

      'net.layer': 'This network connects proteins, not genes',
      'net.layer.gene': 'the gene you searched',
      'net.layer.prot': 'proteins it interacts with',
      'net.adv': 'Advanced network view (2-hop)',

      'gene.toNetwork': 'Inspect network',
      'gene.toValidation': 'Check validation',
      'gene.toScreening': 'Back to candidate genes',

      'next.title': 'What should I do next?',
      'next.de': 'Once you have found genes with an expression signal, the next step is to compare '
        + 'STAT-DE and STRING-RWR rankings.',
      'next.deBtn': 'Go to Ranking',
      'next.ranking': 'Select a candidate you find interesting, then look at the protein network '
        + 'around it.',
      'next.rankingBtn': 'Inspect Network',
      'next.network': 'Once you know whether it has real network context, check the independent '
        + 'PFF model.',
      'next.networkBtn': 'Check Validation',
      'next.validation': 'Add the genes you want to follow up to your shortlist, then export it.',
      'next.validationBtn': 'Open Gene Detail',
      'next.gene': 'All five steps in one place, with the shortlist you have built so far.',
      'next.geneBtn': 'Open My Research',

      'hero.sub': "Parkinson's Disease Gene Prioritization Explorer",
      'hero.blurb': 'Integrates transcriptomic differential expression with STRING network propagation to prioritize Parkinson\'s disease-related candidate genes.',
      'hero.demo': '▶ Start Guided Demo',
      'hero.ranking': 'Jump to Candidate Ranking',
      'hero.method': 'Methodology',

      'ov.method': 'Method',
      'ov.method.note': 'The node universe and the interaction network are fixed before any expression statistic is computed.',
      'flow.rnaseq': 'RNA-seq', 'flow.rnaseq.d': '18 paired-end runs · substantia nigra',
      'flow.de': 'Differential Expression', 'flow.de.d': 'DESeq2 · MPTP vs Saline (primary)',
      'flow.net': 'Fixed STRING Network',
      'flow.stat': 'STAT-DE-v1', 'flow.stat.d': 'expression-only ranking',
      'flow.rwr': 'STRING-RWR-v1', 'flow.rwr.d': 'network propagation',
      'flow.prio': 'Candidate Prioritization', 'flow.prio.d': 'ranked over a frozen node universe',
      'flow.val': 'Independent Validation', 'flow.val.d': 'PFF vs PBS',

      'card.nodes': 'Structural nodes', 'card.nodes.n': 'fixed U3 universe',
      'card.edges': 'Graph edges', 'card.edges.n': 'undirected, canonical',
      'card.conn': 'Connected', 'card.conn.n': 'degree > 0',
      'card.iso': 'Isolated', 'card.iso.n': 'retained, degree = 0',
      'card.ep': 'Primary eligible', 'card.ep.n': 'MPTP vs Saline',
      'card.ev': 'Validation eligible', 'card.ev.n': 'PFF vs PBS',

      'ov.cohorts': 'Cohorts', 'ov.baselines': 'Baselines', 'ov.universe': 'Analysis universe',
      'ov.primary': 'Primary', 'ov.validation': 'Validation', 'ov.source': 'Source',
      'ov.prole': 'Primary role', 'ov.vrole': 'Validation role',
      'ov.sprole': 'sole source of ranking features', 'ov.svrole': 'external validation only',
      'ov.score': 'Score', 'ov.tiebreak': 'Tie-break', 'ov.tiebreak.v': 'ASCII-lexical human Ensembl gene_id',
      'ov.restart': 'Restart / tol', 'ov.isolatedrows': 'Isolated rows',
      'ov.isolatedrows.v': 'kept zero, never redistributed',
      'ov.agreement': 'Agreement',
      'ov.cpm.p': 'CPM pass · primary', 'ov.cpm.v': 'CPM pass · validation',
      'ov.elig.p': 'Eligible · primary', 'ov.elig.v': 'Eligible · validation',
      'ov.ineligible': 'Ineligible nodes', 'ov.ineligible.v': 'retained with <code>NA</code> — never removed',
      'ov.start': 'Where to start',

      'rob.title': 'Robustness',
      'rob.seeds': 'frozen seeds', 'rob.reported': 'reported, not recomputed',
      'rob.lede': 'The frozen protocol predeclares 20 bootstrap resamples (seeds <code>20260911…20260930</code>), resampling within each primary group with replacement at the original group size. This is a <b>sensitivity analysis, never model selection</b> — the rankings elsewhere in this app are the full-data rankings, and no threshold is derived here.',
      'rob.metric': 'Metric', 'rob.pmean': 'Primary mean', 'rob.pmed': 'Primary median',
      'rob.pmin': 'Primary min', 'rob.pmax': 'Primary max',
      'rob.vmean': 'Validation mean', 'rob.vmed': 'Validation median',
      'rob.spearman': 'Spearman ρ vs full data', 'rob.kendall': 'Kendall τ-b vs full data',
      'rob.top10': 'Top-10 overlap proportion', 'rob.top100': 'Top-100 overlap proportion',
      'rob.jac100': 'Top-100 Jaccard',
      'rob.how': 'How to read this.',
      'rob.howbody': 'Rank <i>order</i> is the stable part. Rank <i>membership</i> near the very top is less stable: small top-k overlap is the norm when resampling only 4 samples per group, and the validation cohort shows this more strongly. That is a statement about sampling noise, not about biology.',

      'about.title': 'About / Methodology',
      'about.genome': 'Genome annotation', 'about.ortho': 'Orthology',
      'about.ppi': 'Protein network', 'about.de': 'Differential expression',
      'about.lfc': 'LFC shrinkage', 'about.baselines': 'Baselines',
      'about.disclaimer': 'Research demonstration — not a clinical diagnostic system.',
      'about.disclaimer.body': 'Outputs are candidate prioritisation scores for research use only. They are not a diagnosis, a treatment recommendation, or a basis for clinical decision-making.',

      'demo.badge': 'Guided demo', 'demo.step': 'Step', 'demo.prev': '← Prev',
      'demo.next': 'Next →', 'demo.exit': 'Exit',
      'demo.q.overview': 'What is this, and what evidence does it stand on?',
      'demo.q.de': 'Which genes change most strongly between disease and control?',
      'demo.q.ranking': 'Which genes remain important after integrating network context?',
      'demo.q.network': 'How is a candidate positioned within the disease-associated interaction network?',
      'demo.q.gene': 'How does one candidate look across every layer of the evidence?',
      'demo.q.validation': 'Do candidate signals generalise to the independent PFF cohort?',
      'demo.q.candidates': 'Choose one research question and open a real candidate.',
      'demo.q.pathway': 'What pathway context is present, and what remains uncertain?',
      'demo.q.workspace': 'Keep the candidate for comparison and continued research.',
      'demo.l.overview': 'Overview', 'demo.l.de': 'Expression', 'demo.l.ranking': 'Candidate Ranking',
      'demo.l.network': 'Network Explorer', 'demo.l.gene': 'Gene Detail', 'demo.l.validation': 'Validation',
      'demo.l.candidates': 'Choose candidates', 'demo.l.pathway': 'Pathway evidence', 'demo.l.workspace': 'My Research',

      'pg.de': 'Differential Expression', 'pg.ranking': 'Candidate Ranking',
      'pg.network': 'Network Explorer', 'pg.validation': 'Validation',
      'pg.provenance': 'Provenance', 'pg.gene': 'Gene Detail',
      'pg.rk.promoted': 'Network-promoted candidates',
      'pg.rk.promoted.lede': 'Genes whose ranking <b>improves after network propagation</b> — the largest positive rank shift (Δrank = STAT rank − RWR rank). This is a display of an already-computed derived value; it introduces no new selection criterion and changes no result.',
      'pg.net.iso': 'show an isolated node',
      'pg.net.search': 'search a gene — symbol, Ensembl ID or mouse ID',
      'pg.openGene': 'Open Gene Detail →',
      'iso.title': 'No network support.',
      'iso.body': 'This node has no STRING edges in the frozen universe. Its RWR rank reflects the <b>restart / seed contribution</b> only — it receives no propagated network support, and propagation cannot reach or leave an isolated node. A high RWR rank here is <b>not</b> network validation. Network context is an explanation attribute: it changes no STAT-DE or RWR score or rank.',
      'iso.top1': 'This gene tops <b>both</b> rankings yet has <b>no STRING edges</b>. Its RWR rank reflects the <b>restart / seed contribution</b> only — it receives no propagated network support, because propagation cannot reach or leave an isolated node. <b>That is not network validation.</b> It is the strongest expression-only signal sitting outside the retained interaction network.',
      'nc.iso': 'ISOLATED / NO_NETWORK_SUPPORT', 'nc.conn': 'CONNECTED / NETWORK_PROPAGATED',
      'nc.label': 'Network context',
    },
    zh: {
      'nav.overview': '总览', 'nav.screening': '候选筛选', 'nav.de': '差异表达',
      'nav.ranking': '候选排名', 'nav.network': '网络', 'nav.validation': '验证',
      'nav.gene': '基因', 'nav.provenance': '溯源',
      'nav.workspace': '研究工作台', 'nav.pathway': '通路', 'nav.pd': 'PD 证据',

      'navB.home': '首页', 'navB.candidates': '候选基因',
      'navB.network': '蛋白网络', 'navB.pathway': '通路机制',
      'navB.pd': 'PD 证据', 'navB.workspace': '我的研究',
      'navB.sources': '来源资料',

      'net2.q': '这个基因对应的蛋白与哪些蛋白相互作用？',
      'val2.q': '换一个 PD 模型，信号还在吗？',
      'path2.q': '这些候选基因涉及哪些生物过程？',
      'pd2.q': '已有帕金森病研究是否提到这些基因？',
      'ws2.q': '我的研究候选',
      'g7.evidence': '— 证据页',
      'foot.reads': '仅读取 <code>outputs/app_data/</code> · 不读取原始 FASTQ/BAM · 不重跑流程',
      'foot.tests': '测试套件',
      'sl.badge': '个候选',

      'ov2.goal': '本应用要解决的问题',
      'ov2.what': '结合“基因在疾病模型中是否发生变化”与“其编码蛋白之间如何互作”，'
        + '找出值得进一步研究的帕金森病相关基因。',
      'ov2.find': '看看发生了什么变化',
      'ov2.protein': '看看蛋白之间的联系',
      'ov2.rank': '找到候选基因',
      'ov2.check': '对照另一个模型',
      'ov2.start': '开始寻找候选基因',
      'ov2.known': '查看一个已知基因',
      'ov2.caveat': '本系统只是把基因排序为“值得进一步研究”。它不认定任何治疗靶点，'
        + '这里的候选也不是经过验证的结论。',
      'ov2.where': '你想从哪里开始？',
      'ov2.e1': '找候选基因',
      'ov2.e1d': '用五种方式浏览候选，从少量基因开始。',
      'ov2.e2': '看一个已知基因',
      'ov2.e2d': '打开单个基因（例如 SNCA），查看它的证据。',
      'ov2.e3': '看蛋白网络',
      'ov2.e3d': '查看某个基因对应的蛋白与谁相连。',
      'ov2.e4': '比较我的候选',
      'ov2.e4d': '把最多四个候选并排比较。',
      'ov2.startHere': '你想从哪里开始？',
      'ov2.noGene': '我还没有明确的基因',
      'ov2.noGeneD': '从一小组候选开始，按提示一步步查看。',
      'ov2.browse': '浏览候选基因',
      'ov2.haveGene': '我已经有一个基因',
      'ov2.haveGeneD': '输入基因符号或 Ensembl ID，直接查看它的完整证据。',
      'ov2.genePlaceholder': '例如：SNCA 或 ENSG00000145335',
      'ov2.openGene': '查看这个基因',
      'ov2.searchHint': '可搜索完整的固定基因全集，不只限于排名靠前的基因。',
      'ov2.more': '其他常用入口',
      'ov2.tech': '技术细节 —— 方法、全集、基线方法、稳健性',
      'ov2.what2': '从 PD 疾病模型中发现值得进一步研究的基因，再查看它的表达变化、蛋白联系、'
        + '另一个模型中的表现、相关生物过程和已有 PD 研究。',
      'ov2.pdmodel': 'PD 模型',
      'ov2.expr': '看看发生了什么变化',
      'ov2.indep': '独立 PD 模型',
      'ov2.biointerp': '了解研究背景',
      'ov2.currentModel': '当前模型',
      'ov2.discovery': '发现', 'ov2.validation': '验证',
      'ov2.ranked': '已排名', 'ov2.gwasN': '有 PD 参考证据',
      'ov2.pathwayN': '可检验通路',

      'val.roles': '两个模型角色固定 —— 不可互换',
      'val.disc': '发现模型', 'val.val': '验证模型',
      'val.discUse': '用途：从这里寻找候选基因',
      'val.valUse': '用途：检查候选基因在另一种 PD 模型中是否仍有信号',
      'val.focus': '当前聚焦',
      'val.openGene': '打开基因详情 →',
      'val.clearFocus': '清除',
      'val.stateRule': '“接近零”使用既有验证分析定义 |validation log2FC| < 0.05，不引入任何新阈值。',

      'vs.present': '非近零变化', 'vs.near': '接近零', 'vs.missing': '不可比较',

      'net.layer': '这张网络连接的是蛋白质，不是基因',
      'net.layer.gene': '你搜索的基因',
      'net.layer.prot': '与它互作的蛋白质',
      'net.adv': '高级网络视图（2-hop）',

      'gene.toNetwork': '查看网络',
      'gene.toValidation': '查看验证',
      'gene.toScreening': '返回候选基因',

      'next.title': '下一步该做什么？',
      'next.de': '找到有表达信号的基因后，下一步比较 STAT-DE 和 STRING-RWR 排名。',
      'next.deBtn': '前往候选排名',
      'next.ranking': '选中感兴趣的候选后，下一步查看其蛋白网络。',
      'next.rankingBtn': '查看网络',
      'next.network': '判断它是否具有真实网络上下文后，再查看 PFF 独立验证。',
      'next.networkBtn': '查看验证',
      'next.validation': '把你想继续跟进的基因加入候选清单并导出。',
      'next.validationBtn': '打开基因详情',
      'next.gene': '五步流程集中在一处，并带上你已经建立的候选清单。',
      'next.geneBtn': '打开我的研究',

      'hero.sub': '帕金森病候选基因优先级研究平台',
      'hero.blurb': '将转录组差异表达与 STRING 网络传播相结合，对帕金森病相关候选基因进行优先级排序。',
      'hero.demo': '▶ 开始引导演示',
      'hero.ranking': '跳转到候选排名',
      'hero.method': '方法说明',

      'ov.method': '方法',
      'ov.method.note': '节点全集与相互作用网络在任何表达统计量计算之前就已固定。',
      'flow.rnaseq': 'RNA-seq', 'flow.rnaseq.d': '18 对双端测序 · 黑质',
      'flow.de': '差异表达', 'flow.de.d': 'DESeq2 · MPTP vs Saline（主队列）',
      'flow.net': '固定 STRING 网络',
      'flow.stat': 'STAT-DE-v1', 'flow.stat.d': '仅基于表达量排名',
      'flow.rwr': 'STRING-RWR-v1', 'flow.rwr.d': '网络传播',
      'flow.prio': '候选优先级排序', 'flow.prio.d': '在冻结的节点全集上排名',
      'flow.val': '独立验证', 'flow.val.d': 'PFF vs PBS',

      'card.nodes': '结构节点', 'card.nodes.n': '固定的 U3 全集',
      'card.edges': '图边数', 'card.edges.n': '无向 · 规范化',
      'card.conn': '连通节点', 'card.conn.n': 'degree > 0',
      'card.iso': '孤立节点', 'card.iso.n': '保留 · degree = 0',
      'card.ep': '主队列可分析', 'card.ep.n': 'MPTP vs Saline',
      'card.ev': '验证队列可分析', 'card.ev.n': 'PFF vs PBS',

      'ov.cohorts': '队列', 'ov.baselines': '基线方法', 'ov.universe': '分析全集',
      'ov.primary': '主队列', 'ov.validation': '验证队列', 'ov.source': '数据来源',
      'ov.prole': '主队列用途', 'ov.vrole': '验证队列用途',
      'ov.sprole': '排名特征的唯一来源', 'ov.svrole': '仅用于外部验证',
      'ov.score': '打分', 'ov.tiebreak': '并列规则', 'ov.tiebreak.v': '人类 Ensembl gene_id 的 ASCII 字典序',
      'ov.restart': '重启概率 / 容差', 'ov.isolatedrows': '孤立行',
      'ov.isolatedrows.v': '保持为零，从不重分配',
      'ov.agreement': '一致性',
      'ov.cpm.p': 'CPM 通过 · 主队列', 'ov.cpm.v': 'CPM 通过 · 验证队列',
      'ov.elig.p': '可分析 · 主队列', 'ov.elig.v': '可分析 · 验证队列',
      'ov.ineligible': '不可分析节点', 'ov.ineligible.v': '保留在表中，统计量为 <code>NA</code> — 从不删除',
      'ov.start': '从哪里开始',

      'rob.title': '稳健性',
      'rob.seeds': '个冻结随机种子', 'rob.reported': '直接读取，未重算',
      'rob.lede': '冻结方案预先声明了 20 次 bootstrap 重采样（种子 <code>20260911…20260930</code>），在每个主队列组内按原样本量有放回重采样。这是<b>敏感性分析，绝不用于模型选择</b> —— 本应用其余位置展示的都是全量数据排名，此处不产生任何阈值。',
      'rob.metric': '指标', 'rob.pmean': '主队列均值', 'rob.pmed': '主队列中位数',
      'rob.pmin': '主队列最小', 'rob.pmax': '主队列最大',
      'rob.vmean': '验证均值', 'rob.vmed': '验证中位数',
      'rob.spearman': 'Spearman ρ（对比全量排名）', 'rob.kendall': 'Kendall τ-b（对比全量排名）',
      'rob.top10': 'Top-10 重叠比例', 'rob.top100': 'Top-100 重叠比例',
      'rob.jac100': 'Top-100 Jaccard',
      'rob.how': '如何解读。',
      'rob.howbody': '稳定的部分是<b>排序次序</b>；非常靠前的<b>排名成员</b>则不那么稳定 —— 每组仅 4 个样本时，top-k 重叠偏小是常态，验证队列表现更明显。这是关于抽样噪声的陈述，与生物学无关。',

      'about.title': '关于 / 方法',
      'about.genome': '基因组注释', 'about.ortho': '同源映射',
      'about.ppi': '蛋白网络', 'about.de': '差异表达',
      'about.lfc': 'LFC 收缩', 'about.baselines': '基线方法',
      'about.disclaimer': '科研演示系统 —— 非临床诊断工具。',
      'about.disclaimer.body': '输出结果为仅用于科研的候选基因优先级评分，不构成诊断、治疗建议或临床决策依据。',

      'demo.badge': '引导演示', 'demo.step': '第', 'demo.prev': '← 上一步',
      'demo.next': '下一步 →', 'demo.exit': '退出',
      'demo.q.overview': '这是什么？建立在哪些证据之上？',
      'demo.q.de': '疾病组与对照组之间，哪些基因变化最显著？',
      'demo.q.ranking': '纳入网络背景之后，哪些基因依然重要？',
      'demo.q.network': '某个候选基因在该疾病相关互作网络中处于什么位置？',
      'demo.q.gene': '单个候选基因在各层证据上分别是什么表现？',
      'demo.q.validation': '候选信号能否在独立的 PFF 队列中得到泛化？',
      'demo.q.candidates': '选择一个研究问题，并打开一个真实候选基因。',
      'demo.q.pathway': '目前有哪些通路背景，还有哪些不确定性？',
      'demo.q.workspace': '保留这个候选，用于比较和继续研究。',
      'demo.l.overview': '总览', 'demo.l.de': '差异表达', 'demo.l.ranking': '候选排名',
      'demo.l.network': '网络浏览器', 'demo.l.gene': '基因详情', 'demo.l.validation': '验证',
      'demo.l.candidates': '选择候选', 'demo.l.pathway': '通路证据', 'demo.l.workspace': '我的研究',

      'pg.de': '差异表达', 'pg.ranking': '候选排名',
      'pg.network': '网络浏览器', 'pg.validation': '验证',
      'pg.provenance': '溯源', 'pg.gene': '基因详情',
      'pg.rk.promoted': '网络提升的候选基因',
      'pg.rk.promoted.lede': '指<b>经过网络传播后排名上升</b>的基因 —— 即 Δrank = STAT rank − RWR rank 为正且最大者。这是对已有派生值的展示，不引入任何新的筛选标准，也不改变任何结果。',
      'pg.net.iso': '查看孤立节点',
      'pg.net.search': '搜索基因 —— 符号、Ensembl ID 或小鼠 ID',
      'pg.openGene': '打开基因详情 →',
      'iso.title': '无网络支持。',
      'iso.body': '该节点在冻结网络中没有任何 STRING 边。它的 RWR 排名仅反映<b>重启项 / 种子贡献</b> —— 得不到任何传播而来的网络支持，因为传播既无法到达也无法离开孤立节点。此处 RWR 排名高<b>不等于</b>网络验证。网络背景只是解释属性：不改变任何 STAT-DE 或 RWR 分数与排名。',
      'iso.top1': '该基因同时位居两个排名的第一名，却<b>没有任何 STRING 边</b>。它的 RWR 排名仅反映<b>重启项 / 种子贡献</b> —— 得不到任何传播而来的网络支持，因为传播既无法到达也无法离开孤立节点。<b>这不等于网络验证。</b> 它是落在保留互作网络之外的最强纯表达信号。',
      'nc.iso': '孤立 / 无网络支持', 'nc.conn': '连通 / 经网络传播',
      'nc.label': '网络背景',
    }
  };

  let lang = 'en';
  try { const s = localStorage.getItem('xz.lang'); if (s === 'zh' || s === 'en') lang = s; } catch (e) {}
  // ?lang=zh / ?lang=en overrides and persists — shareable language link.
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') { lang = q; localStorage.setItem('xz.lang', lang); }
  } catch (e) {}

  /** Translate a key. Falls back to the English entry, then to the key itself. */
  function T(key) {
    const d = DICT[lang] || DICT.en;
    return (key in d) ? d[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
  }
  const getLang = () => lang;
  function setLang(l) {
    lang = (l === 'zh') ? 'zh' : 'en';
    try { localStorage.setItem('xz.lang', lang); } catch (e) {}
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }

  /**
   * Wrap one scientific identifier so no browser translation can ever rewrite it.
   *
   * Gene symbols, Ensembl gene ids, study accessions, pathway ids and model names are
   * DATA, not interface copy. A machine-translated "XunZi-PD" (巡子-民主党) or a mangled
   * gene symbol is a corrupted result. The document already blocks translation as a
   * whole (see index.html); this marks the individual values so the guard holds even
   * if that document-level switch is overridden by a browser or an extension.
   */
  function NT(v) {
    const s = (v === null || v === undefined) ? '' : String(v);
    return '<span class="notranslate" translate="no">'
      + s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
      + '</span>';
  }

  return { T, NT, getLang, setLang, DICT };
})();
const T = I18N.T;
const NT = I18N.NT;
