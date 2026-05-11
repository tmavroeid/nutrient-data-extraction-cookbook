# 6. Troubleshooting

Common problems when running the examples against Nutrient DWS.

## "Missing env var DWS_API_KEY"

You haven't created `.env` yet, or you forgot to replace `replace_me`.

```bash
cp .env.example .env
# then edit .env and set DWS_API_KEY
```

Get a key at <https://dashboard.nutrient.io/processor-api/api_keys/> (sign up first if you haven't — 200 credits/month free).

## "401 Unauthorized"

Your `DWS_API_KEY` is wrong, expired, or revoked. Tokens are sent as `Authorization: Bearer <value>` — the client in this repo handles that for you. Verify the key in your dashboard.

## "402 Payment Required" or "credit limit exceeded"

You've burned through your monthly credits. Either wait for the cycle to roll over or upgrade your plan at <https://www.nutrient.io/api/pricing/processor-api/>.

Watch out: key-value extraction is **3 credits per call**, so it eats your quota fastest. Use `extract:text` while you're iterating, then turn on KVPs once your pipeline is settled.

## "415 Unsupported Media Type"

The multipart body is malformed. The client uses `undici`'s `FormData` + `File`, which DWS expects. If you've modified the request, double-check that the `instructions` part is a JSON string and the file part is a real `File` (not a stream object).

## "No tables detected" but there clearly are tables

A few things to try:

- Make sure the page actually has tabular layout, not just visually-aligned text. Tables work best when there are drawn lines or strong alignment.
- Confirm the OCR language matches the document (`OCR_LANGUAGE` in `.env`).
- Try the XLSX output (`npm run extract:xlsx`) — sometimes the visual confirmation in Excel is faster than reading JSON.
- Try a different page or document. Quality varies by source.

## "fetch failed" / ECONNRESET

A network blip. Retry. If it keeps happening, check <https://status.nutrient.io> (or contact support).

## "408 The request timed out"

The server-side processing exceeded the per-call timeout. Most commonly seen on **large multi-page PDFs** (think 4 MB+ or many dozens of pages), or when several heavy extractors are enabled simultaneously on a complex document.

The error includes a `requestId` you can quote to DWS support.

Mitigations:

- Try a smaller PDF first to confirm the rest of your setup works.
- Split the PDF into page ranges and process each piece in its own `/build` call (use `pdftk`, `qpdf`, or DWS's own document-split action).
- Drop heavier extractors. If `extract:all` times out, run `extract:text` and `extract:keyvalues` separately.
- For genuinely huge documents, consider self-hosted Document Engine — it has no per-call timeout you don't control.

## OCR is slow

OCR is the most compute-intensive operation. Tips:

- Disable structured text and tables if you only need plain text.
- Pre-process: if your scans are 600 DPI, downscaling to 300 DPI is usually invisible to OCR accuracy and twice as fast.

## Getting the wrong language back

OCR defaults to `english`. For other languages set `OCR_LANGUAGE` in `.env`. See the [language support guide](https://www.nutrient.io/guides/document-engine/ocr/language-support/) for the full list.

## How do I see the raw response while debugging?

Every example saves the full JSON response to `output/<step>.json` (or `output/05-tables.xlsx` for the XLSX example). Open it in your editor — it has everything DWS returned, untouched.

## "I need to read fillable form widget values, not OCR a form"

That's not a DWS feature. Use [self-hosted Document Engine](https://www.nutrient.io/sdk/document-engine/), which has a stateful `/api/documents/:id/form-field-values` endpoint. The cookbook's `02-when-to-use-which-tool.md` covers when to pick which.
