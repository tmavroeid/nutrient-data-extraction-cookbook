/**
 * Example 03 — Extract tables
 *
 * Best for invoices, financial statements, and any PDF where the value
 * you care about lives inside a grid of rows and columns. DWS returns
 * each table as a list of cells (with rowIndex / columnIndex / isHeader),
 * plus row, column, and line geometry so you can rebuild the shape if you
 * need to.
 *
 * Default sample: a bank statement — typically dozens of transaction rows,
 * the prototypical "PDF table" use case.
 *
 * Run:
 *   npm run extract:tables                      # samples/bank-statement.pdf
 *   npm run extract:tables -- samples/x.pdf
 */

import { argPdf, extract, saveJson, type Table } from "./lib/client.js";

/** Render a table as a quick ASCII grid for terminal preview. */
function previewTable(table: Table): string {
  const rowCount = table.rows.length;
  const colCount = table.columns.length;
  const grid: string[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ""),
  );
  for (const cell of table.cells) {
    if (cell.rowIndex < rowCount && cell.columnIndex < colCount) {
      grid[cell.rowIndex][cell.columnIndex] = cell.text.replace(/\s+/g, " ").trim();
    }
  }
  const widths = Array.from({ length: colCount }, (_, c) =>
    Math.min(28, Math.max(...grid.map((row) => row[c]?.length ?? 0), 3)),
  );
  const lines: string[] = [];
  for (const row of grid) {
    lines.push(
      "| " +
        row
          .map((cell, c) => (cell ?? "").padEnd(widths[c]).slice(0, widths[c]))
          .join(" | ") +
        " |",
    );
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const pdf = argPdf("samples/bank-statement.pdf");
  console.log(`→ Extracting tables from ${pdf}\n`);

  const result = await extract(pdf, { tables: true });

  let tableCount = 0;
  for (const [i, page] of result.pages.entries()) {
    if (!page.tables?.length) continue;
    for (const table of page.tables) {
      tableCount += 1;
      console.log(
        `Page ${i + 1} — table ${tableCount} ` +
          `(confidence ${table.confidence.toFixed(1)}%, ${table.rows.length} rows × ${table.columns.length} cols)`,
      );
      console.log(previewTable(table));
      console.log();
    }
  }

  if (tableCount === 0) {
    console.log("No tables detected. Try a PDF with a clear tabular layout.");
  }

  const path = await saveJson("03-tables.json", result);
  console.log(`✓ Saved full result to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
