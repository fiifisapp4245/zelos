"use client"

import { ChevronUp, Maximize2, Minus, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ZOOM_MAX, ZOOM_MIN, type CanvasController } from "./canvas"
import { cn } from "@/lib/utils"

/**
 * The zoom pill that sits over the canvas. Same shape as the one in FigJam:
 * minus, the current percentage as a menu, plus, and fit.
 */
export function CanvasControls({
  controller,
  className,
}: {
  controller: CanvasController
  className?: string
}) {
  const { view, zoomBy, zoomTo, fit, reset } = controller
  const percent = Math.round(view.zoom * 100)

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl border bg-card p-1 shadow-sm",
        className
      )}
    >
      <Key
        label="Zoom out"
        onClick={() => zoomBy(1 / 1.2)}
        disabled={view.zoom <= ZOOM_MIN + 0.001}
      >
        <Minus className="size-4" />
      </Key>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Zoom level, ${percent} percent`}
            className="tabular flex h-8 min-w-[72px] items-center justify-center gap-1 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {percent}%
            <ChevronUp className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-[188px]">
          <DropdownMenuItem onSelect={() => fit()}>
            Zoom to fit
            <span className="ml-auto font-mono text-[11px] opacity-60">⇧1</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => zoomTo(1)}>
            Zoom to 100%
            <span className="ml-auto font-mono text-[11px] opacity-60">⌘0</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={reset}>Reset position</DropdownMenuItem>
          <DropdownMenuSeparator />
          {[0.5, 0.75, 1.5, 2].map((z) => (
            <DropdownMenuItem key={z} onSelect={() => zoomTo(z)}>
              {z * 100}%
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Key
        label="Zoom in"
        onClick={() => zoomBy(1.2)}
        disabled={view.zoom >= ZOOM_MAX - 0.001}
      >
        <Plus className="size-4" />
      </Key>

      <span className="mx-0.5 h-5 w-px bg-border" />

      <Key label="Zoom to fit" onClick={() => fit()}>
        <Maximize2 className="size-4" />
      </Key>
    </div>
  )
}

function Key({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
