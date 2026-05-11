# Example 03 — Extract tables (JSON)

Detect tabular regions on each page and return them as cells with `rowIndex` / `columnIndex` / `isHeader` plus full geometry. The prototypical "give me the rows out of this PDF" use case.

> The outputs below are **real**: captured from `npm run extract:tables` against `samples/bank-statement.pdf`.

## The PDF — before processing

**File:** `samples/bank-statement.pdf` (10-page Chase Business Checking statement)

Page-1 summary block:

```
                             October 01, 2021 through October 31, 2021
JPMorgan Chase Bank, N.A.                       Account Number: 000000710753986

                             Chase BusinessSelect Checking
CHECKING SUMMARY                INSTANCES                AMOUNT

Beginning Balance                                  $153,960.83
Deposits and Additions             16              100,650.54
Checks Paid                         1                 -821.01
ATM & Debit Card Withdrawals      123             -178,502.43
Electronic Withdrawals             17               -8,051.49
Fees and Other Withdrawals         22               -7,220.00
Ending Balance                    179              $60,015.89
```

Subsequent pages: dated transaction line items (the dense table where extraction earns its credits).

## What the code does

From [`03-extract-tables.ts`](./03-extract-tables.ts):

```ts
import { argPdf, extract, saveJson, type Table } from "./lib/client.js";

function previewTable(table: Table): string {
  // Renders the table as an ASCII grid for terminal preview.
  // (See the source file for the full implementation.)
}

async function main(): Promise<void> {
  const pdf = argPdf("samples/bank-statement.pdf");
  const result = await extract(pdf, { tables: true });

  for (const [i, page] of result.pages.entries()) {
    for (const table of page.tables ?? []) {
      console.log(
        `Page ${i + 1} — table (confidence ${table.confidence}, ` +
        `${table.rows.length} rows × ${table.columns.length} cols)`,
      );
      console.log(previewTable(table));
    }
  }

  await saveJson("03-tables.json", result);
}
```

## Running it

```bash
npm run extract:tables                            # samples/bank-statement.pdf
npm run extract:tables -- samples/x.pdf
```

## Terminal output (real, abbreviated)

```
→ Extracting tables from samples/bank-statement.pdf

Page 1 — table 1 (confidence 100, 6 rows × 2 cols)
| 16   | 100,650.54   |
| 1    | -821.01      |
| 123  | -178,502.43  |
| 17   | -8,051.49    |
| 22   | -7,220.00    |
| 179  | $60,015.89   |

Page 3 — table 1 (confidence 100, 17 rows × 3 cols)
| DATE  | DESCRIPTION                              | AMOUNT     |
| 10/01 | American Express Settlement 4...         | $8,465.00  |
…

Page 5 — table 1 (confidence 100, 18 rows × 4 cols)
| DATE  | DESCRIPTION    |                                  | AMOUNT |
| 10/11 | Card Purchase  | 10/07 U R* LA Sandwicherie Mi…   | 13.45  |
Page 5 — table 2 (confidence 100, 11 rows × 4 cols)
| 10/12 | Card Purchase  | 10/10 U R* Sunset Grille & Ra…   | 79.40  |
| 10/12 | Card Purchase  | 10/10 U R* Exxonmobil 9674…      | 17.74  |
…
```

Across 10 pages this PDF produced **14 tables** in total.

## Saved JSON (after) — real shape

`output/03-tables.json` (excerpt):

```jsonc
{
  "pages": [
    {
      "plainText": "          CHASE\r\n…",   // also returned, regardless of which flag was set
      "tables": [
        {
          "confidence": 100,
          "bbox": { "left": 205.2, "top": 458.88, "width": 173.76, "height": 78.72 },
          "rows": [
            { "bbox": { "left": 205.2, "top": 458.88, "width": 173.76, "height": 10.56 } }
            // …5 more
          ],
          "columns": [
            { "bbox": { "left": 205.2, "top": 458.88, "width":  87.36, "height": 78.72 } }
            // …1 more
          ],
          "cells": [
            {
              "rowIndex": 0, "columnIndex": 0,
              "isHeader": true,                  // ← see "What's interesting" below
              "text": "16",
              "bbox": { "left": 205.2, "top": 458.88, "width": 87.36, "height": 10.56 }
            },
            {
              "rowIndex": 0, "columnIndex": 1,
              "isHeader": true,
              "text": "100,650.54",
              "bbox": { /* … */ }
            },
            {
              "rowIndex": 1, "columnIndex": 0,
              "isHeader": false,
              "text": "1",
              "bbox": { /* … */ }
            }
            // …rest of the cells
          ],
          "lines": []                              // empty when no drawn rules on the table
        }
      ]
    }
    // …9 more pages
  ]
}
```

## What's interesting here

- **`confidence` is often an integer (`100`)** on clean PDFs, but **a float on harder ones**. Format with care; don't assume `.toFixed()`.
- **A single visual table can come back as multiple `tables[]` entries.** Page 5 of this statement has *4* tables and page 6 has *5* — DWS treats column-shifted blocks of the same visual list as separate tables. Concatenate by page if you need "one big transactions list."
- **`isHeader: true` is not always the column header you'd write.** On page 1 of this statement, DWS detected only the right side of the summary block (the Instances + Amount columns), and marked the data row `"16" / "100,650.54"` as the header. Use header cells as *hints* for column naming, but verify against expected schema if the downstream system depends on it. The [recipe example](./07-recipe-invoice-to-record.md) was updated to drop tables where every "data" cell is empty.
- **`lines` is often `[]`** even for valid tables — that's "no drawn ruling lines detected," not "no table." Use `cells` as the source of truth.
- **`plainText` is returned alongside `tables`** for free.
- **Pages don't carry a `pageIndex`** — iterate with `entries()` / `enumerate()`.
- 1 credit per call.

For "tables-as-Excel-workbook" instead of JSON, see [`05-extract-tables-to-xlsx.md`](./05-extract-tables-to-xlsx.md).
