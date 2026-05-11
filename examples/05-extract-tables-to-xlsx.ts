/**
 * Example 05 — Convert a PDF straight to an Excel workbook
 *
 * DWS can return tables as a real .xlsx file in one round trip — perfect for
 * "give me this PDF as a spreadsheet" workflows where you'd otherwise parse
 * JSON cells back into a grid yourself. Each table on the page becomes a
 * worksheet inside the workbook.
 *
 * Default sample: a bank statement — natural fit for "give me this as
 * Excel so I can pivot/sum/filter."
 *
 * Run:
 *   npm run extract:xlsx                        # samples/bank-statement.pdf
 *   npm run extract:xlsx -- samples/x.pdf
 */

import { argPdf, extractToXlsx, saveBytes } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/bank-statement.pdf");
  console.log(`→ Converting ${pdf} to XLSX (tables detected by DWS)`);

  const xlsxBytes = await extractToXlsx(pdf);
  const path = await saveBytes("05-tables.xlsx", xlsxBytes);

  console.log(`✓ Saved ${xlsxBytes.byteLength.toLocaleString()} bytes to ${path}`);
  console.log("  Open it in Excel / Numbers / LibreOffice to see the tables.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
