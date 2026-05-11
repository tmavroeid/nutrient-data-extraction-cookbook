# Sample PDFs

This folder ships with five representative sample PDFs so the examples run out-of-the-box. Each PDF is paired with the example that best showcases it.

| File | Best example | Why it's a good demo |
| --- | --- | --- |
| `tax-invoice.pdf` | `extract:keyvalues`, `extract:all`, `recipe:invoice` | Clean header fields (Invoice #, Total, Date, VAT) plus a line-item table — the textbook KVP + tables target. |
| `bank-statement.pdf` | `extract:tables`, `extract:xlsx` | Long table of transactions — the prototypical "give me this as a spreadsheet" use case. |
| `loan-application.pdf` | `extract:structured-text` | Form-style layout with clear columns where bounding-box positions matter for downstream processing. |
| `lease-agreement.pdf` | `extract:text` | Many pages of legal prose — pure "I just need all the text" workflow (e.g. feeding to an LLM). |
| `doctors-note.pdf` | `extract:keyvalues` | Short medical form with patient labels and values — a different KVP context than commercial invoices. |

## How the defaults work

Every `npm run extract:*` script defaults to the most fitting sample:

```bash
npm run extract:text         # → samples/lease-agreement.pdf
npm run extract:structured-text  # → samples/loan-application.pdf
npm run extract:tables       # → samples/bank-statement.pdf
npm run extract:keyvalues    # → samples/tax-invoice.pdf
npm run extract:xlsx         # → samples/bank-statement.pdf
npm run extract:all          # → samples/tax-invoice.pdf
npm run recipe:invoice       # → samples/tax-invoice.pdf
```

You can always override with any PDF path:

```bash
npm run extract:keyvalues -- samples/doctors-note.pdf
npm run extract:tables    -- samples/tax-invoice.pdf
```

## Mix and match — exploring per-document

Once you have a feel for the basics, try unexpected combinations:

```bash
# What KVPs does DWS find in a bank statement? (account #, period, balances)
npm run extract:keyvalues -- samples/bank-statement.pdf

# Does the loan application contain extractable tables?
npm run extract:tables -- samples/loan-application.pdf

# Try the doctors-note as XLSX — likely empty since there are no real tables.
# Useful to see how DWS responds when the target capability isn't present.
npm run extract:xlsx -- samples/doctors-note.pdf
```

## A note on credits

If you're on the free tier (200 credits/month), watch out: KVP extraction is **3 credits per call** vs 1 for the others. Iterating with `extract:text` is cheap; iterating with `extract:keyvalues` against five PDFs costs 15 credits per pass.

## A note on the samples themselves

These PDFs were provided as part of this cookbook scaffold and may contain synthetic / sample data. Don't redistribute outside this repo without checking with the original source.
