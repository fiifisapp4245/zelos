"use client"

import * as React from "react"
import { Copy, ExternalLink, Globe, Pencil, EyeOff, Eye } from "lucide-react"
import { toast } from "sonner"

import { EmptyState, Panel, Pill, type Tone } from "@/components/common"
import { RowActions } from "@/components/common/row-actions"
import { Button } from "@/components/ui/button"
import { RequisitionDialog } from "./recruitment-dialogs"
import { copyText } from "./booking-tab"
import { useStore } from "@/lib/store"
import { TODAY_ISO, formatDate } from "@/lib/format"
import { isListed } from "@/lib/careers"
import type { Requisition } from "@/lib/types"

function listingState(r: Requisition): {
  label: string
  tone: Tone
  why?: string
} {
  if (!r.careers) return { label: "Not set up", tone: "neutral" }
  if (isListed(r, TODAY_ISO)) return { label: "Live", tone: "success" }
  if (!r.careers.published) return { label: "Not published", tone: "neutral" }
  if (r.status !== "open")
    return {
      label: "Hidden",
      tone: "warning",
      why: `The requisition is ${r.status.replace("_", " ")}.`,
    }
  return {
    label: "Closed",
    tone: "neutral",
    why: `Closed on ${formatDate(r.careers.closesOn!)}.`,
  }
}

export function CareersTab() {
  const store = useStore()
  const [editing, setEditing] = React.useState<Requisition | null>(null)
  const live = store.requisitions.filter((r) => isListed(r, TODAY_ISO)).length
  const url = () => `${window.location.origin}/careers`

  return (
    <Panel
      title="Careers page"
      description={`${live} role${live === 1 ? "" : "s"} live on your public jobs page. Applications arrive in the pipeline at Applied.`}
      bodyClassName="p-0"
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyText(url(), "Careers link copied.")}
          >
            <Copy className="size-3.5" />
            Copy link
          </Button>
          <Button size="sm" onClick={() => window.open(url(), "_blank")}>
            <ExternalLink className="size-3.5" />
            Open page
          </Button>
        </>
      }
    >
      {store.requisitions.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No requisitions"
          description="Create a requisition, then publish it here."
        />
      ) : (
        <ul className="divide-y">
          {store.requisitions.map((r) => {
            const st = listingState(r)
            const apps = store.candidates.filter(
              (c) => c.requisitionId === r.id && c.source === "Careers page"
            ).length
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{r.title}</span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.id}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {st.why ? `${st.why} ` : ""}
                    {apps} application{apps === 1 ? "" : "s"} from the page
                    {r.careers?.closesOn &&
                      ` · apply by ${formatDate(r.careers.closesOn)}`}
                  </p>
                </div>
                <RowActions
                  label={`Actions for ${r.title}`}
                  actions={[
                    {
                      label: "Edit listing",
                      icon: Pencil,
                      onSelect: () => setEditing(r),
                    },
                    r.careers?.published
                      ? {
                          label: "Take off the page",
                          icon: EyeOff,
                          onSelect: () => {
                            store.updateRequisition(r.id, {
                              careers: { ...r.careers!, published: false },
                            })
                            toast.success("Taken off the careers page.")
                          },
                        }
                      : {
                          label: "Publish",
                          icon: Eye,
                          onSelect: () => {
                            if (
                              !r.careers ||
                              r.careers.summary.trim().length < 20
                            ) {
                              toast("Add a summary first, then publish.")
                              setEditing(r)
                              return
                            }
                            store.updateRequisition(r.id, {
                              careers: { ...r.careers, published: true },
                            })
                            toast.success(
                              r.status === "open"
                                ? "Published."
                                : "Published, but it shows only while the requisition is open."
                            )
                          },
                        },
                    isListed(r, TODAY_ISO) && {
                      label: "View public page",
                      icon: ExternalLink,
                      onSelect: () => window.open(`${url()}/${r.id}`, "_blank"),
                    },
                  ]}
                />
              </li>
            )
          })}
        </ul>
      )}
      {editing && (
        <RequisitionDialog
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Panel>
  )
}
