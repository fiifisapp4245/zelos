"use client"

import * as React from "react"
import { Copy, ExternalLink, Send } from "lucide-react"
import { toast } from "sonner"

import { Pill } from "@/components/common"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "./form"
import { assessUrl } from "./assessments-tab"
import { copyText } from "./booking-tab"
import { FlagsSummary, ReviewAssessmentDialog } from "./review-assessment"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { outcomeOf, timeTakenMin } from "@/lib/assess/logic"
import type { Candidate } from "@/lib/types"

/** Sends a candidate a timed test, and shows where each one stands and what it scored. */
export function CandidateAssessment({ c }: { c: Candidate }) {
  const store = useStore()
  const isHr = has(store.viewer, "hr_admin")
  const tests = store.tests.filter(
    (t) => t.active && (!t.requisitionId || t.requisitionId === c.requisitionId)
  )
  const mine = store.invitations.filter((i) => i.candidateId === c.id)
  const [testId, setTestId] = React.useState(
    (tests.find((t) => t.requisitionId === c.requisitionId) ?? tests[0])?.id ??
      ""
  )
  const [review, setReview] = React.useState<string | null>(null)
  const closed = c.stage === "rejected" || c.stage === "hired"

  // A manager can see how a candidate did, but sending and marking are HR's.
  if (!isHr && mine.length === 0) return null

  return (
    <section>
      <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Assessment
      </h3>
      {isHr && !closed && (
        <div className="mb-3 space-y-3 rounded-lg border bg-muted/20 p-3">
          {tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No test is open for this role. Create one under Recruitment →
              Assessments.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                aria-label="Test"
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                className="h-9 w-auto min-w-[220px] flex-1"
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.durationMin} min
                  </option>
                ))}
              </NativeSelect>
              <Button
                size="sm"
                disabled={!testId}
                onClick={() => {
                  const r = store.sendAssessment(c.id, testId)
                  if (r.ok)
                    toast.success(
                      `Assessment emailed to ${c.name}. It is in the Outbox.`
                    )
                  else toast.error(r.reason)
                }}
              >
                <Send className="size-3.5" />
                Send assessment
              </Button>
            </div>
          )}
        </div>
      )}

      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assessment sent yet.</p>
      ) : (
        <ul className="space-y-2">
          {mine.map((inv) => {
            const t = store.tests.find((x) => x.id === inv.testId)
            const o = t ? outcomeOf(inv, t, store.questionBank) : null
            return (
              <li key={inv.id} className="rounded-lg border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t?.name ?? "Test"}</span>
                  <Pill
                    tone={
                      inv.status === "submitted"
                        ? "success"
                        : inv.status === "started"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {inv.status === "invited"
                      ? "Not started"
                      : inv.status === "started"
                        ? "In progress"
                        : inv.status === "submitted"
                          ? "Submitted"
                          : "Expired"}
                  </Pill>
                  {inv.reviewed ? (
                    <Pill tone={o?.passed ? "success" : "danger"}>
                      {o?.passed ? "Passed" : "Below pass mark"}
                    </Pill>
                  ) : inv.status === "submitted" ? (
                    <Pill tone="warning">Needs review</Pill>
                  ) : null}
                </p>
                {inv.status === "submitted" && o && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.score}/{o.max} ({o.pct}%) · {timeTakenMin(inv) ?? "?"}{" "}
                    min
                    {o.pending > 0 && ` · ${o.pending} written to mark`}
                  </p>
                )}
                {inv.status !== "invited" && (
                  <div className="mt-1">
                    <FlagsSummary inv={inv} />
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {isHr && inv.status === "submitted" && (
                    <Button
                      size="xs"
                      variant={inv.reviewed ? "outline" : "default"}
                      onClick={() => setReview(inv.id)}
                    >
                      {inv.reviewed ? "View review" : "Review"}
                    </Button>
                  )}
                  {isHr &&
                    (inv.status === "invited" || inv.status === "started") && (
                      <>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            copyText(assessUrl(inv.token), "Link copied.")
                          }
                        >
                          <Copy className="size-3" />
                          Copy link
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() =>
                            window.open(assessUrl(inv.token), "_blank")
                          }
                        >
                          <ExternalLink className="size-3" />
                          Open as the candidate
                        </Button>
                      </>
                    )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {review && (
        <ReviewAssessmentDialog
          invId={review}
          onClose={() => setReview(null)}
        />
      )}
    </section>
  )
}
