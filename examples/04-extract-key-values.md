# Example 04 — Extract key-value pairs (KVPs)

Detect labelled fields ("Invoice number → 00162") in unstructured documents. The engine tags each value with a data type (Currency, DateTime, EmailAddress, IBAN, PhoneNumber, PostalAddress, …) and a confidence score.

> KVP extraction is **3 credits per call** — the most expensive extractor. Iterate on the cheaper ones first, then turn this on.

> The outputs below are **real**: captured from an actual `npm run extract:keyvalues` run against the included sample. Other examples in this cookbook show illustrative output (clearly marked) until they're run.

## The PDF — before processing

**File:** `samples/tax-invoice.pdf` (6 pages of an Indian medical-store tax invoice), or any other PDF you point the script at.

The run captured below was against a different test PDF — a 1997 cover letter to the Council for Tobacco Research requesting a grant extension. The content doesn't matter much; what matters is the response shape DWS sends back.

Excerpt of that letter:

```
The Mount Sinai Medical Center                       Dorothy H. and Lewis S. Rosenstiel
                                                     Department of Biochemistry
                                                     The Mount Sinai Hospital
                                                     Mount Sinai School of Medicine
                                                     One Gustave L. Levy Place
                                                     New York, NY 10029-6574
                                                     Tel (212) 241-9430
                                                     Fax (212) 996-7214

Dr. Harmon C. McAllister
Vice President-Research
Scientific Director
The Council for Tobacco Research - USA., Inc.
900 Third Avenue
New York, NY 10022

                                                     May 26, 1997

RE: Request of No Cost Extension for Grant 3035

Dear Dr. McAllister:

   This is to kindly ask you to consider a 'No Cost Extension' for my current
   support from the CTR - U.S.A., Inc. …
```

Two pages: page 1 is the letter itself; page 2 is review notes about a tobacco product.

## What the code does

From [`04-extract-key-values.ts`](./04-extract-key-values.ts):

```ts
import { argPdf, extract, saveJson } from "./lib/client.js";

async function main(): Promise<void> {
  const pdf = argPdf("samples/tax-invoice.pdf");
  const result = await extract(pdf, { keyValuePairs: true });

  for (const page of result.pages) {
    if (!page.keyValuePairs?.length) continue;
    console.log(`Page ${page.pageIndex + 1}`);
    console.log(
      "Key".padEnd(28) + "Value".padEnd(36) + "Type".padEnd(14) + "Confidence",
    );
    for (const kvp of page.keyValuePairs) {
      const key   = kvp.key.content.trim().slice(0, 26);
      const value = kvp.value.content.trim().slice(0, 34);
      const type  = kvp.value.dataType;
      console.log(
        key.padEnd(28) + value.padEnd(36) + type.padEnd(14) +
        `${kvp.confidence.toFixed(1)}%`,
      );
    }
  }

  await saveJson("04-key-values.json", result);
}
```

## Running it

```bash
npm run extract:keyvalues                         # samples/tax-invoice.pdf
npm run extract:keyvalues -- samples/x.pdf        # any other PDF
```

## Terminal output (real)

```
→ Extracting key-value pairs from samples/<file>.pdf

Page 1
Key                         Value                               Type             Confidence
------------------------------------------------------------------------------------------
Fax                         (212) 996-7214                      PhoneNumber      100.0%
#                           Mount Sinai School of Medicine…     PostalAddress    70.5%
#                           Vice President-Research…            PostalAddress    69.8%
Tel (212) 241-              943}                                Number           58.5%
#                           May 26, 1997                        DateTime         72.1%

Page 2
Key                         Value                               Type             Confidence
------------------------------------------------------------------------------------------
Dh                          orre                                String           59.0%

Found 6 key-value pairs.

✓ Saved full result to output/04-key-values.json
```

A few things to notice already:

- The engine pulled out two `PostalAddress` values — multi-line, with `\r\n` separators in the content.
- It also pulled a `DateTime` (`May 26, 1997`) and a `PhoneNumber` — even though the layout had no neat "Date:" or "Fax:" label adjacent to them. The `#` key is a placeholder for "I found this value but couldn't pair it with a label."
- One messy pair: it split `Tel (212) 241-9430` into `Tel (212) 241-` → `943}` with low confidence (58%). That's a real OCR glitch — exactly the kind of thing the [recipe example](./07-recipe-invoice-to-record.md) routes to a human-review queue.

## Saved JSON (after) — real DWS response

`output/04-key-values.json` (trimmed for readability; full version on disk):

```jsonc
{
  "pages": [
    {
      "keyValuePairs": [
        {
          "confidence": 100,
          "key":   { "content": "Fax",
                     "bbox": { "left": 386.88, "top": 150.72, "width": 10.8, "height": 6 } },
          "value": { "content": "(212) 996-7214",
                     "dataType": "PhoneNumber",
                     "bbox": { "left": 400.56, "top": 150.96, "width": 46.08, "height": 6.72 } }
        },
        {
          "confidence": 70.5119,
          // Headerless KVP — value detected but no label found nearby.
          "key":   { "content": "#",
                     "bbox": { "left": 0, "top": 0, "width": 0, "height": 0 } },
          "value": { "content": "Mount Sinai School of Medicine\r\nOne Gustave L. Levy Place\r\nNew York, NY 10029-6574",
                     "dataType": "PostalAddress",
                     "bbox": { "left": 266.88, "top": 123.6, "width": 99.36, "height": 34.08 } }
        },
        {
          "confidence": 72.0621,
          "key":   { "content": "#",
                     "bbox": { "left": 0, "top": 0, "width": 0, "height": 0 } },
          "value": { "content": "May 26, 1997", "dataType": "DateTime",
                     "bbox": { "left": 297.36, "top": 302.16, "width": 68.4, "height": 9.84 } }
        }
      ],

      // Even though we only requested keyValuePairs, DWS returns plainText
      // for free alongside.
      "plainText": "                                                                                        The Mount Sinai Medical Center …"
    },
    {
      "keyValuePairs": [
        {
          "confidence": 59.049,
          "key":   { "content": "Dh", "bbox": { /* … */ } },
          "value": { "content": "orre", "dataType": "String", "bbox": { /* … */ } }
        }
      ],
      "plainText": "                                                                                   2\r\n…"
    }
  ]
}
```

## What's interesting here

- **`PostalAddress` dataType**: addresses come back as a single string with `\r\n` between lines. If your downstream system has structured address fields, split on `\r\n` and parse line by line.
- **Headerless KVPs (`key.content: "#"`)**: the engine found a typed value but couldn't confidently attach it to a label. These have a zero-area bbox on the key side. Filter them out of a normalised header map, but still keep them — they're useful for "find any address / phone / date in this PDF" workflows.
- **`plainText` is included with KVP responses for free** — even though only `keyValuePairs: true` was requested. No extra credit cost; just bonus content.
- **Confidence is a float**, not a clean integer percent: you'll see values like `70.5119` and `69.75089`. Format on display.
- **Low confidence ≈ OCR uncertainty**: the `Tel (212) 241-` → `943}` pair shows what happens when OCR mis-reads a digit as `}` — the engine still emits a value but flags it at 58%. The [recipe example](./07-recipe-invoice-to-record.md) routes these to a manual queue.
- 3 credits per call.
