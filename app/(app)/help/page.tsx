"use client"

import Link from "next/link"
import { LifeBuoy, Mail, MessageSquare } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader, Panel } from "@/components/common"
import { Button } from "@/components/ui/button"

export default function HelpPage() {
  return (
    <PageShell crumbs={[{ label: "Help" }]}>
      <PageHeader
        title="Help"
        description="This build is a prototype. Nothing here contacts a real support desk."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Panel>
          <span className="grid size-9 place-items-center rounded-lg bg-success-muted text-primary">
            <LifeBuoy className="size-4" />
          </span>
          <h2 className="mt-3 text-sm font-semibold">Guided tour</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the persona switcher docked to the right edge of the screen to
            see how the same screens change for HR, a line manager and an
            employee.
          </p>
        </Panel>

        <Panel>
          <span className="grid size-9 place-items-center rounded-lg bg-success-muted text-primary">
            <MessageSquare className="size-4" />
          </span>
          <h2 className="mt-3 text-sm font-semibold">How it works</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The Learn more pages cover the lifecycle, reporting lines and the
            permission model.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/learn">Open Learn more</Link>
          </Button>
        </Panel>

        <Panel>
          <span className="grid size-9 place-items-center rounded-lg bg-success-muted text-primary">
            <Mail className="size-4" />
          </span>
          <h2 className="mt-3 text-sm font-semibold">Contact support</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Not wired up in the prototype. In production this opens a ticket
            against the People Operations queue.
          </p>
        </Panel>
      </div>
    </PageShell>
  )
}
