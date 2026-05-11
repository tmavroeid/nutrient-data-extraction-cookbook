/**
 * Example 06 — Extract everything in one /build call
 *
 * Sometimes you want it all: text, structured text, KVPs, tables — in one
 * round trip. DWS returns a single merged response. This is the pattern most
 * production pipelines settle on (and is still only one credit charge for
 * non-KVP flags, plus the KVP credits if those are enabled).
 *
 * Default sample: a tax invoice — has all four signal types in one document.
 *
 * Run:
 *   npm run extract:all                         # samples/tax-invoice.pdf
 *   npm run extract:all -- samples/x.pdf
 */

import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/tax-invoice.pdf");
  console.log(`→ Extracting everything from ${pdf}\n`);

  const result = await extract(pdf, {
    plainText: true,
    structuredText: true,
    keyValuePairs: true,
    tables: true,
  });

  for (const page of result.pages) {
    const wordCount = page.structuredText?.words.length ?? 0;
    const kvpCount = page.keyValuePairs?.length ?? 0;
    const tableCount = page.tables?.length ?? 0;
    console.log(
      `Page ${page.pageIndex + 1}: ${wordCount} words, ${kvpCount} key-value pairs, ${tableCount} tables`,
    );
  }

  const path = await saveJson("06-all.json", result);
  console.log(`\n✓ Saved full result to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
