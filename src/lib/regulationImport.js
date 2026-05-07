// Maximum size (in bytes for files, in characters for pasted text) accepted
// by the regulation import flow. Both upload and paste enforce this cap.
export const MAX_REG_IMPORT_BYTES = 200_000

const TXT_EXTENSIONS = ['txt', 'md', 'json', 'csv']

function getExtension(filename) {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase()
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

async function readPdfFile(file) {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(it => ('str' in it ? it.str : '')).join(' '))
  }
  return pages.join('\n\n')
}

async function readDocxFile(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value || ''
}

export async function extractTextFromFile(file) {
  if (file.size > MAX_REG_IMPORT_BYTES) {
    const err = new Error(`File exceeds ${MAX_REG_IMPORT_BYTES / 1000}KB limit`)
    err.code = 'TOO_LARGE'
    throw err
  }
  const ext = getExtension(file.name)
  if (TXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
    return readTextFile(file)
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return readPdfFile(file)
  }
  if (
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return readDocxFile(file)
  }
  const err = new Error(`Unsupported file type: ${ext || file.type || 'unknown'}`)
  err.code = 'UNSUPPORTED'
  throw err
}

const SYSTEM_PROMPT = `You extract structured regulation entries from raw text. The text may be a single regulation, an excerpt of one, or a document containing multiple distinct regulations.

Return ONLY a JSON array. No markdown, no code fences, no preamble.

Each array entry must have this exact shape:
{
  "regulation_id": "REG-IMPORT-1",
  "authority": "Issuing authority name in English",
  "authorityHe": "Issuing authority name in Hebrew",
  "title": "Short title of the regulation in English",
  "titleHe": "Short title of the regulation in Hebrew",
  "requirements": ["Requirement 1 in English", "Requirement 2 in English"],
  "requirementsHe": ["Requirement 1 in Hebrew", "Requirement 2 in Hebrew"],
  "effective_date": "YYYY-MM-DD"
}

Rules:
- If the source text contains MULTIPLE distinct regulations, return MULTIPLE entries.
- ALWAYS produce both English and Hebrew variants of every text field, regardless of the source language. Use professional Hebrew insurance/legal terminology.
- requirements and requirementsHe must have the same length and order — index i in EN maps to index i in HE.
- regulation_id must be "REG-IMPORT-{n}" where n is 1-based and sequential across the returned array.
- effective_date: extract from the text if mentioned; otherwise use today's date in YYYY-MM-DD format.
- Each requirement is one concise sentence stating a specific obligation. Avoid headings or generic statements.
- If the text contains no extractable regulation requirements, return an empty array [].`

export async function extractRegulationsFromText(text, apiKey) {
  if (!apiKey) {
    throw new Error('Claude API key is required to extract regulations')
  }
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Text is empty')
  }
  if (trimmed.length > MAX_REG_IMPORT_BYTES) {
    const err = new Error(`Text exceeds ${MAX_REG_IMPORT_BYTES / 1000}KB limit`)
    err.code = 'TOO_LARGE'
    throw err
  }

  const today = new Date().toISOString().slice(0, 10)
  const userMessage = `Today's date is ${today}.

Extract regulation entries from the following text:

---
${trimmed}
---

Return only the JSON array.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Claude API error: ${response.status} — ${body}`)
  }

  const data = await response.json()
  let raw = (data.content?.[0]?.text || '').trim()
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Claude returned an invalid JSON response')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Claude response is not an array')
  }

  return parsed.map((entry, i) => normaliseRegulation(entry, i, today))
}

function normaliseRegulation(entry, index, today) {
  const reqs = Array.isArray(entry.requirements) ? entry.requirements.filter(Boolean) : []
  const reqsHe = Array.isArray(entry.requirementsHe) ? entry.requirementsHe.filter(Boolean) : []
  return {
    regulation_id: entry.regulation_id || `REG-IMPORT-${index + 1}`,
    authority: entry.authority || '',
    authorityHe: entry.authorityHe || entry.authority || '',
    title: entry.title || '',
    titleHe: entry.titleHe || entry.title || '',
    requirements: reqs,
    requirementsHe: reqsHe.length === reqs.length ? reqsHe : reqs,
    effective_date: entry.effective_date || today,
  }
}
