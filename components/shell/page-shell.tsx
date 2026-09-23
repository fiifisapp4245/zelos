"use client"

import * as React from "react"

import { Topbar, type Crumb } from "./topbar"
import { cn } from "@/lib/utils"

/** Standard scroll container + breadcrumb wrapper for every page in the app. */
export function PageShell({
  crumbs,
  children,
  width = "default",
}: {
  crumbs: Crumb[]
  children: React.ReactNode
  /**
   * "canvas" hands the whole content area to the page and does not scroll it,
   * for screens that are a surface rather than a document.
   */
  width?: "default" | "wide" | "canvas"
}) {
  if (width === "canvas") {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {children}
        </main>
      </>
    )
  }

  return (
    <>
      <Topbar crumbs={crumbs} />
      {/* `relative` is load-bearing: .sr-only is absolutely positioned, and
          without a positioned ancestor it resolves against the document
          instead of this scroller — which grows the page and gives you a
          second scrollbar behind the first. */}
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            // 85% of the content area, centred, so the page never runs edge
            // to edge but is not squeezed into the middle either.
            "mx-auto w-[85%] py-6",
            width === "wide" ? "max-w-[1600px]" : "max-w-[1280px]"
          )}
        >
          {children}
        </div>
      </main>
    </>
  )
}
