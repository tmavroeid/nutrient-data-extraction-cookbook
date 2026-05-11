# Nutrient DWS Data Extraction Cookbook

A friendly, runnable guide to extracting **text, tables, key‑value pairs, and structured content** from PDFs with **Nutrient DWS** (Document Web Services) — the cloud-hosted Data Extraction API.

This repo has two tracks:

- A **non‑developer track** in [`docs/`](./docs) — what data extraction is, when to use which capability, how to read the results.
- A **developer track** in [`examples/`](./examples) — runnable Node.js / TypeScript scripts that call DWS and print structured output.

Both tracks use the same sample PDFs in [`samples/`](./samples), so you can read about a capability, then watch it run.

---

## Quick start (developers)

```bash
# 1. Install dependencies
npm install

# 2. Pick an environment to run against:
#    a) Production DWS — sign up (free, 200 credits/month) and copy your key:
#       https://dashboard.nutrient.io/sign_up/?product=processor
#    b) Local DWS Dashboard — if you have the PSPDFKit `hosted` stack running
#       locally (it serves the dashboard at http://localhost:4000), mint an
#       API key from its UI and point DWS_BASE_URL at it.

# 3. Configure
cp .env.example .env
# Edit .env, paste your API key into DWS_API_KEY, and (if using local) set
# DWS_BASE_URL=http://localhost:4000.

# 4. samples/ already ships with five PDFs (invoice, bank statement,
#    loan application, lease agreement, doctors note). You can add your own.

# 5. Run an example — each defaults to its best-fit sample PDF
npm run extract:text             # → lease-agreement.pdf
npm run extract:tables           # → bank-statement.pdf
npm run extract:keyvalues        # → tax-invoice.pdf
npm run extract:xlsx             # → bank-statement.pdf
npm run extract:all              # → tax-invoice.pdf
npm run recipe:invoice           # tax-invoice → clean structured record
```

Each script writes its result to `output/` and prints a human‑friendly summary to the terminal. The local dashboard and production DWS expose the same API contract, so the examples are identical against either.

## Quick start (non‑developers)

Open the [`docs/`](./docs) folder and read in order:

1. [`01-what-is-data-extraction.md`](./docs/01-what-is-data-extraction.md) — the 5‑minute overview.
2. [`02-when-to-use-which-tool.md`](./docs/02-when-to-use-which-tool.md) — pick the right capability for your document.
3. [`03-understanding-results.md`](./docs/03-understanding-results.md) — confidence scores, data types, bounding boxes — explained without jargon.
4. [`04-glossary.md`](./docs/04-glossary.md) — terms you'll see in API responses.
5. [`05-architecture.md`](./docs/05-architecture.md) — how the pieces connect, for the curious.

You don't need to install anything to follow the docs. If you want to *see* extraction happen, ask a developer on your team to run an example, or try the [hosted playground](https://dashboard.nutrient.io/processor-api/playground/) after signing up.

---

## What's in this repo

```
nutrient-data-extraction-cookbook/
├── README.md                              ← you are here
├── docs/                                  ← non-developer concept guide
├── examples/                              ← runnable TypeScript + walkthroughs
│   ├── lib/client.ts                      ← shared DWS client
│   ├── 01-extract-text.ts / .md           ← plain text → lease agreement
│   ├── 02-extract-structured-text.ts / .md ← text + bboxes → loan application
│   ├── 03-extract-tables.ts / .md         ← tables → bank statement
│   ├── 04-extract-key-values.ts / .md     ← KVPs → tax invoice
│   ├── 05-extract-tables-to-xlsx.ts / .md ← tables → Excel → bank statement
│   ├── 06-extract-all.ts / .md            ← everything → tax invoice
│   └── 07-recipe-invoice-to-record.ts /.md ← real-world pattern: PDF → record
├── samples/                               ← 5 ready-to-use PDFs
│   ├── tax-invoice.pdf
│   ├── bank-statement.pdf
│   ├── loan-application.pdf
│   ├── lease-agreement.pdf
│   └── doctors-note.pdf
└── output/                                ← results land here (gitignored)
```

Each example has a sibling `.md` walkthrough showing the input PDF, the relevant code snippet, the terminal output, and the saved JSON shape annotated — read those for the fastest "what does this actually do" answer.

## Which capability does what?

All five capabilities are served by the same endpoint: `POST https://api.nutrient.io/build`. You toggle them in the `output` block of the `instructions` JSON.

| Capability | Best for | API flag | Walkthrough |
| --- | --- | --- | --- |
| **Plain text** | Search indexing, full‑text snapshots, LLM input | `output.plainText: true` | [`01-extract-text.md`](./examples/01-extract-text.md) |
| **Structured text** | Layout‑aware processing, knowing *where* a word sits | `output.structuredText: true` | [`02-extract-structured-text.md`](./examples/02-extract-structured-text.md) |
| **Tables → JSON** | Programmatic access to rows, columns, headers | `output.tables: true` | [`03-extract-tables.md`](./examples/03-extract-tables.md) |
| **Key‑value pairs** | Forms, invoices, receipts — pulls out labelled fields | `output.keyValuePairs: true` | [`04-extract-key-values.md`](./examples/04-extract-key-values.md) |
| **Tables → XLSX** | "Give me this PDF as a spreadsheet" — one round trip | `output.type: "xlsx"` | [`05-extract-tables-to-xlsx.md`](./examples/05-extract-tables-to-xlsx.md) |
| **All-in-one** | One call, everything | All four flags | [`06-extract-all.md`](./examples/06-extract-all.md) |
| **Recipe: PDF → record** | Real-world invoice pipeline pattern | KVPs + tables, then shape | [`07-recipe-invoice-to-record.md`](./examples/07-recipe-invoice-to-record.md) |

See [`docs/02-when-to-use-which-tool.md`](./docs/02-when-to-use-which-tool.md) for help choosing.

## Requirements

- **Node.js** 20+
- An API key for whichever DWS environment you target:
  - **Production DWS** — [sign up](https://dashboard.nutrient.io/sign_up/?product=processor) (free tier: 200 credits/month).
  - **Local DWS Dashboard** — the PSPDFKit `hosted` repo serves the dashboard at `http://localhost:4000` once `docker-compose up` is running. Mint an API key from the local dashboard UI.

## A note on credits

DWS charges credits per call. As of writing:

- Text / tables / structured text: typically **1 credit** per call
- Key‑value pair extraction: **3 credits** per call
- XLSX export of a PDF with tables: **1 credit** per call

A clean digitally-generated PDF and a scanned PDF cost the same — OCR is included. See [DWS pricing](https://www.nutrient.io/api/pricing/processor-api/) for the current credit table and [calculate credit usage](https://www.nutrient.io/guides/dws-processor/pricing/calculate-credit-usage/) for the formula.

## License

MIT. Sample PDFs may have their own licenses — see [`samples/README.md`](./samples/README.md).
