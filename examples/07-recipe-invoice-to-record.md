# Example 07 — Recipe: tax invoice → clean structured record

The pattern most teams actually end up needing: take a raw DWS response and shape it into a tidy domain object with normalised keys, parsed line items, and a confidence-based human-review queue.

> The outputs below are **real**: captured from `npm run recipe:invoice` against `samples/tax-invoice.pdf`. The recipe code has since been updated with two extra heuristics (see below) to drop more noise.

## The PDF — before processing

**File:** `samples/tax-invoice.pdf` (6-page Indian medical-store tax invoice)

## The shape we want to produce

Not just "the raw DWS response," but a database-friendly record:

```ts
interface InvoiceRecord {
  source: string;                                       // file name
  header: Record<string, {                              // header KVPs, normalised keys
    value: string;
    dataType: string;
    confidence: number;
  }>;
  lineItems: Record<string, string>[];                  // table rows, keyed by header
  needsReview: { key: string; value: string;            // low-confidence queue
                 confidence: number }[];
}
```

## What the code does (with two heuristics learned from real data)

From [`07-recipe-invoice-to-record.ts`](./07-recipe-invoice-to-record.ts):

```ts
const CONFIDENCE_THRESHOLD = 85;

/** "Invoice number :" → "invoice_number" — stable, predictable keys. */
function normalizeKey(rawKey: string): string {
  return rawKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Reject pairs where the "key" is actually data (a date, currency, or number).
 * Real example seen in the wild: DWS paired "31/Marl2024" → "30/Jun/2025".
 */
function keyLooksLikeData(rawKey: string): boolean {
  const trimmed = rawKey.trim();
  if (!trimmed) return true;
  if (/^\d{1,4}[\/\-.]\w+[\/\-.]\d{1,4}$/.test(trimmed)) return true;   // date-ish
  if (/^[-+]?[\d.,]+\s*[€$£%]?$/.test(trimmed)) return true;             // currency / number
  return false;
}

function collectHeader(pages: ExtractionResult["pages"]) {
  const header: InvoiceRecord["header"] = {};
  const review: InvoiceRecord["needsReview"] = [];
  for (const page of pages) {
    for (const kvp of page.keyValuePairs ?? []) {
      // 1. Skip "headerless" pairs (key.content === "#" with zero bbox).
      const isHeaderless =
        kvp.key.content === "#" &&
        kvp.key.bbox.width === 0 &&
        kvp.key.bbox.height === 0;
      if (isHeaderless) continue;

      // 2. Skip pairs where the key is actually a data value.
      if (keyLooksLikeData(kvp.key.content)) continue;

      const key = normalizeKey(kvp.key.content);
      if (!key) continue;
      const entry = {
        value: kvp.value.content.trim(),
        dataType: kvp.value.dataType,
        confidence: kvp.confidence,
      };
      if (kvp.confidence >= CONFIDENCE_THRESHOLD) {
        if (!header[key]) header[key] = entry;
      } else {
        review.push({ key, value: entry.value, confidence: kvp.confidence });
      }
    }
  }
  return { header, review };
}

// Drop tables with no real data cells (DWS sometimes emits "tables"
// that are just empty headers — they'd pollute lineItems with {} rows).
const usefulTables = raw.pages
  .flatMap((p) => p.tables ?? [])
  .filter((t) => t.cells.some((c) => !c.isHeader && c.text.trim() !== ""));
const lineItems = usefulTables
  .flatMap(tableToRows)
  .filter((row) => Object.values(row).some((v) => v !== ""));
```

## Running it

```bash
npm run recipe:invoice                            # samples/tax-invoice.pdf
npm run recipe:invoice -- samples/your.pdf
```

## Saved JSON (after) — real recipe output on `tax-invoice.pdf`

`output/07-invoice-record.json`, captured **after** the empty-table and `keyLooksLikeData` heuristics were added:

```jsonc
{
  "source": "samples/tax-invoice.pdf",
  "header": {
    "date":      { "value": "31/Aug/2023",         "dataType": "DateTime", "confidence": 100 },
    "total_amt": { "value": "3406.31",             "dataType": "Number",   "confidence": 94.27 },
    "cgst":      { "value": "191.59",              "dataType": "Currency", "confidence": 93.50 },
    "sgst":      { "value": "191.59",              "dataType": "Currency", "confidence": 97.82 },
    "t_name":    { "value": "Mrdula Srivastava",   "dataType": "String",   "confidence": 88.03 },
    "no":        { "value": "1",                   "dataType": "Number",   "confidence": 100 },
    "tor_name":  { "value": "Dr Raghvendra Singh", "dataType": "String",   "confidence": 88.03 },
    "qty":       { "value": "14",                  "dataType": "Number",   "confidence": 100 }
  },
  "lineItems": [],                                 // empty: heuristic dropped a junk table
  "needsReview": [
    { "key": "p23f034",     "value": "83150002",   "confidence": 53.29 },
    { "key": "23dd46t",     "value": "SEP-22092",  "confidence": 53.29 },
    { "key": "kp09170",     "value": "1235",       "confidence": 53.39 }
    // …69 entries total
  ]
}
```

### Before-vs-after the heuristics

| | Before | After |
| --- | --- | --- |
| `header` entries | 8 | 8 |
| `lineItems` entries | 1 garbage `{col_0:"",col_1:""}` | **0** |
| `needsReview` entries | 72 | 69 (3 caught by `keyLooksLikeData`) |

The empty-table filter is the big win — it cleanly removes a confusing junk row that would otherwise leak into a downstream pipeline.

The `keyLooksLikeData` regex only catches 3 cases here because most of the remaining noise in `needsReview` are *OCR-mangled batch IDs* (e.g. `p23f034`, `23dd46t`, `kp09170`) acting as labels — they don't match a date/number/currency pattern and look superficially like real keys. You can:

- **Tighten the heuristic** to catch these (e.g. reject keys that look like a typical batch-id pattern in your domain).
- Or — usually better — **let them stay in `needsReview`** and have your downstream consumer ignore them via an allowlist of expected header field names.

Some of the kept `header` keys (`t_name`, `tor_name`, `qty`, `no`) are **fragments of column headers** that the KVP engine paired with adjacent values. Real production pipelines pair this recipe with a known-list of expected fields for the document type rather than trusting every >85%-confidence pair.

## What's interesting here

- **The header is *mostly* useful** — `date`, `total_amt`, `cgst`, `sgst` are spot on, with high confidence. These are the fields you'd actually populate a database with.
- **OCR errors leak in** — `Mrdula Srivastava` (missing "i") shows the engine's OCR is reasonable but not perfect. Real pipelines spell-check person names against a customer DB.
- **Confidence does its job** — every clearly-wrong pair (`'p23f034' -> '83150002'`) landed in `needsReview`, not `header`. That's the production-safe behaviour you want.
- **Empty tables don't pollute results anymore** — the new filter dropped a `{col_0:"", col_1:""}` row that would otherwise have ended up in `lineItems`.
- **Tables on this invoice are rough.** Visually there are line-item rows but the engine only detected one (mostly empty) table across 6 pages. For production line-item extraction, consider combining KVPs with a heuristic table parser, or pre-OCR the document with higher-quality settings if you control the upload.
- The raw response stays in `output/07-invoice-raw.json` so you can debug exactly what DWS sent back.
- Credit cost: **4 credits** per call (KVPs + tables).
