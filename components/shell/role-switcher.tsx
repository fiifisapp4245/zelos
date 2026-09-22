"use client"

import * as React from "react"
import { Check, RotateCcw, UsersRound, X } from "lucide-react"

import { useStore } from "@/lib/store"
import { fullName, initials } from "@/lib/format"
import { ROLE_LABEL } from "@/lib/rbac"
import type { PermissionRole } from "@/lib/types"
import { cn } from "@/lib/utils"

const ROLES: PermissionRole[] = [
  "hr_admin",
  "line_manager",
  "head_of_department",
  "payroll",
  "employee",
]

const ROLE_HINT: Record<PermissionRole, string> = {
  hr_admin: "Sees everything; the only role that can change lifecycle state",
  line_manager: "Own direct reports — no salary visibility",
  head_of_department: "Whole department, plus their own reports",
  payroll: "Compensation and statutory IDs across the org",
  employee: "Own record only",
}

/**
 * Prototype-only control, docked to the bottom-right corner of the viewport.
 *
 * It swaps the signed-in persona so each perspective in the permission model
 * can be demonstrated without separate logins. It sits outside the sidebar
 * because it is a property of the demo, not of the product.
 */
export function RoleSwitcherFab() {
  const { viewer, activeRole, setActiveRole, employeeById, reset } = useStore()
  const [open, setOpen] = React.useState(false)
  const me = employeeById(viewer.employeeId)
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    function onPointerDown(e: PointerEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <div
      ref={panelRef}
      className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2"
    >
      {open && (
        <div className="w-[300px] overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div className="flex items-start justify-between gap-2 border-b px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Viewing as</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Switch persona to see the same screens through another role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close persona switcher"
              className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <ul className="max-h-[50vh] overflow-y-auto p-1.5">
            {ROLES.map((role) => {
              const active = activeRole === role
              return (
                <li key={role}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRole(role)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors",
                      active ? "bg-success-muted" : "hover:bg-muted"
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        active ? "text-primary opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          active && "text-primary"
                        )}
                      >
                        {ROLE_LABEL[role]}
                      </span>
                      <span className="block text-xs leading-snug text-muted-foreground">
                        {ROLE_HINT[role]}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="border-t p-1.5">
            <button
              type="button"
              onClick={() => {
                reset()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-4" />
              Reset demo data
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Viewing as ${ROLE_LABEL[activeRole]}. Switch persona.`}
        className={cn(
          "flex items-center gap-2.5 rounded-full border py-2 pr-4 pl-2 shadow-lg transition-colors",
          open
            ? "border-primary bg-success-muted text-primary"
            : "bg-popover hover:bg-muted"
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {me ? initials(me) : "—"}
        </span>
        <span className="hidden text-left lg:block">
          <span className="block text-[10px] tracking-wide text-muted-foreground uppercase">
            Viewing as
          </span>
          <span className="block max-w-[110px] truncate text-xs font-medium">
            {ROLE_LABEL[activeRole]}
          </span>
        </span>
        <UsersRound className="size-4 shrink-0 text-muted-foreground lg:hidden" />
      </button>
    </div>
  )
}

/** The persona's own name, for anywhere that needs it outside the switcher. */
export function useActivePersona() {
  const { viewer, employeeById } = useStore()
  return fullName(employeeById(viewer.employeeId))
}
