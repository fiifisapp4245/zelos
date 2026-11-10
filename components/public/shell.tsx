"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** The frame for every page a candidate sees: the company's name, and nothing of the admin app. */
export function PublicShell({
  company,
  children,
  width = "max-w-3xl",
}: {
  company: string
  children: React.ReactNode
  width?: string
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className={cn("mx-auto", width)}>
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            {company.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-sm font-medium">{company}</span>
        </div>
        {children}
      </div>
    </main>
  )
}

export function PublicMessage({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="mx-auto max-w-md rounded-xl border p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
