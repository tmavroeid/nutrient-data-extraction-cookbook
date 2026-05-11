# 1. What is data extraction?

**In one sentence:** data extraction reads a PDF and gives you back the information inside it as structured data you can use — not as an image, not as a blob of unsearchable bytes.

## The problem

PDFs are designed for *displaying* documents, not for *reading* them with software. Two PDFs that look identical to a human can be wildly different inside:

- A digitally-generated invoice from a billing system has its text stored as actual text. You can copy and paste it.
- A scanned invoice is a photograph saved as a PDF. There is no text inside — just pixels.
- A government form has *form fields* — clickable boxes that hold values. The labels next to them are usually just decorative text.

If your job is "take these 5,000 invoices and put the numbers into a spreadsheet," you can't just open each one and copy-paste. You need software that can:

1. Find the relevant pieces of information,
2. Recognise them even when the layout varies,
3. Give them back to you with names you can use (`invoice_number`, `total`, `due_date`), and
4. Tell you how confident it is in each one.

That's data extraction.

## What Nutrient DWS extracts

DWS is the **cloud-hosted Data Extraction API**. You send a PDF over HTTPS, you get structured data back. No infrastructure to maintain, no models to train.

| What | Plain-English description |
| --- | --- |
| **Plain text** | The raw words on every page, like running `Select All → Copy` on a PDF — but it works even on scanned PDFs because DWS runs OCR (optical character recognition) for you. |
| **Structured text** | The same words, but with positions. You learn that "Total" is at the top-right of page 2, not just that the word "Total" exists somewhere. |
| **Tables (JSON)** | Rows and columns from financial tables, invoice line items, statements. You get cells with their row/column indexes and which cells are headers. |
| **Tables (XLSX)** | Same detection, but DWS returns a real Excel workbook — one sheet per table. Skip the JSON-to-spreadsheet step entirely. |
| **Key-value pairs (KVPs)** | Labelled fields the engine *infers* from layout, like `Invoice Number → 00162`. Each value is also tagged with a data type — Currency, Date, Email, IBAN, Phone Number, etc. — and a confidence score. |

## How it works under the hood

You don't need this for day-to-day use, but in case you're curious:

1. DWS receives the PDF over HTTPS.
2. If the page has no embedded text (a scan, a photo), it runs **OCR** to recognise characters.
3. It builds a layout model: which words sit near which other words, what looks like a row, a column, a heading.
4. For **key-value pairs**, it uses a mix of rules, math, and machine learning to pair labels with their values. It also classifies each value's *data type* — `2026-05-11` becomes a `DateTime`, `€42.50` becomes a `Currency`, `IE12BOFI` becomes an `IBAN`.
5. For **tables**, it detects row and column boundaries (sometimes from drawn lines, sometimes from alignment) and emits cells.
6. The whole thing comes back as JSON (or .xlsx if you asked for that).
7. Your PDF is deleted from DWS as soon as the response is sent — Nutrient doesn't keep your documents.

## When this is useful

- **Accounts payable**: turn a folder of invoices into a database of line items.
- **Onboarding**: read driver's licenses, IDs, business registration forms.
- **Finance ops**: parse bank statements into transaction tables.
- **Compliance**: pull regulated fields out of reports for audits.
- **Search**: index millions of PDFs so a knowledge worker can actually find a clause they need.
- **Pre-processing for AI**: convert PDFs into clean structured input for an LLM.

## What it won't do

- It won't understand *meaning*. It tells you "this is an invoice number"; it does not tell you "this invoice is overpriced."
- It won't be 100% accurate on every document. Confidence scores exist for a reason — see [`03-understanding-results.md`](./03-understanding-results.md).
- It won't extract from images of handwriting reliably (it can read typed text, including printed forms, well).

## DWS vs. self-hosting

DWS is the **cloud** option. Nutrient also ships a self-hosted version (Document Engine) you can run in your own Docker / Kubernetes. Same API surface, different deployment model. This cookbook focuses on DWS — see [`05-architecture.md`](./05-architecture.md) for a quick comparison if you're evaluating both.

Next up: [`02-when-to-use-which-tool.md`](./02-when-to-use-which-tool.md) — picking the right capability for your document.
