/**
 * Shared Nutrient DWS client.
 *
 * Every extraction example in this cookbook calls Nutrient DWS through
 * this helper so the multipart `/build` plumbing lives in exactly one place.
 *
 * DWS Processor API:
 *   - Base URL:  https://api.nutrient.io
 *   - Endpoint:  POST /build
 *   - Auth:      Authorization: Bearer <DWS_API_KEY>
 *   - Pricing:   credits per call — 200 free credits/month on signup
 *
 * Docs:
 *   - Getting started: https://www.nutrient.io/guides/dws-processor/getting-started/
 *   - REST reference:  https://www.nutrient.io/api/reference/public/
 *   - Pricing:         https://www.nutrient.io/api/pricing/processor-api/
 */

import "dotenv/config";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetch, FormData, File } from "undici";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Project root resolved relative to this file. */
export const ROOT = resolve(__dirname, "..", "..");

/** Where JSON / XLSX results are written. */
export const OUTPUT_DIR = resolve(ROOT, "output");

const DEFAULT_BASE_URL = "https://api.nutrient.io";
const DEFAULT_LANGUAGE = "english";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value === "replace_me") {
    throw new Error(
      `Missing env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

/**
 * Output flags that toggle individual extractors on the same `/build` call.
 * You can enable any combination — DWS returns one merged JSON response.
 */
export interface ExtractionFlags {
  plainText?: boolean;
  structuredText?: boolean;
  keyValuePairs?: boolean;
  tables?: boolean;
}

/** Bounding box used everywhere in the response. Coordinates are PDF points. */
export interface BBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface KeyValuePair {
  confidence: number;
  key: { bbox: BBox; content: string };
  value: { bbox: BBox; content: string; dataType: string };
}

export interface TableCell {
  bbox: BBox;
  rowIndex: number;
  columnIndex: number;
  isHeader: boolean;
  text: string;
  rowSpan?: number;
  columnSpan?: number;
}

export interface Table {
  confidence: number;
  bbox: BBox;
  cells: TableCell[];
  columns: { bbox: BBox }[];
  rows: { bbox: BBox }[];
  lines: { bbox: BBox; isVertical: boolean; thickness: number }[];
}

export interface StructuredText {
  /** OCR confidence for the page as a whole (0–100). */
  confidence?: number;
  characters: { bbox: BBox; value: string }[];
  lines: {
    bbox: BBox;
    firstWordIndex: number;
    isRTL: boolean;
    isVertical: boolean;
    wordCount: number;
  }[];
  paragraphs: { bbox: BBox; firstLineIndex: number; lineCount: number }[];
  words: {
    bbox: BBox;
    characterCount: number;
    /** Per-word OCR confidence (0–100). */
    confidence?: number;
    firstCharacterIndex: number;
    isFromDictionary: boolean;
    value: string;
  }[];
}

export interface ExtractionPage {
  /**
   * Page index is NOT returned by DWS — pages are implicitly ordered by their
   * position in the `pages` array. Kept optional in the type for forward
   * compatibility; use the array index when you need it.
   */
  pageIndex?: number;
  /** Plain text is returned with every response, regardless of which flag was set. */
  plainText?: string;
  structuredText?: StructuredText;
  keyValuePairs?: KeyValuePair[];
  tables?: Table[];
}

export interface ExtractionResult {
  pages: ExtractionPage[];
}

interface DwsErrorBody {
  status?: string;
  error_description?: string;
  details?: unknown;
}

async function readDwsError(response: Response | import("undici").Response): Promise<string> {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as DwsErrorBody;
    if (parsed.error_description) {
      return `${parsed.status ?? response.status} ${parsed.error_description}`;
    }
  } catch {
    /* not JSON */
  }
  return raw || `${response.status} ${response.statusText}`;
}

/** Resolve base URL and API key once per call so a single .env edit is enough. */
function dwsConfig() {
  const baseUrl = (process.env.DWS_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const apiKey = requireEnv("DWS_API_KEY");
  return { baseUrl, apiKey };
}

/**
 * Call DWS `/build` with the extraction flags you want.
 *
 * Returns the parsed JSON content. The PDF is uploaded as a multipart part
 * named `document`; the `instructions` part is a JSON string per DWS spec.
 *
 * @example
 *   const result = await extract("samples/invoice.pdf", { tables: true });
 */
export async function extract(
  pdfPath: string,
  flags: ExtractionFlags,
): Promise<ExtractionResult> {
  const { baseUrl, apiKey } = dwsConfig();
  const language = process.env.OCR_LANGUAGE ?? DEFAULT_LANGUAGE;

  const absolutePath = resolve(pdfPath);
  const pdfBytes = await readFile(absolutePath);

  const form = new FormData();
  form.append(
    "document",
    new File([pdfBytes], basename(absolutePath), { type: "application/pdf" }),
  );
  form.append(
    "instructions",
    JSON.stringify({
      parts: [{ file: "document" }],
      output: {
        type: "json-content",
        language,
        ...flags,
      },
    }),
  );

  const response = await fetch(`${baseUrl}/build`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`DWS /build failed: ${await readDwsError(response)}`);
  }

  return (await response.json()) as ExtractionResult;
}

/**
 * Convert a PDF directly to an Excel workbook (.xlsx). DWS detects tables on
 * each page and emits them as worksheets. Returns the binary bytes; the caller
 * decides where to write them.
 */
export async function extractToXlsx(pdfPath: string): Promise<Uint8Array> {
  const { baseUrl, apiKey } = dwsConfig();

  const absolutePath = resolve(pdfPath);
  const pdfBytes = await readFile(absolutePath);

  const form = new FormData();
  form.append(
    "document",
    new File([pdfBytes], basename(absolutePath), { type: "application/pdf" }),
  );
  form.append(
    "instructions",
    JSON.stringify({
      parts: [{ file: "document" }],
      output: { type: "xlsx" },
    }),
  );

  const response = await fetch(`${baseUrl}/build`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`DWS /build (xlsx) failed: ${await readDwsError(response)}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Save JSON output to the repo's `output/` folder. */
export async function saveJson(
  fileName: string,
  data: unknown,
): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = resolve(OUTPUT_DIR, fileName);
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return path;
}

/** Save raw bytes (e.g. an .xlsx response) to the repo's `output/` folder. */
export async function saveBytes(
  fileName: string,
  bytes: Uint8Array,
): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const path = resolve(OUTPUT_DIR, fileName);
  await writeFile(path, bytes);
  return path;
}

/**
 * Pull the first positional CLI argument, defaulting to a sample PDF if missing.
 *
 * Usage in an example: `const pdf = argPdf("samples/invoice.pdf");`
 */
export function argPdf(defaultPath: string): string {
  const fromArgs = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  return fromArgs ?? defaultPath;
}
