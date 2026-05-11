/**
 * Example 04 — Extract key-value pairs (KVPs)
 *
 * KVPs are labelled fields like:
 *   Invoice number → 00162
 *   Total          → 1,165.10€
 *
 * DWS's KVP engine recognises them in *unstructured* documents (scans,
 * PDFs without form widgets) using OCR + layout heuristics + ML, and tags
 * each value with a data type (Currency, DateTime, EmailAddress, PhoneNumber,
 * IBAN, URL, …) and a confidence score.
 *
 * NOTE: KVP extraction costs 3 credits/call vs 1 for the other extractors.
 *
 * Default sample: a tax invoice — the textbook KVP target (clear header
 * fields like Invoice #, Total, Date, plus typed values like Currency/Date).
 *
 * Run:
 *   npm run extract:keyvalues                   # samples/tax-invoice.pdf
 *   npm run extract:keyvalues -- samples/x.pdf
 */

import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/tax-invoice.pdf");
  console.log(`→ Extracting key-value pairs from ${pdf}\n`);

  const result = await extract(pdf, { keyValuePairs: true });

  let total = 0;
  for (const [i, page] of result.pages.entries()) {
    if (!page.keyValuePairs?.length) continue;
    console.log(`Page ${i + 1}`);
    console.log(
      "Key".padEnd(28) +
        "Value".padEnd(36) +
        "Type".padEnd(14) +
        "Confidence",
    );
    console.log("-".repeat(90));
    for (const kvp of page.keyValuePairs) {
      total += 1;
      const key = kvp.key.content.replace(/\s+/g, " ").trim().slice(0, 26);
      const value = kvp.value.content.replace(/\s+/g, " ").trim().slice(0, 34);
      const type = kvp.value.dataType ?? "";
      console.log(
        key.padEnd(28) +
          value.padEnd(36) +
          type.padEnd(14) +
          `${kvp.confidence.toFixed(1)}%`,
      );
    }
    console.log();
  }

  if (total === 0) {
    console.log("No key-value pairs detected.");
  } else {
    console.log(`Found ${total} key-value pair${total === 1 ? "" : "s"}.\n`);
  }

  const path = await saveJson("04-key-values.json", result);
  console.log(`✓ Saved full result to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
