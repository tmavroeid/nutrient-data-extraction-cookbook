# 3. Understanding the results

When Document Engine returns extracted data, every piece of it is annotated. Knowing how to read those annotations is the difference between "looks great" and "this saved us 200 hours a month."

## Bounding boxes (`bbox`)

Every extracted thing — every word, every cell, every key-value pair — comes with a `bbox`:

```json
{ "left": 102, "top": 78, "width": 64, "height": 14 }
```

This describes where on the page the thing is, in PDF points (1 point = 1/72 inch). The origin `(0, 0)` is the **top-left of the page**, x grows to the right, y grows downward.

You'd use this to draw a red rectangle around an extracted value in a UI, or to feed downstream tools that need positions.

## Confidence scores

Tables and key-value pairs come with a `confidence` number from 0 to 100. Think of it as "how sure is the engine that this is right?"

| Confidence band | What it usually means |
| --- | --- |
| 95–100 | The engine is very sure. Treat as ground truth. |
| 75–95 | High confidence. Useful directly, but worth spot-checking. |
| 50–75 | Probably right but the layout was ambiguous. Add a human review step. |
| < 50 | Low confidence. Best surfaced for human verification or filtered out. |

A common pattern: auto-process anything above 90, route the rest to a human queue.

> Important: confidence is **per-pair** or **per-table**, not per-document. One invoice can have a 100%-confidence Total and a 60%-confidence Customer Name.

## Data types (KVPs)

Every key-value pair value is tagged with a `dataType`. The current set includes:

| Data type | Example value | Notes |
| --- | --- | --- |
| `String` | `Vandelay Industries` | The fallback when nothing more specific fits. |
| `Number` | `00162` | Pure digits. |
| `Currency` | `1,165.10€` | The engine keeps the symbol/currency code with the number. |
| `Percentage` | `5.5%` | |
| `DateTime` | `20/09/2022` | Locale-agnostic; you may want to parse it on your side. |
| `EmailAddress` | `info@example.com` | |
| `PhoneNumber` | `+100 847 738 227` | |
| `URL` | `https://example.com` | |
| `IBAN` | `AT13 2060 4236 6111 5994` | Pre-validated against the IBAN format. |
| `UID` | `P00201` | Generic unique-identifier-shaped strings. |

Use `dataType` to pick a parser. If a value is tagged `Currency`, you can safely run it through a money-parsing library; if it's `DateTime`, run it through your date library.

## Tables

A table response looks like:

```json
{
  "confidence": 95.4,
  "bbox": { "left": 50, "top": 200, "width": 500, "height": 220 },
  "rows":    [ { "bbox": ... }, ... ],
  "columns": [ { "bbox": ... }, ... ],
  "lines":   [ { "bbox": ..., "isVertical": false, "thickness": 1 }, ... ],
  "cells": [
    { "rowIndex": 0, "columnIndex": 0, "isHeader": true,  "text": "Description" },
    { "rowIndex": 1, "columnIndex": 0, "isHeader": false, "text": "Lake Mirror"   }
  ]
}
```

A few practical tips:

- `cells[].text` is what you usually want. The `rowIndex` and `columnIndex` reconstruct the grid.
- Cells can have `rowSpan` / `columnSpan` for merged cells.
- `isHeader: true` means the engine identified that cell as part of the header row(s) — handy when you want to name columns automatically.
- The `lines` array describes drawn lines on the page, which is mostly useful for advanced reconstruction.

## Structured text

A page's `structuredText` has four parallel arrays — `characters`, `words`, `lines`, `paragraphs` — each with a `bbox`. They are linked by indexes:

- A `word` knows its `firstCharacterIndex` and `characterCount`.
- A `line` knows its `firstWordIndex` and `wordCount`.
- A `paragraph` knows its `firstLineIndex` and `lineCount`.

So to get all the characters in a paragraph, you walk from `paragraph.firstLineIndex` through the lines, then from each line's `firstWordIndex` through the words, etc.

In most workflows you don't need this much detail — `plainText` is enough. Reach for structured text only when you need positions.

## Pages array

The top-level response always looks like:

```json
{ "pages": [ { "pageIndex": 0, ... }, { "pageIndex": 1, ... } ] }
```

Even a one-page PDF gives you `pages: [...]`. Iterate it; don't assume `pages[0]` is the only page.

Next up: [`04-glossary.md`](./04-glossary.md) — the terms in this guide, with quick definitions.
