/* Server-only DeepSeek Responses adapter. Never put a key or model name in browser code. */
const MAX_ANSWER_CHARS = 1600;

function outputText(payload) {
  return (payload.output || []).flatMap(item => item.content || [])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text).join('\n').trim();
}

export function isAllowedResearchQuestion(question) {
  return /mptp|pff|rank|ranking|network|protein|pathway|process|genetic|gwas|evidence|candidate|research|missing|limited|为什么|发生|排名|网络|蛋白|通路|过程|遗传|证据|候选|缺少|研究/i.test(question);
}

export async function askEvidenceModel({ question, evidence, language, env, fetchImpl = fetch }) {
  if (!env.DEEPSEEK_API_KEY || !env.DEEPSEEK_MODEL) return { error: 'model_not_configured' };
  const context = {
    gene: evidence.gene,
    evidence: evidence.evidence,
    pathway_membership: evidence.pathway_membership,
    pd_reference: evidence.pd_reference,
    boundary: evidence.boundary,
    source_snapshot: evidence.source_snapshot,
  };
  const instructions = `You explain one frozen XunZi-PD research evidence record in ${language === 'zh' ? 'Chinese' : 'English'}.
Use ONLY the supplied JSON evidence. Do not use tools, web search, outside knowledge, or unstated inference.
Do not diagnose, discuss symptoms, treatment, drugs, prognosis, disease causality, or validated therapeutic targets.
If evidence is missing, say that the loaded snapshot cannot answer it. Preserve gene symbols, identifiers, pathway IDs and study accessions exactly. Keep the answer under 180 words and end with the supplied research boundary.`;
  // DeepSeek documents a Responses API compatible with this endpoint. No tools,
  // web search, file search, or browser capabilities are requested.
  const response = await fetchImpl('https://api.deepseek.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_MODEL, store: false, max_output_tokens: 450, instructions,
      input: `Question: ${question}\n\nFrozen evidence JSON:\n${JSON.stringify(context)}` }),
  });
  if (!response.ok) return { error: 'model_unavailable' };
  let payload;
  try { payload = await response.json(); } catch { return { error: 'model_unavailable' }; }
  const answer = outputText(payload);
  if (!answer || answer.length > MAX_ANSWER_CHARS) return { error: 'invalid_model_output' };
  return { answer };
}
