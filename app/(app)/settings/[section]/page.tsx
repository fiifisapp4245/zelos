"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import {
  Check,
  Construction,
  Globe,
  Lock,
  ShieldCheck,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState, Panel, Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { MIN_AGGREGATION_GROUP, ROLE_LABEL, has } from "@/lib/rbac"
import { RETIREMENT_AGE } from "@/lib/format"
import { findSetting } from "@/lib/data/settings"
import { SETTINGS_CONTENT } from "@/lib/data/settings-content"
import { SettingBlocks } from "./blocks"
import type { PermissionRole } from "@/lib/types"

export default function SettingDetailPage() {
  const { section } = useParams<{ section: string }>()
  const { viewer } = useStore()
  const found = findSetting(section)

  if (!found) notFound()
  const { category, item } = found
  const blocks = SETTINGS_CONTENT[section]

  if (!has(viewer, "hr_admin")) {
    return (
      <PageShell
        crumbs={[{ label: "Company settings" }, { label: item.label }]}
      >
        <Panel>
          <EmptyState
            icon={Lock}
            title="Company settings are restricted"
            description="Only HR Admins and the Company Owner can open this area."
          />
        </Panel>
      </PageShell>
    )
  }

  return (
    <PageShell
      crumbs={[
        { label: "Company settings", href: "/settings" },
        { label: category.label, href: "/settings" },
        { label: item.label },
      ]}
    >
      {/* Title band, matching the hub: white, full width, divider beneath. */}
      <div className="border-b pb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          {item.label}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          {item.blurb}
        </p>
      </div>

      <div className="py-6">
        {section === "localization" ? (
          <LocalizationPanel />
        ) : section === "role-assignment" ? (
          <RoleAssignmentPanel />
        ) : blocks ? (
          <SettingBlocks blocks={blocks} />
        ) : (
          <Panel>
            <EmptyState
              icon={Construction}
              title="Not built in this round"
              description="The hub, its structure and the areas already wired up are in. This screen is scheduled for a later round."
              action={
                <Button variant="outline" asChild>
                  <Link href="/settings">Back to Company Settings</Link>
                </Button>
              }
            />
          </Panel>
        )}
      </div>
    </PageShell>
  )
}

/**
 * Country-varying values live as configuration, not as a generalised engine.
 * A second jurisdiction is added by adding a profile here, not by rewriting logic.
 */
const JURISDICTION: Record<string, string> = {
  Country: "Ghana",
  Currency: "GHS — Ghana Cedi",
  "National ID": "Ghana Card",
  "Tax identifier": "TIN (Ghana Revenue Authority)",
  "Social security": "SSNIT — 5.5% employee, 13% employer",
  "Pension tiers": "Tier 1 & 2 mandatory, Tier 3 voluntary",
  "Minimum annual leave": "15 working days",
  "Maternity leave": "14 weeks statutory",
  "Retirement age": `${RETIREMENT_AGE} years`,
  "Payroll cycle": "Monthly, 28th",
  "Address format": "GhanaPost GPS",
}

function LocalizationPanel() {
  return (
    <Panel
      className="max-w-3xl"
      title="Active jurisdiction"
      description="Country-varying values are configuration. Adding a second country means adding a profile here, not rewriting the system."
      actions={
        <Pill tone="success" dot>
          <Globe className="size-3" />
          Ghana
        </Pill>
      }
    >
      <dl className="space-y-2.5 text-sm">
        {Object.entries(JURISDICTION).map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-4 border-b pb-2 last:border-0"
          >
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

const ROLES: PermissionRole[] = [
  "hr_admin",
  "payroll",
  "head_of_department",
  "line_manager",
  "employee",
]

const PERMISSION_MATRIX: {
  capability: string
  roles: Record<PermissionRole, boolean | "conditional">
}[] = [
  {
    capability: "View any employee record",
    roles: {
      hr_admin: true,
      payroll: true,
      head_of_department: "conditional",
      line_manager: "conditional",
      employee: false,
    },
  },
  {
    capability: "View compensation",
    roles: {
      hr_admin: true,
      payroll: true,
      head_of_department: false,
      line_manager: false,
      employee: "conditional",
    },
  },
  {
    capability: "Reveal SSNIT / TIN",
    roles: {
      hr_admin: true,
      payroll: true,
      head_of_department: false,
      line_manager: false,
      employee: "conditional",
    },
  },
  {
    capability: "Change lifecycle state",
    roles: {
      hr_admin: true,
      payroll: false,
      head_of_department: false,
      line_manager: false,
      employee: false,
    },
  },
  {
    capability: "Approve leave",
    roles: {
      hr_admin: true,
      payroll: false,
      head_of_department: "conditional",
      line_manager: "conditional",
      employee: false,
    },
  },
  {
    capability: "Write coaching notes",
    roles: {
      hr_admin: true,
      payroll: false,
      head_of_department: true,
      line_manager: true,
      employee: false,
    },
  },
  {
    capability: "Read the audit log",
    roles: {
      hr_admin: true,
      payroll: false,
      head_of_department: false,
      line_manager: false,
      employee: false,
    },
  },
  {
    capability: "Edit own contact details",
    roles: {
      hr_admin: true,
      payroll: true,
      head_of_department: true,
      line_manager: true,
      employee: true,
    },
  },
  {
    capability: "Edit organisation structure",
    roles: {
      hr_admin: true,
      payroll: false,
      head_of_department: false,
      line_manager: false,
      employee: false,
    },
  },
]

function RoleAssignmentPanel() {
  return (
    <div className="space-y-5">
      <Panel
        title="Permission model"
        description="Permission roles are separate from job titles — one person can hold several at once, which is the normal case in a small company."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-2.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Capability
                </th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className="px-3 py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {PERMISSION_MATRIX.map((row) => (
                <tr
                  key={row.capability}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-2.5">{row.capability}</td>
                  {ROLES.map((r) => {
                    const v = row.roles[r]
                    return (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {v === true ? (
                          <Check className="mx-auto size-4 text-primary" />
                        ) : v === "conditional" ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Only within their own scope — team, department or own record"
                          >
                            scoped
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">scoped</strong> means
          the capability applies only within that role&apos;s own reach — their
          direct reports, their department, or their own record.
        </p>
      </Panel>

      <Panel
        title="Privacy floor"
        description="Protects the boundaries the performance and medical models depend on."
      >
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="font-medium">
                Aggregates need {MIN_AGGREGATION_GROUP}+ people.
              </strong>{" "}
              <span className="text-muted-foreground">
                Below that, a &ldquo;team average&rdquo; is just one
                person&apos;s data with a label on it.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="font-medium">
                Medical access needs a stated purpose.
              </strong>{" "}
              <span className="text-muted-foreground">
                Seniority alone does not open a medical record.
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              <strong className="font-medium">Every edit is attributed.</strong>{" "}
              <span className="text-muted-foreground">
                The audit log cannot be edited or cleared, by anyone.
              </span>
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  )
}
