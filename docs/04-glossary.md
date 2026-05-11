# 4. Glossary

Quick definitions of the terms you'll see in this guide and in API responses.

**API key** — your DWS credential. Sent in the `Authorization: Bearer <API_KEY>` header. Get one from <https://dashboard.nutrient.io>.

**bbox** — bounding box. `{ left, top, width, height }` in PDF points, origin top-left.

**`/build`** — the DWS endpoint that does extraction (and many other things). You POST a multipart request containing the PDF and an `instructions` JSON; it returns extracted data or a generated file.

**Confidence score** — number from 0 to 100. The engine's self-assessed certainty for a particular value or table.

**Credit** — the unit DWS bills in. Free tier is 200 credits/month. Different capabilities consume different amounts (text = 1, KVPs = 3).

**Data type** — for key-value pairs, a classification of the value (Currency, DateTime, EmailAddress, IBAN, Number, Percentage, PhoneNumber, PostalAddress, String, UID, URL).

**Document Engine** — Nutrient's self-hostable version of DWS. Same API contract, different deployment.

**DWS (Document Web Services)** — Nutrient's hosted cloud offering. The product this cookbook targets.

**`json-content`** — the `output.type` you pass in extraction instructions to get back structured JSON.

**KVP (key-value pair)** — a labelled field the engine *infers* from page layout. Different from form fields, which are explicit PDF objects.

**Layout understanding** — the engine's ability to reason about where things sit on the page and which labels go with which values.

**Multipart request** — an HTTP POST body that contains multiple "parts" — typically the PDF file and a JSON `instructions` payload. The standard format for file uploads.

**OCR (optical character recognition)** — turning pixels back into text. DWS runs OCR automatically when a page has no embedded text.

**Page index** — zero-based page position. `pageIndex: 0` is the first page.

**Plain text** — the raw text content of a page as a single string. No positions, no structure.

**Structured text** — characters, words, lines, paragraphs with bounding boxes.

**Table cell** — `{ rowIndex, columnIndex, isHeader, text, bbox }`. Cells can have row/column spans for merged cells.

**XLSX output** — DWS can return the detected tables as a real Excel workbook instead of JSON. Set `output.type: "xlsx"` in your instructions.
