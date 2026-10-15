"use client"

import * as React from "react"

import { Sidebar } from "@/components/shell/sidebar"
import { RoleSwitcherFab } from "@/components/shell/role-switcher"

const NARROW = "(max-width: 767px)"

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // On a phone the full sidebar leaves the page about 140px, which no
  // table survives, so narrow screens start on the icon rail. Choosing
  // otherwise with the toggle wins until the screen size changes again.
  const narrow = React.useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false
  )
  const [chosen, setChosen] = React.useState<{
    narrow: boolean
    collapsed: boolean
  } | null>(null)
  const collapsed =
    chosen && chosen.narrow === narrow ? chosen.collapsed : narrow
  const setCollapsed = (update: (v: boolean) => boolean) =>
    setChosen({ narrow, collapsed: update(collapsed) })

  return (
    <div className="flex h-dvh overflow-hidden bg-app-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {/* Demo-only persona switcher, docked to the right edge of the viewport. */}
      <RoleSwitcherFab />
    </div>
  )
}
