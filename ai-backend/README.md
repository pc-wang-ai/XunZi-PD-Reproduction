# XunZi-PD AI evidence Q&A backend

This is a **fail-closed Cloudflare Worker skeleton**, not a live AI service. It does not call a model and the public GitHub Pages app does not point to it.

It provides the security gate that must be in place before a model adapter is added:

- allowlisted CORS for the public XunZi-PD origin;
- Cloudflare rate-limit binding required on every answer request;
- strict question and gene-ID input bounds;
- pre-model refusal of medical advice and prompt-injection attempts; and
- an `AI_ENABLED=false` default plus a hard failure when no server-side evidence retriever exists.

## Do not add a key to this repository

`OPENAI_API_KEY` must be created as an encrypted Cloudflare Worker Secret only after a human has reviewed the deployment gate in [../docs/AI_QA_SECURITY_DESIGN.md](../docs/AI_QA_SECURITY_DESIGN.md). Do not create `.dev.vars` unless testing locally; it is ignored by Git.

## Local checks

```sh
npm install
npm test
```

No local secret is required for these tests because no model call exists.

## Before any deployment

1. Replace the placeholder rate-limit namespace with an integer unique in your Cloudflare account.
2. Configure an approved, pinned frozen-evidence retriever. It must independently resolve the selected gene; browser-supplied evidence is forbidden.
3. Add the OpenAI key as a Cloudflare Secret, never as a Wrangler variable.
4. Configure the model name, budget, usage alerts, CORS origin, and a public privacy notice.
5. Complete the test and human-review gates in the security design before setting `AI_ENABLED` to `true`.

Cloudflare's current documentation describes encrypted Worker Secrets and the Worker rate-limiting binding. OpenAI's API documentation requires API keys to remain server-side.
