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
  width?: "default" | "wide"
}) {
  return (
    <>
      <Topbar crumbs={crumbs} />
      <main className="flex-1 overflow-y-auto">
        <div
          className={cn(
            // 80% of the content area, centred, so the page never runs edge to edge.
            "mx-auto w-[80%] py-6",
            width === "wide" ? "max-w-[1600px]" : "max-w-[1280px]"
          )}
        >
          {children}
        </div>
      </main>
    </>
  )
}
