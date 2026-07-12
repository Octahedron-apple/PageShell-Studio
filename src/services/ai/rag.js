/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * Handles the full pipeline:
 * 1. Text extraction from DOCX (mammoth) and PDF (pdfjs-dist)
 * 2. Smart chunking at sentence/word boundaries near ~500 chars
 * 3. MiniSearch keyword indexing
 * 4. Query-time retrieval of top relevant chunks
 */

import mammoth from 'mammoth';
import MiniSearch from 'minisearch';

// ─── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts plain text from a DOCX file binary.
 * @param {Uint8Array} bytes - Raw file bytes
 * @returns {Promise<string>} Extracted plain text
 */
export async function extractDocxText(bytes) {
  const buffer = bytes.buffer ?? bytes;
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

/**
 * Extracts plain text from a PDF file binary using pdfjs-dist.
 * @param {Uint8Array} bytes - Raw file bytes
 * @returns {Promise<string>} Extracted plain text
 */
export async function extractPdfText(bytes) {
  // Dynamically import to respect the vite optimizeDeps.exclude rule.
  const pdfjsLib = await import('pdfjs-dist');

  // Point to the CDN worker to avoid WASM-relative-path issues (pdfjs-dist is excluded from pre-bundling).
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 500;
const OVERLAP = 50; // chars of overlap to preserve context at boundaries

/**
 * Splits text into ~500-char chunks, snapping to sentence/word boundaries.
 * @param {string} text - Full extracted text
 * @param {string} sourceFile - Filename for metadata
 * @returns {Array<{id: number, text: string, source: string}>}
 */
export function chunkText(text, sourceFile) {
  const chunks = [];
  let start = 0;
  let id = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    if (end >= text.length) {
      const chunk = text.slice(start).trim();
      if (chunk.length > 10) {
        chunks.push({ id: id++, text: chunk, source: sourceFile });
      }
      break;
    }

    // Walk back from end to find a good sentence/word boundary
    const sentenceEnd = Math.max(
      text.lastIndexOf('.', end),
      text.lastIndexOf('\n', end),
      text.lastIndexOf('!', end),
      text.lastIndexOf('?', end)
    );

    let boundary = end;
    if (sentenceEnd > start + 100) {
      boundary = sentenceEnd + 1;
    } else {
      const spaceIdx = text.lastIndexOf(' ', end);
      if (spaceIdx > start) {
        boundary = spaceIdx + 1;
      }
    }

    const chunk = text.slice(start, boundary).trim();
    if (chunk.length > 10) {
      chunks.push({ id: id++, text: chunk, source: sourceFile });
    }

    // Advance with overlap so boundary context is not lost
    start = boundary - OVERLAP;
  }

  return chunks;
}

// ─── Indexing ─────────────────────────────────────────────────────────────────

/**
 * Builds a MiniSearch index from an array of chunks.
 * @param {Array<{id: number, text: string, source: string}>} chunks
 * @returns {MiniSearch} Searchable index
 */
export function buildIndex(chunks) {
  const index = new MiniSearch({
    fields: ['text'],
    storeFields: ['text', 'source'],
    searchOptions: {
      boost: { text: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  index.addAll(chunks);
  return index;
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Searches the index for chunks relevant to the query.
 * @param {MiniSearch} index
 * @param {string} query
 * @param {number} topK - Number of results to return
 * @returns {Array<{text: string, source: string}>}
 */
export function retrieveChunks(index, query, topK = 5) {
  const results = index.search(query, { combineWith: 'OR' });
  return results.slice(0, topK).map(r => ({ text: r.text, source: r.source }));
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

/**
 * Extracts text from a file binary, chunks it, and returns a MiniSearch index.
 * Supports DOCX and PDF. Returns null for unsupported types.
 *
 * @param {Uint8Array} bytes - Raw file bytes
 * @param {string} filename - Used to determine file type and as metadata
 * @returns {Promise<{index: MiniSearch, chunkCount: number} | null>}
 */
export async function indexDocument(bytes, filename) {
  const ext = filename.toLowerCase().split('.').pop();

  let rawText = '';
  if (ext === 'docx') {
    rawText = await extractDocxText(bytes);
  } else if (ext === 'pdf') {
    rawText = await extractPdfText(bytes);
  } else {
    return null;
  }

  if (!rawText || rawText.trim().length === 0) {
    return null;
  }

  const chunks = chunkText(rawText, filename);
  const index = buildIndex(chunks);
  return { index, chunkCount: chunks.length };
}
