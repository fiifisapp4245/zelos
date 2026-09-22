"use client"

import * as React from "react"

import { Sidebar } from "@/components/shell/sidebar"
import { RoleSwitcherFab } from "@/components/shell/role-switcher"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-app-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {/* Demo-only persona switcher, docked to the right edge of the viewport. */}
      <RoleSwitcherFab />
    </div>
  )
}
