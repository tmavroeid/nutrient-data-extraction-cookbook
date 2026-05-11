# Example 05 — Convert a PDF straight to an Excel workbook

Same table detection as example 03, but the response is a real `.xlsx` binary instead of JSON. Each table on the page becomes a worksheet inside the workbook.

> The illustrative output below describes what you'd see when you open the file — DWS returns raw bytes, not a screenshot. Run it to verify against your sample.

## The PDF — before processing

**File:** `samples/bank-statement.pdf`
**Type:** Chase Business High-Yield Savings monthly statement

Same input as example 03. Skim the [tables walkthrough](./03-extract-tables.md) for the page content. The key fact: this PDF contains a summary table (8 rows) plus a multi-page transaction table (100+ rows).

## What the code does

From [`05-extract-tables-to-xlsx.ts`](./05-extract-tables-to-xlsx.ts):

```ts
import { argPdf, extractToXlsx, saveBytes } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/bank-statement.pdf");
  console.log(`→ Converting ${pdf} to XLSX (tables detected by DWS)`);

  const xlsxBytes = await extractToXlsx(pdf);
  const path = await saveBytes("05-tables.xlsx", xlsxBytes);

  console.log(`✓ Saved ${xlsxBytes.byteLength.toLocaleString()} bytes to ${path}`);
}
```

The difference from example 03 is one line of `instructions`:

```ts
// Inside client.ts → extractToXlsx()
{
  parts: [{ file: "document" }],
  output: { type: "xlsx" }   // ← instead of { type: "json-content", tables: true }
}
```

## Running it

```bash
npm run extract:xlsx                              # samples/bank-statement.pdf
npm run extract:xlsx -- samples/x.pdf
```

## Terminal output (illustrative)

```
→ Converting samples/bank-statement.pdf to XLSX (tables detected by DWS)
✓ Saved 42,318 bytes to output/05-tables.xlsx
  Open it in Excel / Numbers / LibreOffice to see the tables.
```

## What the file looks like (after)

Open `output/05-tables.xlsx` in Excel / Numbers / LibreOffice and you'll see something like:

**Sheet 1 — `Table 1` (CHECKING SUMMARY)**

| Description                    | Instances | Amount       |
| ------------------------------ | --------- | ------------ |
| Beginning Balance              |           | $153,960.83  |
| Deposits and Additions         | 16        | 100,650.54   |
| Checks Paid                    | 1         | -821.01      |
| ATM & Debit Card Withdrawals   | 123       | -178,502.43  |
| Electronic Withdrawals         | 17        | -8,051.49    |
| Fees and Other Withdrawals     | 22        | -7,220.00    |
| Ending Balance                 | 179       | $60,015.89   |

**Sheet 2 — `Table 2` (transactions)**

| Date  | Description                            | Amount   | Balance     |
| ----- | -------------------------------------- | -------- | ----------- |
| 10/01 | Card Purchase 09/30 Trader Joes        | -52.31   | 153,908.52  |
| 10/01 | ATM Withdrawal 09/30 #00012345         | -200.00  | 153,708.52  |
| 10/02 | Online Transfer to CHK …7986           | -5,000.00| 148,708.52  |
| …     | …                                      | …        | …           |

…one sheet per detected table.

## What's interesting here

- DWS handles the tables-to-Excel conversion server-side. You don't need `xlsx` / `exceljs` in your own dependencies.
- Cell formatting (numbers vs text) is inferred by DWS — currency strings like `$153,960.83` typically land as text by default; you may want to apply Excel's number format after the fact if you'll sum them.
- For programmatic access to the same data, use [example 03](./03-extract-tables.md) (JSON cells) instead and skip the XLSX deserialisation altogether.
- 1 credit per call (cheap), like the other non-KVP extractors.
