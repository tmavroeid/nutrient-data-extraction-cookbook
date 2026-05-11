/**
 * Example 07 — Recipe: Tax invoice → clean structured record
 *
 * The "I want to put 5,000 invoices into a database" pattern. This file
 * combines KVPs and tables from one DWS /build call and shapes the response
 * into a domain record your downstream system can actually use, with
 * confidence-based filtering.
 *
 * Run:
 *   npm run recipe:invoice                     # samples/tax-invoice.pdf
 *   npm run recipe:invoice -- samples/x.pdf
 *
 * Output:
 *   - output/07-invoice-record.json     — the clean record
 *   - output/07-invoice-raw.json        — the full DWS response (debugging)
 */

import {
  argPdf,
  extract,
  saveJson,
  type ExtractionResult,
  type KeyValuePair,
  type Table,
} from "./lib/client.js";

/** Domain record we want to produce from any invoice PDF. */
interface InvoiceRecord {
  /** Original PDF file name (helpful when batch-processing). */
  source: string;
  /** Header fields the engine found. Each carries its confidence score. */
  header: Record<string, { value: string; dataType: string; confidence: number }>;
  /** Line items reconstructed from detected tables. Empty if none found. */
  lineItems: Record<string, string>[];
  /** Anything below the confidence threshold for a manual-review queue. */
  needsReview: Array<{ key: string; value: string; confidence: number }>;
}

/** Below this confidence, we don't trust the value and flag it for review. */
const CONFIDENCE_THRESHOLD = 85;

/**
 * Normalise a label like "Invoice number :" → "invoice_number" so the
 * downstream record has stable, predictable keys regardless of how the
 * label is printed in any given PDF.
 */
function normalizeKey(rawKey: string): string {
  return rawKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Pull header fields out of the KVP array. */
function collectHeader(
  pages: ExtractionResult["pages"],
): { header: InvoiceRecord["header"]; review: InvoiceRecord["needsReview"] } {
  const header: InvoiceRecord["header"] = {};
  const review: InvoiceRecord["needsReview"] = [];

  for (const page of pages) {
    for (const kvp of page.keyValuePairs ?? []) {
      const key = normalizeKey(kvp.key.content);
      if (!key) continue;
      const entry = {
        value: kvp.value.content.trim(),
        dataType: kvp.value.dataType,
        confidence: kvp.confidence,
      };
      if (kvp.confidence >= CONFIDENCE_THRESHOLD) {
        // First high-confidence value wins (KVP engines sometimes emit duplicates).
        if (!header[key]) header[key] = entry;
      } else {
        review.push({ key, value: entry.value, confidence: kvp.confidence });
      }
    }
  }
  return { header, review };
}

/**
 * Turn a table's cells back into row objects keyed by column header.
 * Falls back to "col_N" if a column has no header cell.
 */
function tableToRows(table: Table): Record<string, string>[] {
  const headerCells = table.cells.filter((c) => c.isHeader);
  const dataCells = table.cells.filter((c) => !c.isHeader);

  const columnNames: Record<number, string> = {};
  for (const cell of headerCells) {
    const name = normalizeKey(cell.text) || `col_${cell.columnIndex}`;
    columnNames[cell.columnIndex] = name;
  }

  const rows: Record<string, Record<string, string>> = {};
  for (const cell of dataCells) {
    const rowKey = String(cell.rowIndex);
    rows[rowKey] ??= {};
    const colName =
      columnNames[cell.columnIndex] ?? `col_${cell.columnIndex}`;
    rows[rowKey][colName] = cell.text.replace(/\s+/g, " ").trim();
  }

  return Object.entries(rows)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, row]) => row);
}

async function main(): Promise<void> {
  const pdf = argPdf("samples/tax-invoice.pdf");
  console.log(`→ Extracting invoice record from ${pdf}\n`);

  const raw = await extract(pdf, {
    keyValuePairs: true,
    tables: true,
  });

  const { header, review } = collectHeader(raw.pages);
  const lineItems = raw.pages.flatMap((p) => (p.tables ?? []).flatMap(tableToRows));

  const record: InvoiceRecord = {
    source: pdf,
    header,
    lineItems,
    needsReview: review.sort((a, b) => a.confidence - b.confidence),
  };

  // Friendly terminal summary.
  console.log("Header fields (high-confidence):");
  for (const [k, v] of Object.entries(record.header)) {
    console.log(
      `  ${k.padEnd(24)} ${v.value.padEnd(28)} [${v.dataType}, ${v.confidence.toFixed(1)}%]`,
    );
  }
  console.log(`\nLine items: ${record.lineItems.length}`);
  for (const item of record.lineItems.slice(0, 5)) {
    console.log("  " + JSON.stringify(item));
  }
  if (record.lineItems.length > 5) {
    console.log(`  …and ${record.lineItems.length - 5} more`);
  }
  console.log(
    `\nNeeds human review: ${record.needsReview.length} field${record.needsReview.length === 1 ? "" : "s"} (confidence < ${CONFIDENCE_THRESHOLD}%)`,
  );

  const recordPath = await saveJson("07-invoice-record.json", record);
  const rawPath = await saveJson("07-invoice-raw.json", raw);
  console.log(`\n✓ Clean record:  ${recordPath}`);
  console.log(`✓ Raw response:  ${rawPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
