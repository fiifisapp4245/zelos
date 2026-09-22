"use client"

import * as React from "react"
import Image from "next/image"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export interface SuccessState {
  title: string
  description?: string
  /** The obvious next step, if there is one. */
  primary?: { label: string; onSelect: () => void }
  dismissLabel?: string
}

/**
 * Shown after something is created. It exists to confirm the thing landed and
 * to offer the next step, so people are not left guessing whether it saved.
 */
export function SuccessDialog({
  state,
  onClose,
}: {
  state: SuccessState
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[420px]"
      >
        <div className="grid place-items-center bg-success-muted/50 px-6 pt-8 pb-2">
          <Image
            src="/success.svg"
            alt=""
            width={196}
            height={158}
            priority
            className="h-auto w-[196px]"
          />
        </div>

        <DialogHeader className="px-6 pt-4 text-center sm:text-center">
          <DialogTitle className="text-lg">{state.title}</DialogTitle>
          {state.description && (
            <DialogDescription className="mt-1">
              {state.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 px-6 pt-5 pb-6 sm:flex-col">
          {state.primary && (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                state.primary!.onSelect()
                onClose()
              }}
            >
              {state.primary.label}
            </Button>
          )}
          <Button
            variant={state.primary ? "ghost" : "default"}
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            {state.dismissLabel ?? "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Wires a success dialog into a screen with a single call. */
export function useSuccessDialog() {
  const [state, setState] = React.useState<SuccessState | null>(null)
  const dialog = state ? (
    <SuccessDialog state={state} onClose={() => setState(null)} />
  ) : null
  return { celebrate: setState, dialog }
}
