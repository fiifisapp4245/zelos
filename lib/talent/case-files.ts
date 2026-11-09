/**
 * Uploaded files, kept for the life of the tab.
 *
 * The prototype stores what a document *is* (name, size, category, who, when)
 * in session state, but not its bytes: a few PDFs would fill sessionStorage
 * and take the rest of the demo's data with them. The bytes live here, keyed
 * by document id, so a file can be opened until the tab reloads. A real build
 * writes them to object storage and keeps only the key.
 */
const files = new Map<string, File>()

export function rememberFile(id: string, file: File) {
  files.set(id, file)
}

export function fileFor(id: string) {
  return files.get(id) ?? null
}

export const MAX_UPLOAD_MB = 10

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "txt",
  "eml",
  "msg",
]

/** Why a file cannot be attached, or null when it can. */
export function fileProblem(
  file: File,
  accepted: string[] = ACCEPTED_EXTENSIONS
): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!accepted.includes(ext))
    return `${file.name}: .${ext || "?"} files are not accepted.`
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024)
    return `${file.name}: larger than ${MAX_UPLOAD_MB} MB.`
  if (file.size === 0) return `${file.name}: the file is empty.`
  return null
}

export function sizeKb(file: File) {
  return Math.max(1, Math.ceil(file.size / 1024))
}
