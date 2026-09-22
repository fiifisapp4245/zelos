"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal, type LucideIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface RowAction {
  label: string
  icon?: LucideIcon
  href?: string
  onSelect?: () => void
  /** Renders in the destructive colour and below a separator. */
  destructive?: boolean
  disabled?: boolean
}

/**
 * The overflow menu on a table row. One component so every table in the app
 * puts its actions in the same place and they behave the same way.
 */
export function RowActions({
  actions,
  label = "Row actions",
}: {
  actions: (RowAction | false | null | undefined)[]
  label?: string
}) {
  const items = actions.filter(Boolean) as RowAction[]
  if (items.length === 0) return null

  const normal = items.filter((a) => !a.destructive)
  const destructive = items.filter((a) => a.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[190px]">
        {normal.map((a) => (
          <Item key={a.label} action={a} />
        ))}
        {destructive.length > 0 && normal.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {destructive.map((a) => (
          <Item key={a.label} action={a} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Item({ action }: { action: RowAction }) {
  const Icon = action.icon
  const body = (
    <>
      {Icon && <Icon className="size-4" />}
      {action.label}
    </>
  )

  if (action.href && !action.disabled) {
    return (
      <DropdownMenuItem asChild>
        <Link href={action.href}>{body}</Link>
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem
      disabled={action.disabled}
      onSelect={action.onSelect}
      className={cn(
        action.destructive && "text-destructive focus:text-destructive"
      )}
    >
      {body}
    </DropdownMenuItem>
  )
}
