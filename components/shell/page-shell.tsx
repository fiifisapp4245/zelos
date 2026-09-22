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
            "mx-auto px-5 py-6 sm:px-7",
            width === "wide" ? "max-w-[1600px]" : "max-w-[1280px]"
          )}
        >
          {children}
        </div>
      </main>
    </>
  )
}
