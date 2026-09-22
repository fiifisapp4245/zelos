"use client"

import Link from "next/link"
import { BookOpen, Compass, ShieldCheck, Users } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { PageHeader, Panel } from "@/components/common"

const TOPICS = [
  {
    icon: Compass,
    title: "The employee journey",
    body: "One record carries a person from pre-hire through probation, active service, leave, notice and finally an end state. Lifecycle changes are a state machine, not free text.",
    href: "/lifecycle",
  },
  {
    icon: Users,
    title: "Reporting lines",
    body: "Everyone has a line manager. Some also have a dotted-line manager, who can approve leave and see operational data but never compensation.",
    href: "/org-chart",
  },
  {
    icon: ShieldCheck,
    title: "Who can see what",
    body: "Three access models run side by side: role-based for salary, purpose-based for medical records, and state-based for disciplinary cases.",
    href: "/settings/role-assignment",
  },
  {
    icon: BookOpen,
    title: "Why records stay complete",
    body: "A payroll run that discovers a missing SSNIT number has already failed. Completeness is surfaced on the record and enforced before a run starts.",
    href: "/payroll",
  },
]

export default function LearnMorePage() {
  return (
    <PageShell crumbs={[{ label: "Learn more" }]}>
      <PageHeader
        title="Learn more"
        description="How Zelos HR is put together, and why it behaves the way it does."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <Link key={t.title} href={t.href} className="block">
            <Panel className="h-full transition-colors hover:border-ring/50">
              <span className="grid size-9 place-items-center rounded-lg bg-success-muted text-primary">
                <t.icon className="size-4" />
              </span>
              <h2 className="mt-3 text-sm font-semibold">{t.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.body}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
