# 5. Architecture (for the curious)

This page shows how DWS fits into your system. Helpful for developers wiring extraction into a larger workflow, and for non-developers who want to understand what they're paying for.

## High-level picture

```
  ┌──────────────┐     POST /build (multipart)     ┌─────────────────────┐
  │  Your app    │ ──────────────────────────────► │   Nutrient DWS      │
  │  (Node, Py,  │     PDF + instructions          │   api.nutrient.io   │
  │   curl, …)   │ ◄────────────────────────────── │                     │
  └──────────────┘     JSON (or XLSX)              └─────────┬───────────┘
                                                             │
                                            ┌────────────────┴──────────────┐
                                            │                               │
                                      ┌─────▼─────┐               ┌─────────▼────────┐
                                      │   OCR     │               │   Layout + ML    │
                                      │  engine   │               │   models         │
                                      └───────────┘               └──────────────────┘
```

You can run the same API against three deployments:

| Deployment | Base URL | Auth header | Best for |
| --- | --- | --- | --- |
| Production DWS | `https://api.nutrient.io` | `Authorization: Bearer <key>` | Real workloads |
| Local DWS Dashboard (dev) | `http://localhost:4000` | `Authorization: Bearer <key>` | Iterating against a local copy of DWS — the PSPDFKit `hosted` repo runs the dashboard locally and exposes the same Bearer + `/build` contract |
| Self-hosted Document Engine | `http://your-host:5000` | `Authorization: Token token=<token>` | Regulated, on-prem |

This cookbook targets DWS (both production and local dashboard). If you need to hit a self-hosted Document Engine directly, the URL/endpoint/auth need to change — see the table at the bottom of this page for the full delta.

## The Build API

Extraction on DWS is **one endpoint with many output shapes**: `POST /build`. You upload the PDF as a multipart part, plus an `instructions` part with the output shape you want.

For extraction-as-JSON:

```json
{
  "parts": [{ "file": "document" }],
  "output": {
    "type": "json-content",
    "plainText": true,
    "keyValuePairs": true,
    "tables": true,
    "structuredText": true,
    "language": "english"
  }
}
```

For tables-as-Excel:

```json
{
  "parts": [{ "file": "document" }],
  "output": { "type": "xlsx" }
}
```

Stateless. The PDF isn't kept on Nutrient's infrastructure after the response is sent.

## Where extraction fits in a real pipeline

A typical production setup looks like:

```
  S3 / blob storage          Queue          Workers (Node/Python)        Database
  ─────────────────  ─►  ─────────────  ─►  ────────────────────  ─►  ────────────
  raw PDFs arrive       per-PDF jobs       POST /build → JSON,        structured
                                           validate confidence,        rows
                                           retry low-confidence
                                           into a human review
                                           queue
```

Things to think about:

- **Confidence thresholds**: a worker can auto-accept results above 90% and push anything lower to a human review queue.
- **Retries**: transient failures (5xx, timeouts) should be retried; "no tables found" is *not* a transient failure.
- **Credit budget**: monitor your DWS dashboard. KVP extraction is 3× the cost of plain text — don't enable it indiscriminately.
- **PII**: even though DWS doesn't store your PDFs, *your* logs and queues might. Treat upstream/downstream the same way you would any pipeline touching personal data.

## DWS vs. self-hosted Document Engine

| | Nutrient DWS (this cookbook) | Self-hosted Document Engine |
| --- | --- | --- |
| Where it runs | Nutrient's cloud | Your infra (Docker, Kubernetes) |
| Base URL | `https://api.nutrient.io` | `http://your-host:5000` |
| Auth | `Authorization: Bearer <API_KEY>` | `Authorization: Token token=<TOKEN>` |
| Build endpoint | `POST /build` | `POST /api/build` |
| Billing | Credits per call | License (seats / volume) |
| Data egress | Your PDFs hit Nutrient's servers | None — never leaves your network |
| Form-field widget reading | Not available | Stateful `/api/documents/:id/form-fields` |
| Best for | Fast time-to-value, no ops | Regulated industries, on-prem |

Switching from DWS to self-hosted (or vice versa) for *extraction* is mostly a base URL + endpoint path + auth header change. The instructions JSON shape is identical.

## Security & privacy at a glance

- All traffic over HTTPS.
- PDFs deleted from Nutrient infrastructure as soon as the request finishes.
- No training on your documents.
- See [DWS security docs](https://www.nutrient.io/guides/dws-processor/security/) and [privacy docs](https://www.nutrient.io/guides/dws-processor/privacy/) for the full picture before sending regulated data.
