# XunZi-PD AI evidence Q&A backend

This is a **fail-closed Cloudflare Worker**. The public app can show its status, but AI remains disabled until the owner completes the enablement checklist below.

It provides the security gate that must be in place before a model adapter is added:

- allowlisted CORS for the public XunZi-PD origin;
- Cloudflare rate-limit binding required on every answer request;
- strict question and gene-ID input bounds;
- pre-model refusal of medical advice and prompt-injection attempts; and
- an `AI_ENABLED=false` default plus a hard failure when no server-side evidence retriever exists.
- a server-side DeepSeek Responses adapter that sends only a short allowed research question and independently retrieved frozen evidence; it disables API storage and exposes no tools.

## Frozen-evidence endpoint (not wired into the UI)

`POST /v1/evidence` accepts only a selected `gene_id` and returns citations generated
from a pinned public evidence snapshot. It independently loads the exact Git commit
and verifies the SHA-256 of the MPTP/PFF/network, pathway, and PD-reference files
before parsing. It never trusts browser-supplied evidence and never calls an AI model.

Example request body:

```json
{ "gene_id": "SNCA" }
```

The endpoint is research-only. Its response preserves scientific identifiers and
includes the same non-causality/non-validated-target boundary used by the app.

## Do not add a key to this repository

`DEEPSEEK_API_KEY` must be created as an encrypted Cloudflare Worker Secret only after a human has reviewed the deployment gate in [../docs/AI_QA_SECURITY_DESIGN.md](../docs/AI_QA_SECURITY_DESIGN.md). Do not create `.dev.vars` unless testing locally; it is ignored by Git.

## Local checks

```sh
npm install
npm test
```

No local secret is required for these tests because no model call exists.

## Before any deployment

1. Replace the placeholder rate-limit namespace with an integer unique in your Cloudflare account.
2. Review the implemented approved, pinned frozen-evidence retriever and its hash checks. It independently resolves the selected gene; browser-supplied evidence is forbidden.
3. Add the OpenAI key as a Cloudflare Secret, never as a Wrangler variable.
4. Configure the model name, budget, usage alerts, CORS origin, and a public privacy notice.
5. Complete the test and human-review gates in the security design before setting `AI_ENABLED` to `true`.

## Owner enablement steps (required; not automated)

1. In the DeepSeek API Platform, create an API key and configure a small prepaid balance or usage limit. Keep the key private.
2. In Cloudflare Workers for `xunzi-pd-reproduction`, add the key as encrypted secret `DEEPSEEK_API_KEY`; never paste it into GitHub, this repository, or the browser.
3. Choose a pinned DeepSeek text model suitable for the project budget and set `DEEPSEEK_MODEL` to its exact API name in the Worker environment/configuration.
4. Review the public privacy page and deployment gate, then explicitly set `AI_ENABLED` to `true` only after a human test of refusals, citations and mobile UI.

Until every step is complete, `/v1/answer` returns a safe error and cannot call a model.

Cloudflare's current documentation describes encrypted Worker Secrets and the Worker rate-limiting binding. OpenAI's API documentation requires API keys to remain server-side.
