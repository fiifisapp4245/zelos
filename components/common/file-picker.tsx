"use client"

import * as React from "react"
import { FileText, Upload, X } from "lucide-react"

import {
  ACCEPTED_EXTENSIONS,
  MAX_UPLOAD_MB,
  fileProblem,
  sizeKb,
} from "@/lib/talent/case-files"

/** Picks files and checks each one before it is accepted. */
export function FilePicker({
  files,
  onChange,
  multiple = true,
  extensions = ACCEPTED_EXTENSIONS,
}: {
  files: File[]
  onChange: (f: File[]) => void
  multiple?: boolean
  /** Lower-case extensions without the dot. Defaults to documents and images. */
  extensions?: string[]
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  const [over, setOver] = React.useState(false)
  const [problems, setProblems] = React.useState<string[]>([])

  function add(list: FileList | null) {
    if (!list) return
    const incoming = [...list]
    const bad = incoming
      .map((f) => fileProblem(f, extensions))
      .filter((p): p is string => !!p)
    const good = incoming.filter((f) => !fileProblem(f, extensions))
    setProblems(bad)
    // The same file twice is almost always a slip, and the second is noise.
    const fresh = good.filter(
      (f) => !files.some((x) => x.name === f.name && x.size === f.size)
    )
    onChange(multiple ? [...files, ...fresh] : fresh.slice(0, 1))
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
          over ? "border-primary bg-success-muted/40" : "bg-muted/20"
        }`}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm">
          Drop files here, or{" "}
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground">
          {extensions.map((e) => e.toUpperCase()).join(", ")} · up to{" "}
          {MAX_UPLOAD_MB} MB each
        </p>
        <input
          ref={ref}
          type="file"
          multiple={multiple}
          accept={extensions.map((e) => `.${e}`).join(",")}
          className="sr-only"
          aria-label="Choose files"
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-xs text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="tabular text-xs text-muted-foreground">
                {sizeKb(f)} KB
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
