"use client"

import * as React from "react"
import { Lock } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Panel } from "@/components/common"
import { useStore } from "@/lib/store"
import { canOpenCompanySettings } from "@/lib/rbac"

/**
 * The gate for every settings route. Pages under it do not check access
 * themselves: they render only once this has let the viewer through, so
 * a settings URL typed by hand shows a role the same locked door as the
 * menu would have.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { viewer } = useStore()

  if (!canOpenCompanySettings(viewer)) {
    return (
      <PageShell crumbs={[{ label: "Company settings" }]}>
        <Panel>
          <EmptyState
            icon={Lock}
            title="Company settings are restricted"
            description="Only HR Admins and the Company Owner can open this area. It controls how Zelos HR behaves for everyone in the organisation."
          />
        </Panel>
      </PageShell>
    )
  }

  return children
}
