"use client"

import Link from "next/link"
import { Construction } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  SectionGrid,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { ROLE_LABEL } from "@/lib/rbac"
import { fullName } from "@/lib/format"

/**
 * Account Settings is per-person: your own profile, sign-in and notification
 * preferences. Company Settings, by contrast, configures the whole organisation.
 */
export default function AccountSettingsPage() {
  const store = useStore()
  const me = store.employeeById(store.viewer.employeeId)

  return (
    <PageShell
      crumbs={[
        { label: "Account settings", href: "/account" },
        { label: "Summary" },
      ]}
    >
      <PageHeader
        title="Account Settings"
        description="Your own profile, sign-in and notification preferences. Anything that affects the whole organisation lives in Company Settings."
      />

      <div className="space-y-5">
        <Panel
          title="Signed in as"
          actions={
            me && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/employees/${me.id}`}>Open my record</Link>
              </Button>
            )
          }
        >
          <SectionGrid cols={3}>
            <Field label="Name" value={fullName(me)} />
            <Field label="Work email" value={me?.email ?? "—"} />
            <Field label="Active role" value={ROLE_LABEL[store.activeRole]} />
          </SectionGrid>
        </Panel>

        <Panel>
          <EmptyState
            icon={Construction}
            title="Not built in this round"
            description="Password, two-factor enrolment, language and personal notification preferences are scheduled for a later round."
            action={
              <Button variant="outline" asChild>
                <Link href="/settings">Go to Company Settings</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    </PageShell>
  )
}
