"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 2.5

export interface CanvasView {
  x: number
  y: number
  zoom: number
}

const IDENTITY: CanvasView = { x: 0, y: 0, zoom: 1 }

function clampZoom(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
}

export interface CanvasController {
  view: CanvasView
  /** Scales around the centre of the viewport, the way the +/− buttons should. */
  zoomBy: (factor: number) => void
  zoomTo: (zoom: number) => void
  /**
   * Frames the content with a margin and centres it. `floor` stops a very
   * wide tree from fitting to an unreadable size — below it the view holds
   * the floor and anchors to the top instead.
   */
  fit: (padding?: number, floor?: number) => void
  reset: () => void
  isPanning: boolean
  /** Spread onto the scrolling viewport element. */
  viewportProps: {
    ref: React.RefObject<HTMLDivElement | null>
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  /** Spread onto the element that holds the drawing. */
  contentProps: {
    ref: React.RefObject<HTMLDivElement | null>
    style: React.CSSProperties
  }
  /** True once a drag has moved far enough to be a pan and not a click. */
  didPan: React.RefObject<boolean>
}

/**
 * An infinite pannable, zoomable surface, with the interactions people already
 * know from FigJam: drag to pan, trackpad scroll to pan, ⌘/ctrl-scroll and
 * pinch to zoom at the pointer, and ⌘0 / shift-1 to reset or fit.
 *
 * It owns no chrome. The page draws its own toolbar over the top.
 */
export function useCanvas({
  onDoubleClickFit = true,
  initialFitFloor = 0,
}: {
  onDoubleClickFit?: boolean
  /** Lower bound for the automatic fit on mount. */
  initialFitFloor?: number
} = {}): CanvasController {
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [view, setView] = React.useState<CanvasView>(IDENTITY)
  const [isPanning, setIsPanning] = React.useState(false)

  const drag = React.useRef<{
    id: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const didPan = React.useRef(false)

  // Zoom about a point in viewport space, so whatever is under the cursor
  // stays under the cursor.
  const zoomAt = React.useCallback(
    (nextZoom: number, px: number, py: number) => {
      setView((v) => {
        const z = clampZoom(nextZoom)
        if (z === v.zoom) return v
        const k = z / v.zoom
        return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
      })
    },
    []
  )

  const centre = React.useCallback(() => {
    const r = viewportRef.current?.getBoundingClientRect()
    return { px: (r?.width ?? 0) / 2, py: (r?.height ?? 0) / 2 }
  }, [])

  const zoomBy = React.useCallback(
    (factor: number) => {
      const { px, py } = centre()
      setView((v) => {
        const z = clampZoom(v.zoom * factor)
        if (z === v.zoom) return v
        const k = z / v.zoom
        return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
      })
    },
    [centre]
  )

  const zoomTo = React.useCallback(
    (zoom: number) => {
      const { px, py } = centre()
      zoomAt(zoom, px, py)
    },
    [centre, zoomAt]
  )

  const fit = React.useCallback((padding = 64, floor = 0) => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const vw = viewport.clientWidth
    const vh = viewport.clientHeight
    // scrollWidth is the untransformed size, which is what we want to frame.
    const cw = content.scrollWidth
    const ch = content.scrollHeight
    if (!cw || !ch) return

    const exact = Math.min((vw - padding * 2) / cw, (vh - padding * 2) / ch, 1)
    const zoom = clampZoom(Math.max(exact, floor))
    const clipped = zoom > exact + 0.001

    setView({
      zoom,
      x: (vw - cw * zoom) / 2,
      // When the floor has kicked in the content no longer fits, so anchor
      // the top — the root of a tree matters more than its middle.
      y: clipped ? padding : (vh - ch * zoom) / 2,
    })
  }, [])

  const reset = React.useCallback(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return setView(IDENTITY)
    setView({
      zoom: 1,
      x: (viewport.clientWidth - content.scrollWidth) / 2,
      y: 48,
    })
  }, [])

  // Wheel has to be a non-passive native listener, or preventDefault on
  // ⌘-scroll is ignored and the browser zooms the whole page instead.
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      const rect = el!.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        // A trackpad pinch arrives as ctrl+wheel with small deltas.
        setView((v) => {
          const z = clampZoom(v.zoom * Math.exp(-e.deltaY / 220))
          if (z === v.zoom) return v
          const k = z / v.zoom
          return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }
        })
        return
      }

      e.preventDefault()
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, [contenteditable]")) return

      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        zoomBy(1.2)
      } else if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault()
        zoomBy(1 / 1.2)
      } else if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault()
        zoomTo(1)
      } else if (e.shiftKey && e.key === "1") {
        e.preventDefault()
        fit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [zoomBy, zoomTo, fit])

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    // Let the middle button pan too, as it does in every canvas tool.
    if (e.button !== 0 && e.button !== 1) return
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: 0,
      originY: 0,
    }
    didPan.current = false
    setView((v) => {
      drag.current = { ...drag.current!, originX: v.x, originY: v.y }
      return v
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    // Below the threshold this is still a click on whatever is underneath.
    if (!didPan.current && Math.hypot(dx, dy) < 4) return
    didPan.current = true
    setIsPanning(true)
    setView((v) => ({ ...v, x: d.originX + dx, y: d.originY + dy }))
  }, [])

  const endDrag = React.useCallback((e: React.PointerEvent) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setIsPanning(false)
  }, [])

  // Fit once the content has been laid out, and again when the pane resizes.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => fit(64, initialFitFloor))
    const el = viewportRef.current
    if (!el || typeof ResizeObserver === "undefined")
      return () => cancelAnimationFrame(id)
    let first = true
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }
      fit(64, initialFitFloor)
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
    }
  }, [fit, initialFitFloor])

  React.useEffect(() => {
    if (!onDoubleClickFit) return
    const el = viewportRef.current
    if (!el) return
    function onDouble(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("a, button")) return
      fit()
    }
    el.addEventListener("dblclick", onDouble)
    return () => el.removeEventListener("dblclick", onDouble)
  }, [fit, onDoubleClickFit])

  return {
    view,
    zoomBy,
    zoomTo,
    fit,
    reset,
    isPanning,
    didPan,
    viewportProps: {
      ref: viewportRef,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    contentProps: {
      ref: contentRef,
      style: {
        transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
        transformOrigin: "0 0",
        width: "max-content",
      },
    },
  }
}

/** The surface itself: a dotted, non-scrolling plane that fills its parent. */
export function CanvasSurface({
  controller,
  className,
  children,
}: {
  controller: CanvasController
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      {...controller.viewportProps}
      className={cn(
        "absolute inset-0 touch-none overflow-hidden bg-chart-canvas select-none",
        controller.isPanning ? "cursor-grabbing" : "cursor-grab",
        className
      )}
    >
      <div {...controller.contentProps}>{children}</div>
    </div>
  )
}
