# Example 02 — Extract structured text (with positions)

Get text plus bounding boxes for characters, words, lines, and paragraphs — and a per-page OCR confidence score plus per-word confidence. Use this when you need to know *where* something is on the page, or to inspect OCR reliability.

> The outputs below are **real**: captured from `npm run extract:structured-text` against `samples/loan-application.pdf`.

## The PDF — before processing

**File:** `samples/loan-application.pdf` (9-page Uniform Residential Loan Application)

Excerpt:

```
To be completed by the Lender:
Lender Loan No./Universal Loan Identifier                                Agency Case No.

Uniform Residential Loan Application
Verify and complete the information on this application. …

Section 1: Borrower Information.

 1a. Personal Information
Name (First, Middle, Last, Suffix)                Social Security Number       –   –
                                                  (or Individual Taxpayer Identification Number)

Marital Status      Dependents (not listed by another Borrower)   Contact Information
 Married            Number                                        Home Phone (   )    –
 Separated          Ages                                          Cell Phone  (   )    –
```

## What the code does

From [`02-extract-structured-text.ts`](./02-extract-structured-text.ts):

```ts
import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/loan-application.pdf");
  const result = await extract(pdf, { structuredText: true });

  for (const [i, page] of result.pages.entries()) {
    const st = page.structuredText;
    if (!st) continue;
    const conf = st.confidence !== undefined
      ? `, OCR confidence ${st.confidence.toFixed(1)}%` : "";
    console.log(
      `Page ${i + 1}: ${st.paragraphs.length} paragraphs, ` +
      `${st.lines.length} lines, ${st.words.length} words${conf}`,
    );
  }

  await saveJson("02-structured-text.json", result);
}
```

## Running it

```bash
npm run extract:structured-text                   # samples/loan-application.pdf
npm run extract:structured-text -- samples/x.pdf
```

## Terminal output (real)

```
→ Extracting structured text from samples/loan-application.pdf

Page 1:  83 paragraphs, 126 lines,  443 words, OCR confidence 93.0%
Page 2:  75 paragraphs, 106 lines,  331 words, OCR confidence 92.0%
Page 3:  58 paragraphs, 103 lines,  397 words, OCR confidence 90.0%
Page 4: 130 paragraphs, 163 lines,  391 words, OCR confidence 93.0%
Page 5:  40 paragraphs,  69 lines,  322 words, OCR confidence 91.0%
Page 6:  57 paragraphs,  63 lines,  487 words, OCR confidence 94.0%
Page 7:  19 paragraphs, 100 lines,  834 words, OCR confidence 95.0%
Page 8:  24 paragraphs,  64 lines,  559 words, OCR confidence 91.0%
Page 9:   6 paragraphs,  19 lines,   60 words, OCR confidence 95.0%

✓ Saved full result to output/02-structured-text.json
```

The full file is ~5.5 MB.

## Saved JSON (after) — real shape

`output/02-structured-text.json`:

```jsonc
{
  "pages": [
    {
      "plainText": "To be completed by the Lender:\r\nLender Loan No./Universal Loan Identifier …",
      "structuredText": {
        "confidence": 93,                       // per-page OCR confidence (0–100)
        "words": [
          {
            "value": "To",
            "bbox": { "left": 41.04, "top": 41.76, "width": 6.24, "height": 4.8 },
            "characterCount": 2,
            "firstCharacterIndex": 0,
            "isFromDictionary": true,
            "confidence": 96.38657              // per-word OCR confidence (0–100)
          }
          // …442 more
        ],
        "lines": [
          {
            "bbox": { "left": 41.04, "top": 41.52, "width": 88.08, "height": 6.48 },
            "firstWordIndex": 0,
            "wordCount": 6,
            "isRTL": false,
            "isVertical": false
          }
          // …125 more
        ],
        "paragraphs": [
          {
            "bbox": { "left": 41.04, "top": 41.52, "width": 425.76, "height": 15.36 },
            "firstLineIndex": 0,
            "lineCount": 3
          }
          // …82 more
        ],
        "characters": [
          { "value": "T", "bbox": { "left": 41.04, "top": 41.76, "width": 3.36, "height": 4.8 } },
          { "value": "o", "bbox": { /* … */ } }
          // …2305 more
        ]
      }
    }
    // …8 more pages
  ]
}
```

## What's interesting here

- **`plainText` is returned even though we only requested `structuredText`** — DWS includes the raw text for free on every extraction response. No extra credit cost.
- **Pages don't carry a `pageIndex` field** — they're implicitly ordered by their position in the `pages` array. Use the array index (`pages.entries()` in JS, `enumerate(pages)` in Python) when you need a page number.
- **`structuredText.confidence`** is per-page (0–100). On this loan form it ranges from 90 to 95 — comfortably high for a digitally-generated PDF.
- **`words[i].confidence`** is per-word (0–100). Useful to spot specific OCR errors without scanning the whole page — sort by ascending confidence and look at the bottom 1%.
- Bounding boxes are in **PDF points** (1 pt = 1/72 inch), origin at top-left of the page.
- 1 credit per call.
