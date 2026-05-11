/**
 * Example 02 — Extract structured text (with positions)
 *
 * Structured text gives you characters, words, lines and paragraphs along
 * with their bounding boxes. Use it when you need to know *where* something
 * is on the page — for re-flowing PDFs, highlighting search hits, or feeding
 * a downstream layout-aware model.
 *
 * Default sample: a loan application form. It has clear column-based layout
 * where positions actually matter for downstream processing.
 *
 * Run:
 *   npm run extract:structured-text                 # samples/loan-application.pdf
 *   npm run extract:structured-text -- samples/x.pdf
 */

import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/loan-application.pdf");
  console.log(`→ Extracting structured text from ${pdf}\n`);

  const result = await extract(pdf, { structuredText: true });

  for (const [i, page] of result.pages.entries()) {
    const st = page.structuredText;
    if (!st) continue;
    const conf = st.confidence !== undefined ? `, OCR confidence ${st.confidence.toFixed(1)}%` : "";
    console.log(
      `Page ${i + 1}: ${st.paragraphs.length} paragraphs, ${st.lines.length} lines, ${st.words.length} words${conf}`,
    );
    const sampleWord = st.words[0];
    if (sampleWord) {
      console.log(
        `  e.g. word "${sampleWord.value}" at (${sampleWord.bbox.left}, ${sampleWord.bbox.top})`,
      );
    }
  }

  const path = await saveJson("02-structured-text.json", result);
  console.log(`\n✓ Saved full result to ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
