"use client"

import { LogIn, LogOut } from "lucide-react"
import { toast } from "sonner"

import { Widget } from "./widget"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { TODAY, TODAY_ISO } from "@/lib/format"
import { cn } from "@/lib/utils"

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** The employee's primary widget: am I clocked in, and how has the week gone. */
export function MyDay() {
  const store = useStore()
  const { session, attendance } = store

  const today = attendance.find(
    (a) => a.employeeId === session.id && a.date === TODAY_ISO
  )
  const clockedIn = Boolean(today?.clockIn && !today?.clockOut)

  // The seven days ending today, so the bar always reads left to right.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY)
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0, 10)
    const record = attendance.find(
      (a) => a.employeeId === session.id && a.date === iso
    )
    return { iso, day: DAY_LABEL[d.getDay()], hours: record?.hours ?? 0 }
  })
  const peak = Math.max(8, ...week.map((w) => w.hours))

  return (
    <Widget
      title="My day"
      weight="primary"
      description={`Scheduled 08:00 – 17:00 · ${session.department}`}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Button
          size="lg"
          variant={clockedIn ? "outline" : "default"}
          className="h-14 min-w-[180px] text-base"
          onClick={() => {
            if (clockedIn) {
              store.clockOut()
              toast.success("Clocked out")
            } else {
              store.clockIn()
              toast.success("Clocked in")
            }
          }}
        >
          {clockedIn ? (
            <LogOut className="size-5" />
          ) : (
            <LogIn className="size-5" />
          )}
          {clockedIn ? "Clock out" : "Clock in"}
        </Button>

        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Status
          </p>
          <p className="text-sm font-medium">
            {clockedIn
              ? `In since ${today?.clockIn}`
              : today?.clockOut
                ? `Out at ${today.clockOut}`
                : "Not clocked in"}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Hours today
          </p>
          <p className="tabular text-sm font-medium">
            {(today?.hours ?? 0).toFixed(1)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Last seven days
        </p>
        <ul className="flex items-end gap-2">
          {week.map((d) => (
            <li key={d.iso} className="flex flex-1 flex-col items-center gap-1">
              <span className="tabular text-[10px] text-muted-foreground">
                {d.hours > 0 ? d.hours.toFixed(1) : ""}
              </span>
              <span
                className={cn(
                  "w-full rounded-t",
                  d.hours > 0 ? "bg-primary" : "bg-muted"
                )}
                style={{ height: `${Math.max((d.hours / peak) * 64, 4)}px` }}
                aria-hidden
              />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
              <span className="sr-only">
                {d.day}: {d.hours} hours
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Widget>
  )
}
