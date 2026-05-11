/**
 * Example 01 — Extract plain text from a PDF
 *
 * Use this when you want the raw text content of every page, for example
 * to feed it into a search index or an LLM. No layout, no bounding boxes,
 * just strings.
 *
 * Default sample: a multi-page lease agreement (lots of legal prose — the
 * canonical "I just want all the text out" use case).
 *
 * Run:
 *   npm run extract:text                          # uses samples/lease-agreement.pdf
 *   npm run extract:text -- samples/your.pdf      # any PDF you point at
 */

import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/lease-agreement.pdf");
  console.log(`→ Extracting plain text from ${pdf}\n`);

  const result = await extract(pdf, { plainText: true });

  // Print a short preview per page.
  for (const page of result.pages) {
    const preview = (page.plainText ?? "").slice(0, 200).replace(/\n/g, " ");
    console.log(`Page ${page.pageIndex + 1}: ${preview}${preview.length === 200 ? "…" : ""}`);
  }

  const path = await saveJson("01-text.json", result);
  console.log(`\n✓ Saved full result to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
