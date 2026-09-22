"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The project's one editing pattern: a centred modal, not a side drawer.
 *
 * The body scrolls on its own so the header and the action buttons stay put on
 * a long form. Mount it only while open, so its fields seed fresh each time.
 */
export function FormDialog({
  title,
  description,
  children,
  footer,
  onClose,
  width = "md",
}: {
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer: React.ReactNode
  onClose: () => void
  width?: "md" | "lg"
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 p-0",
          width === "lg" ? "sm:max-w-[680px]" : "sm:max-w-[560px]"
        )}
      >
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        <DialogFooter className="border-t px-6 py-4">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
