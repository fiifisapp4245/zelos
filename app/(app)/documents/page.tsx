"use client"

import * as React from "react"
import Link from "next/link"
import {
  BadgeCheck,
  BellRing,
  Download,
  FileText,
  History,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/common"
import { DocumentBadge } from "@/components/common/status"
import { RowActions } from "@/components/common/row-actions"
import { FilterSearch, FilterToolbar } from "@/components/common/filter-bar"
import { Button } from "@/components/ui/button"
import {
  DOC_CATEGORY_LABEL,
  DocumentHistoryDialog,
  EditDocumentDialog,
  RemoveDocumentDialog,
  UploadDocumentDialog,
  downloadDocument,
} from "@/components/documents/document-dialogs"
import { useStore } from "@/lib/store"
import { has, isSelf } from "@/lib/rbac"
import { visibleEmployees } from "@/lib/selectors"
import { DOC_STATUS_LABEL, daysUntil, formatDate, fullName } from "@/lib/format"
import type { DocumentStatus, EmployeeDocument } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORY_LABEL = DOC_CATEGORY_LABEL

const CATEGORIES = Object.keys(CATEGORY_LABEL) as EmployeeDocument["category"][]

type Dlg =
  | {
      kind: "upload"
      employeeId?: string
      category?: EmployeeDocument["category"]
    }
  | { kind: "replace" | "edit" | "remove" | "history"; doc: EmployeeDocument }
  | null

export default function DocumentsPage() {
  const store = useStore()
  const { viewer, employees, documents } = store
  const scope = visibleEmployees(viewer, employees)
  const scopeIds = new Set(scope.map((e) => e.id))

  const [dlg, setDlg] = React.useState<Dlg>(null)
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState<DocumentStatus | "all">("all")
  const [category, setCategory] = React.useState<
    EmployeeDocument["category"] | "all"
  >("all")

  const canSeeConfidential = has(viewer, "hr_admin")

  const inScope = documents
    .filter((d) => scopeIds.has(d.employeeId))
    .filter((d) => {
      if (!d.confidential) return true
      const emp = store.employeeById(d.employeeId)
      return canSeeConfidential || (emp ? isSelf(viewer, emp) : false)
    })

  const withheld =
    documents.filter((d) => scopeIds.has(d.employeeId)).length - inScope.length

  const q = query.trim().toLowerCase()
  const filtered = inScope.filter((d) => {
    if (status !== "all" && d.status !== status) return false
    if (category !== "all" && d.category !== category) return false
    if (q) {
      const emp = store.employeeById(d.employeeId)
      if (!`${d.name} ${fullName(emp)}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const expiring = inScope.filter((d) => d.status === "expiring").length
  const expired = inScope.filter((d) => d.status === "expired").length
  const missing = inScope.filter((d) => d.status === "missing").length

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Compliance" },
        { label: "Documents" },
      ]}
    >
      <PageHeader
        title="Document vault"
        description="Contracts, identity, statutory and certification documents. Expiry dates here feed the compliance alerts automatically."
        actions={
          <Button size="lg" onClick={() => setDlg({ kind: "upload" })}>
            <Upload className="size-4" />
            Upload
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="On file"
          value={inScope.length}
          hint="Visible to your role"
        />
        <StatCard
          label="Expiring soon"
          value={expiring}
          hint="Within 60 days"
        />
        <StatCard label="Expired" value={expired} hint="Past their date" />
        <StatCard
          label="Missing"
          value={missing}
          hint="Required but not uploaded"
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="border-b p-3">
          <FilterToolbar
            fields={[
              {
                kind: "select",
                key: "status",
                label: "Status",
                value: status,
                allLabel: "All statuses",
                options: (
                  Object.keys(DOC_STATUS_LABEL) as DocumentStatus[]
                ).map((s) => ({ value: s, label: DOC_STATUS_LABEL[s] })),
              },
              {
                kind: "select",
                key: "category",
                label: "Category",
                value: category,
                allLabel: "All categories",
                options: CATEGORIES.map((c) => ({
                  value: c,
                  label: CATEGORY_LABEL[c],
                })),
              },
            ]}
            onChange={(patch) => {
              if (patch.status)
                setStatus(patch.status as DocumentStatus | "all")
              if (patch.category)
                setCategory(
                  patch.category as EmployeeDocument["category"] | "all"
                )
            }}
            onClear={() => {
              setQuery("")
              setStatus("all")
              setCategory("all")
            }}
          >
            <FilterSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by document or person"
            />
          </FilterToolbar>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents match"
            description="Try a different search or clear the filters."
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((d) => {
              const emp = store.employeeById(d.employeeId)
              const expires = daysUntil(d.expiresOn)
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {emp && (
                        <Link
                          href={`/employees/${emp.id}`}
                          className="hover:underline"
                        >
                          {fullName(emp)}
                        </Link>
                      )}{" "}
                      · <span className="capitalize">{d.category}</span> ·{" "}
                      {d.sizeKb} KB
                    </p>
                  </div>
                  {emp && <Initials person={emp} size="xs" />}
                  {d.expiresOn && (
                    <span
                      className={cn(
                        "tabular w-32 shrink-0 text-right text-xs",
                        expires !== null && expires <= 60
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {expires !== null && expires < 0
                        ? "expired "
                        : "expires "}
                      {formatDate(d.expiresOn)}
                    </span>
                  )}
                  <DocumentBadge status={d.status} />
                  {d.status === "missing" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDlg({
                          kind: "upload",
                          employeeId: d.employeeId,
                          category: d.category,
                        })
                      }
                    >
                      <Upload className="size-3.5" />
                      Upload
                    </Button>
                  )}
                  <RowActions
                    label={`Actions for ${d.name}`}
                    actions={[
                      d.status !== "missing" && {
                        label: "Download",
                        icon: Download,
                        onSelect: () => downloadDocument(d, fullName(emp)),
                      },
                      {
                        label: "View history",
                        icon: History,
                        onSelect: () => setDlg({ kind: "history", doc: d }),
                      },
                      (has(viewer, "hr_admin") ||
                        (emp && isSelf(viewer, emp))) &&
                        d.status !== "missing" && {
                          label: "Replace file",
                          icon: RefreshCw,
                          onSelect: () => setDlg({ kind: "replace", doc: d }),
                        },
                      has(viewer, "hr_admin") && {
                        label: "Edit details",
                        icon: Pencil,
                        onSelect: () => setDlg({ kind: "edit", doc: d }),
                      },
                      has(viewer, "hr_admin") &&
                        d.status !== "verified" &&
                        d.status !== "missing" && {
                          label: "Mark verified",
                          icon: BadgeCheck,
                          onSelect: () => {
                            store.updateDocument(d.id, { status: "verified" })
                            toast.success(`${d.name} marked verified.`)
                          },
                        },
                      has(viewer, "hr_admin") &&
                        ["missing", "expiring", "expired"].includes(
                          d.status
                        ) && {
                          label: "Ask for a new copy",
                          icon: BellRing,
                          onSelect: () => {
                            store.addNotification({
                              title: `Upload needed: ${d.name}`,
                              body: `HR needs ${d.status === "missing" ? "a copy of" : "a current copy of"} ${d.name}.`,
                              kind: "alert",
                              href: "/me/documents",
                            })
                            toast.success(
                              `Request sent to ${emp ? fullName(emp) : "the employee"}.`
                            )
                          },
                        },
                      has(viewer, "hr_admin") && {
                        label: "Remove",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => setDlg({ kind: "remove", doc: d }),
                      },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}

        {withheld > 0 && (
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            {withheld} medical document{withheld === 1 ? "" : "s"} withheld.
            Medical records use purpose-based access — HR must state a reason on
            the employee&apos;s own record, and seniority alone does not grant
            it.
          </div>
        )}
      </Panel>
      {dlg?.kind === "upload" && (
        <UploadDocumentDialog
          employeeId={dlg.employeeId}
          category={dlg.category}
          onClose={() => setDlg(null)}
        />
      )}
      {dlg?.kind === "replace" && (
        <UploadDocumentDialog replace={dlg.doc} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "edit" && (
        <EditDocumentDialog doc={dlg.doc} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "remove" && (
        <RemoveDocumentDialog doc={dlg.doc} onClose={() => setDlg(null)} />
      )}
      {dlg?.kind === "history" && (
        <DocumentHistoryDialog doc={dlg.doc} onClose={() => setDlg(null)} />
      )}
    </PageShell>
  )
}
