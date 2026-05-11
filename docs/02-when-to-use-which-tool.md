# 2. When to use which extraction capability

Nutrient DWS exposes the capabilities below through one endpoint (`POST /build`). Picking the right one (or the right *combination*) makes a big difference in accuracy and credit cost.

## Quick decision tree

```
What do you need from the PDF?
│
├── "Just the text, all of it"  ──────────────────────────►  Plain text
│       e.g. building a search index, feeding it to an LLM
│
├── "Text AND where each word sits on the page"  ─────────►  Structured text
│       e.g. highlighting matches, layout-aware processing
│
├── "Rows and columns" (invoice line items, statements)
│   │
│   ├── "I want JSON I can parse programmatically"  ──────►  Tables → JSON
│   │
│   └── "I want a spreadsheet a human can open"  ─────────►  Tables → XLSX
│
└── "Labelled fields" the engine has to infer from the
    page layout (Invoice number, Total, Date)  ───────────►  Key-value pairs
```

## Side-by-side

| Capability | Works on scans? | Output | Credit cost* | When to reach for it |
| --- | --- | --- | --- | --- |
| Plain text | Yes (OCR) | One string per page | 1 | Search, LLM pre-processing |
| Structured text | Yes (OCR) | Characters, words, lines, paragraphs — with positions | 1 | Highlighting, layout-aware downstream models |
| Tables → JSON | Yes (OCR) | Cells with `rowIndex` / `columnIndex` / `isHeader` | 1 | Invoices, statements, programmatic table use |
| Tables → XLSX | Yes (OCR) | A real Excel file with one sheet per table | 1 | "Give a human a spreadsheet" workflows |
| Key-value pairs | Yes (OCR) | Pairs with `dataType` and `confidence` | 3 | Forms, invoices, receipts — unstructured layouts |

\* Credit costs as of writing. Check [the latest pricing](https://www.nutrient.io/api/pricing/processor-api/) before budgeting at scale.

## Common combinations

- **Invoice → spreadsheet**: combine `tables` *and* `keyValuePairs` in a single JSON call. Tables grab the line items; KVPs grab the header fields (Invoice Number, Total, Due Date). If a human will consume the result, use the XLSX output instead and pair it with a separate KVP call for the header fields.
- **Bank statement**: `tables` for transactions; `keyValuePairs` for account number and statement period.
- **Building search**: just `plainText`. Anything more is wasted credits.
- **Pre-processing for an LLM**: `plainText` plus `structuredText` if you also need layout cues.

## "Should I always turn everything on?"

You *can* — DWS returns one merged response. But:

- Extracting tables on a PDF with no tables is harmless but slow.
- KVP extraction is 3× the credit cost of plain text. Don't enable it if you don't need labelled fields.
- Smaller responses are easier to debug.

A reasonable default for "I don't know what's in this PDF yet": `plainText: true, keyValuePairs: true`. Add `tables: true` only if your documents are tabular.

## When DWS is *not* the right tool

A few cases where you'd reach for something else:

- **Fillable AcroForm/XFA values**: DWS is stateless and doesn't expose a "read this form's field widgets" endpoint. If you have true fillable PDFs and need their widget values, use Nutrient's self-hosted Document Engine, which has a stateful `/api/documents/:id/form-field-values` endpoint.
- **You can't send documents over the internet** (regulated industry, on-prem requirements): use self-hosted Document Engine for in-network processing.
- **You need synchronous extraction at very high QPS**: contact Nutrient about Managed Document Engine; DWS rate limits are designed for typical business workloads.

Next up: [`03-understanding-results.md`](./03-understanding-results.md) — confidence scores, bounding boxes, and what each data type means.
