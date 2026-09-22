"use client"

import * as React from "react"
import { X } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The project's one editing pattern: a centred modal with a tinted header, a
 * scrolling body and the actions pinned to the foot.
 *
 * Mount it only while open, so its fields seed fresh each time.
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
        showCloseButton={false}
        className={cn(
          "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0",
          width === "lg" ? "sm:max-w-[680px]" : "sm:max-w-[560px]"
        )}
      >
        {/* A soft wash across the header, so the title area reads apart
            from the form without needing a heavy fill. */}
        <DialogHeader className="relative border-b bg-gradient-to-r from-success-muted/70 via-card to-info-muted/60 px-6 py-5 text-left">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-0.5">
              {description}
            </DialogDescription>
          )}
          <DialogClose
            aria-label="Close"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        <DialogFooter className="border-t px-6 py-4">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
