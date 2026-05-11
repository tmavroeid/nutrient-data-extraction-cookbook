# Example 06 — Extract everything in one `/build` call

Turn every extractor on at once. DWS returns a single merged response. This is the pattern most production pipelines settle on — one round trip, one credit charge for the non-KVP flags (plus the KVP credits if those are enabled).

> The outputs below are **real**: captured from `npm run extract:all` against `samples/tax-invoice.pdf`.

## The PDF — before processing

**File:** `samples/tax-invoice.pdf` (6 pages of an Indian medical-store tax invoice)

The richest demo doc in the cookbook: clear header fields, line-item tables, dense prose.

## What the code does

From [`06-extract-all.ts`](./06-extract-all.ts):

```ts
import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/tax-invoice.pdf");
  const result = await extract(pdf, {
    plainText: true,
    structuredText: true,
    keyValuePairs: true,
    tables: true,
  });

  for (const [i, page] of result.pages.entries()) {
    const wordCount  = page.structuredText?.words.length ?? 0;
    const kvpCount   = page.keyValuePairs?.length ?? 0;
    const tableCount = page.tables?.length ?? 0;
    console.log(
      `Page ${i + 1}: ${wordCount} words, ` +
      `${kvpCount} key-value pairs, ${tableCount} tables`,
    );
  }

  await saveJson("06-all.json", result);
}
```

## Running it

```bash
npm run extract:all                               # samples/tax-invoice.pdf
npm run extract:all -- samples/x.pdf
```

## Terminal output (real)

```
→ Extracting everything from samples/tax-invoice.pdf

Page 1: 243 words, 25 key-value pairs, 0 tables
Page 2: 189 words, 24 key-value pairs, 0 tables
Page 3: 190 words, 19 key-value pairs, 0 tables
Page 4: 150 words, 18 key-value pairs, 0 tables
Page 5: 189 words, 23 key-value pairs, 1 tables
Page 6: 140 words, 15 key-value pairs, 0 tables

✓ Saved full result to output/06-all.json
```

Only one detectable table on six pages of this PDF — even though the page *visually* contains line-item rows. The KVP engine pulled most of the data out instead, which is a common outcome for invoices where rows aren't separated by lines or strong alignment.

## Saved JSON (after) — real shape

`output/06-all.json` (~1.8 MB) is structured like this per page:

```jsonc
{
  "pages": [
    {
      "plainText": "BPS2589H1Z4 Cash\nSOM MEDICAL STORE…",
      "structuredText": {
        "confidence": 89,
        "words": [
          {
            "value": "BPS2589H1Z4",
            "bbox": { /* … */ },
            "characterCount": 11, "firstCharacterIndex": 0,
            "isFromDictionary": false,
            "confidence": 78.4
          }
          // …242 more
        ],
        "lines":      [ /* …126 more */ ],
        "paragraphs": [ /* …82 more */ ],
        "characters": [ /* …2306 more */ ]
      },
      "keyValuePairs": [
        {
          "confidence": 56.096546,
          "key":   { "content": "31/Marl2024",      // ← a date acting as a "label"
                     "bbox": { /* … */ } },
          "value": { "content": "30/Jun/2025",
                     "dataType": "DateTime",
                     "bbox": { /* … */ } }
        }
        // …24 more on this page
      ],
      "tables": []                                  // none detected on page 1
    }
    // …5 more pages
  ]
}
```

## What's interesting here

- **No `pageIndex` field** — iterate with `result.pages.entries()` in JS.
- **The response is large** (1.8 MB for 6 pages here). If you don't need `structuredText`, leave it off — it accounts for most of the size (characters/words/lines/paragraphs arrays).
- **KVP keys aren't always real labels.** The 56%-confidence example above (`"31/Marl2024" → "30/Jun/2025"`) shows the engine pairing two adjacent dates. The [recipe example](./07-recipe-invoice-to-record.md) was updated to reject keys that look like data.
- **No tables on most pages of this invoice** even though there are visually row-like structures. KVPs pick up most of that information instead. Real-world tip: combine `tables: true` *and* `keyValuePairs: true` for invoice-style PDFs — they cover different ground.
- Credit cost = (1 if any of plainText/structuredText/tables is on) + (3 if keyValuePairs is on). Enabling all four costs **4 credits**.
