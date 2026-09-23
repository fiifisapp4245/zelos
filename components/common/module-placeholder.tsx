"use client"

import type { LucideIcon } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, PageHeader, Panel } from "@/components/common"
import type { Crumb } from "@/components/shell/topbar"

/**
 * A module that exists in the navigation and has nothing in it yet. It is a
 * real screen with a real title and no data — never a notice about when the
 * feature is due, which is not something the product should ever say.
 */
export function ModulePlaceholder({
  title,
  description,
  crumbs,
  icon,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  crumbs: Crumb[]
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <PageShell crumbs={crumbs}>
      <PageHeader title={title} description={description} />
      <Panel bodyClassName="p-0">
        <EmptyState
          icon={icon}
          title={emptyTitle}
          description={emptyDescription}
        />
      </Panel>
    </PageShell>
  )
}
