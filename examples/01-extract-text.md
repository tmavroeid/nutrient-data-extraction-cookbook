# Example 01 — Extract plain text

Get the raw text of every page as a single string per page. Use this for search indexing, full-text snapshots, or feeding the PDF to an LLM.

> The default sample `lease-agreement.pdf` is large (4.4 MB, many pages). On the first run against DWS it may **time out (HTTP 408)** — see the troubleshooting note at the bottom and try a smaller file first.

## The PDF — before processing

**File:** `samples/lease-agreement.pdf` (multi-page residential lease, dense legal prose)

Excerpt (first page):

```
                                    RESIDENTIAL LEASE OR
                            MONTH-TO-MONTH RENTAL AGREEMENT

                                                                  ("Landlord") and
                                                                   ("Tenant") agree as follows:

1. PROPERTY:
   A. Landlord rents to Tenant and Tenant rents from Landlord, the real property and improvements
      described as:                                                              ("Premises").
   B. The following personal property is included:

2. TERM: The term begins on (date)                  ("Commencement Date"), (Check A or B):
        A. Month-to-month: and continues as a month-to-month tenancy.
   …

3. RENT:
   A. Tenant agrees to pay rent at the rate of $              per month for the term of the
      Agreement.
   …
```

Lots of fillable blanks, dense legal prose — the canonical "I just want all the text out" target.

## What the code does

From [`01-extract-text.ts`](./01-extract-text.ts):

```ts
import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/lease-agreement.pdf");
  console.log(`→ Extracting plain text from ${pdf}\n`);

  // Single flag → cheapest possible call.
  const result = await extract(pdf, { plainText: true });

  for (const [i, page] of result.pages.entries()) {
    const preview = (page.plainText ?? "").slice(0, 200).replace(/\n/g, " ");
    console.log(`Page ${i + 1}: ${preview}…`);
  }

  await saveJson("01-text.json", result);
}
```

Under the hood, this POSTs to `https://api.nutrient.io/build` with `instructions.output.type: "json-content"` and `plainText: true`.

## Running it

```bash
npm run extract:text                              # uses samples/lease-agreement.pdf
npm run extract:text -- samples/your-doc.pdf      # any PDF
```

## Terminal output

```
→ Extracting plain text from samples/lease-agreement.pdf

Error: DWS /build failed: {
  "error": {
    "details": "The request timed out.",
    "requestId": "GK6Zesrg3wHjWSwAABGi",
    "status": 408,
    "supportUrl": "https://www.nutrient.io/api/support/"
  }
}
```

This is a known case — the lease PDF is large enough that the server-side processing exceeds the default timeout. See **Troubleshooting** below.

When it succeeds (e.g. on a smaller PDF):

```
→ Extracting plain text from samples/loan-application.pdf

Page 1: To be completed by the Lender: Lender Loan No./Universal Loan Identifier Agency Case No. Uniform Residential Loan Application…
Page 2: Section 1: Borrower Information. 1a. Personal Information Name (First, Middle, Last, Suffix) Social Security Number…
…

✓ Saved full result to output/01-text.json
```

## Saved JSON (after)

`output/01-text.json` — one entry per page, just the string:

```jsonc
{
  "pages": [
    {
      "plainText": "RESIDENTIAL LEASE OR\r\nMONTH-TO-MONTH RENTAL AGREEMENT\r\n\r\n(\"Landlord\") and\r\n(\"Tenant\") agree as follows:\r\n\r\n1. PROPERTY:\r\n   A. Landlord rents to Tenant…"
    }
    // …more pages, all in document order
  ]
}
```

## What's interesting here

- Line endings are **`\r\n`** in the returned strings.
- Pages don't carry a `pageIndex` field — iterate with `entries()` / `enumerate()`.
- Fillable blanks in the lease (rent amount, dates, landlord name) collapse to whitespace in plain text. If you need to detect them, switch to [`extract:keyvalues`](./04-extract-key-values.md).
- A single PDF page usually returns a few thousand characters. For LLM input, chunk by paragraph — [`02-extract-structured-text`](./02-extract-structured-text.md) gives you paragraph boundaries explicitly.
- 1 credit per call regardless of page count (subject to file-size limits in the free tier).

## Troubleshooting: 408 timeouts on large PDFs

The lease agreement is 4.4 MB and many pages — large enough that DWS sometimes hits the server-side timeout for a single `/build` call.

If you see:

```
DWS /build failed: { "error": { "details": "The request timed out.", "status": 408, … } }
```

Try one of these:

- **Run against a smaller PDF first** to verify your setup:
  ```bash
  npm run extract:text -- samples/loan-application.pdf
  ```
- **Split the PDF** with a tool like `pdftk` or `qpdf` (or via DWS's own page-split action) and process page ranges separately. Each piece is a separate `/build` call.
- **Drop heavier extractors** — if `extract:all` is timing out, narrow it down (e.g. just `plainText`, or just `keyValuePairs`).
- **Contact DWS support** with the `requestId` from the error — they can correlate it to server logs.
