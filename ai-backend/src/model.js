/* Server-only DeepSeek Responses adapter. Never put a key or model name in browser code. */
// Chinese answers contain far more characters per word than English. Keep a hard
// bound, but leave enough room for a short Chinese evidence explanation.
const MAX_ANSWER_CHARS = 3000;
// A non-secret, reviewed production default. This avoids making a missing dashboard
// variable silently disable a Worker whose model is already pinned in source control.
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';

function outputText(payload) {
  // DeepSeek exposes the completed text through the Responses SDK's
  // `output_text` convenience field. Prefer it, then retain the compatible
  // structured-output parser for providers that omit the convenience field.
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  return (payload.output || []).flatMap(item => item.content || [])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text).join('\n').trim();
}

export function isAllowedResearchQuestion(question) {
  return /mptp|pff|rank|ranking|network|protein|pathway|process|genetic|gwas|evidence|candidate|research|missing|limited|为什么|发生|排名|网络|蛋白|通路|过程|遗传|证据|候选|缺少|研究/i.test(question);
}

export async function askEvidenceModel({ question, evidence, language, env, fetchImpl = fetch }) {
  if (!env.DEEPSEEK_API_KEY) return { error: 'model_not_configured' };
  const model = env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL;
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
If evidence is missing, say that the loaded snapshot cannot answer it. Preserve gene symbols, identifiers, pathway IDs and study accessions exactly. Keep the answer concise: under 160 English words or 700 Chinese characters, and end with the supplied research boundary.`;
  // DeepSeek documents a Responses API compatible with this endpoint. No tools,
  // web search, file search, or browser capabilities are requested.
  const response = await fetchImpl('https://api.deepseek.com/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, store: false, max_output_tokens: 450, instructions,
      input: `Question: ${question}\n\nFrozen evidence JSON:\n${JSON.stringify(context)}` }),
  });
  if (!response.ok) return { error: 'model_unavailable' };
  let payload;
  try { payload = await response.json(); } catch { return { error: 'model_unavailable' }; }
  const answer = outputText(payload);
  if (!answer) return { error: 'invalid_model_output' };
  // The UI renders field citations and the fixed research boundary separately.
  // Truncating an unexpectedly verbose model explanation is safer and more useful
  // than discarding an otherwise valid evidence-only response.
  return { answer: answer.length > MAX_ANSWER_CHARS
    ? `${answer.slice(0, MAX_ANSWER_CHARS - 1).trimEnd()}…`
    : answer };
}
