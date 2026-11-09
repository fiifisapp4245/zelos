"use client"

import * as React from "react"
import { toast } from "sonner"

import { FormDialog } from "@/components/common/form-dialog"
import { FilePicker } from "@/components/common/file-picker"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { rememberFile, sizeKb } from "@/lib/talent/case-files"

/** Keeps a provider's return with the pay group it belongs to. */
export function ReturnUploadDialog({
  payGroupId,
  groupName,
  onClose,
}: {
  payGroupId: string
  groupName: string
  onClose: () => void
}) {
  const store = useStore()
  const [files, setFiles] = React.useState<File[]>([])
  const [touched, setTouched] = React.useState(false)
  return (
    <FormDialog
      title="Upload a return"
      description={`Kept with ${groupName}. Zelos does not check it: it is the provider's figure.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setTouched(true)
              if (files.length === 0) return
              store.addExternalReturnFiles(
                files.map((f) => {
                  const id = `ret-${Math.random().toString(36).slice(2, 8)}`
                  rememberFile(id, f)
                  return {
                    id,
                    payGroupId,
                    name: f.name,
                    sizeKb: sizeKb(f),
                    uploadedBy: store.viewer.employeeId,
                    uploadedAt: new Date().toISOString(),
                  }
                })
              )
              toast.success(
                files.length === 1
                  ? `${files[0].name} attached.`
                  : `${files.length} returns attached.`
              )
              onClose()
            }}
          >
            Attach
          </Button>
        </>
      }
    >
      <FilePicker files={files} onChange={setFiles} />
      {touched && files.length === 0 && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Choose at least one file.
        </p>
      )}
    </FormDialog>
  )
}
