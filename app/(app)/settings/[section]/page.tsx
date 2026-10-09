"use client"

import * as React from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Globe,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { SettingsNav } from "@/components/shell/settings-nav"
import { SETTINGS_NAV_GROUPS } from "@/lib/nav/settings-nav"
import { EmptyState, Panel, Pill } from "@/components/common"
import { useStore } from "@/lib/store"
import { MIN_AGGREGATION_GROUP, ROLE_LABEL, has } from "@/lib/rbac"
import { findSetting } from "@/lib/data/settings"
import { SETTINGS_CONTENT } from "@/lib/data/settings-content"
import { SettingBlocks } from "./blocks"
import {
  CountryRulesPanel,
  PayApprovalsPanel,
  PayComponentsPanel,
  PayGroupsPanel,
} from "@/components/pay/settings-panels"
import { CompanyInformation } from "./company-information"
import type { PermissionRole } from "@/lib/types"

export default function SettingDetailPage() {
  const { section } = useParams<{ section: string }>()
  const { viewer } = useStore()
  const found = findSetting(section)

  if (!found) notFound()
  const { category, item } = found
  // The crumb names the group the settings navigation files this under, so
  // the trail and the rail agree.
  const group = SETTINGS_NAV_GROUPS.find((g) =>
    g.items.some((i) => i.href === `/settings/${section}`)
  )
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
      width="wide"
      crumbs={[
        { label: "Company settings", href: "/settings" },
        { label: group?.label ?? category.label, href: "/settings" },
        { label: item.label },
      ]}
    >
      {/* Title band, matching the hub: white, full width, divider beneath. */}
      <div className="border-b pb-6">
        <Link
          href="/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Company Settings
        </Link>
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          {item.label}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
          {item.blurb}
        </p>
      </div>

      <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-start">
        <SettingsNav className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[232px]" />

        <div className="min-w-0 flex-1">
          {section === "company-information" ? (
            <CompanyInformation />
          ) : section === "localization" ? (
            <LocalizationPanel />
          ) : section === "role-assignment" ? (
            <RoleAssignmentPanel />
          ) : section === "pay-groups" ? (
            <PayGroupsPanel />
          ) : section === "allowance-deduction-type" ? (
            <PayComponentsPanel />
          ) : section === "statutory-settings" ? (
            <CountryRulesPanel />
          ) : section === "payroll-approval" ? (
            <PayApprovalsPanel />
          ) : blocks ? (
            <SettingBlocks blocks={blocks} />
          ) : (
            <Panel>
              <EmptyState
                icon={SlidersHorizontal}
                title={`No ${item.label.toLowerCase()} configured`}
                description="Nothing has been set here yet. Whatever is configured will apply across the company."
              />
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  )
}

/**
 * Company-wide defaults, and nothing that payroll depends on.
 *
 * These are the choices a company makes once — how dates are written,
 * which currency a figure means when nothing says otherwise. The
 * countries payroll actually calculates for are not here: they come
 * from the pay groups, because a company can run payroll in three
 * countries and there is no single "active jurisdiction" to name.
 */
const COMPANY_DEFAULTS: Record<string, string> = {
  "Main country": "Ghana",
  "Default currency": "GHS — Ghana Cedi",
  "Date format": "18 Sept 2026",
  "Time format": "24-hour",
  Timezone: "GMT (UTC+0) — Africa/Accra",
  "Week starts": "Monday",
  "Address format": "GhanaPost GPS",
}

function LocalizationPanel() {
  const { payGroups, legalEntities, countryRulePacks } = useStore()

  // Jurisdictions are derived from where people are actually paid, so
  // this list cannot fall out of step with payroll.
  const jurisdictions = [
    ...new Set(payGroups.map((g) => g.country).filter((c) => c !== "—")),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((country) => ({
      country,
      groups: payGroups.filter((g) => g.country === country),
      entities: [
        ...new Set(
          payGroups
            .filter((g) => g.country === country)
            .map(
              (g) =>
                legalEntities.find((e) => e.id === g.entityId)?.name ?? "—"
            )
        ),
      ],
      covered: countryRulePacks.some((p) => p.country === country),
    }))

  const unlocated = payGroups.filter((g) => g.country === "—")

  return (
    <div className="max-w-3xl space-y-4">
      <Panel
        title="Company defaults"
        description="How this company writes dates, times and money when nothing more specific applies."
        actions={
          <Pill tone="success" dot>
            <Globe className="size-3" />
            Ghana
          </Pill>
        }
      >
        <dl className="space-y-2.5 text-sm">
          {Object.entries(COMPANY_DEFAULTS).map(([k, v]) => (
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

      <Panel
        title="Countries payroll runs in"
        description="Read from the pay groups. A country is added by creating a pay group for it, not by changing a setting here."
        bodyClassName="p-0"
        actions={
          <Link
            href="/settings/pay-groups"
            className="text-sm font-medium text-primary hover:underline"
          >
            Pay groups
          </Link>
        }
      >
        <ul className="divide-y text-sm">
          {jurisdictions.map((j) => (
            <li key={j.country} className="px-5 py-3">
              <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <span className="font-medium">{j.country}</span>
                {j.covered ? (
                  <Link
                    href="/settings/statutory-settings"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Country rules
                  </Link>
                ) : (
                  <Pill tone="neutral">Uploaded results</Pill>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {j.entities.join(", ")} ·{" "}
                {j.groups.length === 1
                  ? "1 pay group"
                  : `${j.groups.length} pay groups`}{" "}
                · {[...new Set(j.groups.map((g) => g.currency))].join(", ")}
              </span>
            </li>
          ))}
          {unlocated.length > 0 && (
            <li className="px-5 py-3">
              <span className="font-medium">No single country</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {unlocated.map((g) => g.name).join(", ")} — people are paid
                where they are, so no country&rsquo;s rules apply to the group
                as a whole.
              </span>
            </li>
          )}
        </ul>
      </Panel>
    </div>
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
      head_of_department: "conditional",
      line_manager: "conditional",
      employee: "conditional",
    },
  },
  {
    capability: "Approve a pay change",
    roles: {
      hr_admin: "conditional",
      payroll: false,
      head_of_department: false,
      line_manager: false,
      employee: false,
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
