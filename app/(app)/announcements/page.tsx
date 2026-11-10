"use client"

import * as React from "react"
import {
  CheckCircle2,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/shell/page-shell"
import {
  EmptyState,
  Initials,
  PageHeader,
  Panel,
  Pill,
  StatCard,
} from "@/components/common"
import { SegmentedTabs } from "@/components/common/segmented-tabs"
import { RowActions } from "@/components/common/row-actions"
import { FormDialog } from "@/components/common/form-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { ComposeDialog } from "@/components/announcements/compose-dialog"
import { useStore } from "@/lib/store"
import { has } from "@/lib/rbac"
import { formatDate, fullName } from "@/lib/format"
import {
  audienceLabel,
  feedFor,
  needsAttention,
  readStateOf,
  statsFor,
} from "@/lib/announcements"
import type { Announcement } from "@/lib/types"
import { cn } from "@/lib/utils"

const PREVIEW = 220

export default function AnnouncementsPage() {
  const store = useStore()
  const me = store.employeeById(store.viewer.employeeId)
  const isHr = has(store.viewer, "hr_admin")
  const [tab, setTab] = React.useState("all")
  const [composing, setComposing] = React.useState<Announcement | "new" | null>(
    null
  )
  const [archiving, setArchiving] = React.useState<Announcement | null>(null)
  const [who, setWho] = React.useState<Announcement | null>(null)
  const [open, setOpen] = React.useState<Set<string>>(new Set())

  // HR manages everything; everyone else sees what is for them.
  const feed = isHr
    ? [...store.announcements]
        .filter((a) => !a.archived)
        .sort(
          (x, y) =>
            Number(y.pinned) - Number(x.pinned) ||
            y.postedOn.localeCompare(x.postedOn)
        )
    : me
      ? feedFor(store.announcements, me)
      : []

  const stateOf = (a: Announcement) =>
    readStateOf(a, store.announcementReads, store.viewer.employeeId)
  const mineToDo = feed.filter((a) => needsAttention(a, stateOf(a)))
  const policies = feed.filter((a) => a.requiresAck)
  const shown = tab === "todo" ? mineToDo : tab === "policies" ? policies : feed

  function expand(a: Announcement) {
    setOpen((s) => new Set(s).add(a.id))
    if (stateOf(a) === "unread") store.markAnnouncementRead(a.id)
  }

  return (
    <PageShell
      width="wide"
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Announcements" },
      ]}
    >
      <PageHeader
        title="Announcements"
        description="News from the company, your team and your office. Policies ask you to confirm you have read them."
        actions={
          isHr && (
            <Button size="lg" onClick={() => setComposing("new")}>
              <Plus className="size-4" />
              New announcement
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Waiting on you"
          value={mineToDo.length}
          hint="Unread, or a policy to confirm"
        />
        <StatCard
          label="Policies"
          value={policies.length}
          hint="Need a confirmation"
        />
        <StatCard label="In your feed" value={feed.length} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <SegmentedTabs
          className="mb-5"
          tabs={[
            { value: "all", label: "All" },
            { value: "todo", label: "Needs you", count: mineToDo.length },
            { value: "policies", label: "Policies" },
          ]}
          emphasise={["todo"]}
        />
        <TabsContent value={tab}>
          {shown.length === 0 ? (
            <Panel>
              <EmptyState
                icon={Megaphone}
                title={tab === "todo" ? "You are up to date" : "Nothing here"}
                description={
                  tab === "todo"
                    ? "Nothing is unread and no policy is waiting for you."
                    : "Announcements for you appear here."
                }
              />
            </Panel>
          ) : (
            <ul className="space-y-4">
              {shown.map((a) => {
                const st = stateOf(a)
                const expanded = open.has(a.id) || a.body.length <= PREVIEW
                const poster = store.employeeById(a.postedBy)
                const stats = isHr
                  ? statsFor(a, store.employees, store.announcementReads)
                  : null
                return (
                  <li key={a.id}>
                    <article
                      className={cn(
                        "rounded-xl border bg-card",
                        needsAttention(a, st) && "border-primary/40"
                      )}
                    >
                      <div className="p-5">
                        <div className="flex flex-wrap items-start gap-3">
                          {poster && <Initials person={poster} size="md" />}
                          <div className="min-w-0 flex-1">
                            <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
                              {a.pinned && (
                                <Pin
                                  className="size-3.5 text-muted-foreground"
                                  aria-label="Pinned"
                                />
                              )}
                              {a.title}
                            </h2>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {fullName(poster)} · {formatDate(a.postedOn)}
                              </span>
                              <Pill tone="neutral">{audienceLabel(a)}</Pill>
                              {a.requiresAck && (
                                <Pill tone="warning">Policy</Pill>
                              )}
                              {st === "unread" && !isHr && (
                                <Pill tone="info">New</Pill>
                              )}
                            </p>
                          </div>
                          {isHr && (
                            <RowActions
                              label={`Actions for ${a.title}`}
                              actions={[
                                {
                                  label: "Edit",
                                  icon: Pencil,
                                  onSelect: () => setComposing(a),
                                },
                                {
                                  label: a.pinned ? "Unpin" : "Pin to the top",
                                  icon: a.pinned ? PinOff : Pin,
                                  onSelect: () =>
                                    store.updateAnnouncement(a.id, {
                                      pinned: !a.pinned,
                                    }),
                                },
                                {
                                  label: "Archive",
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () => setArchiving(a),
                                },
                              ]}
                            />
                          )}
                        </div>

                        <p className="mt-3 text-sm whitespace-pre-line">
                          {expanded
                            ? a.body
                            : `${a.body.slice(0, PREVIEW).trimEnd()}…`}
                        </p>
                        {!expanded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 -ml-2"
                            onClick={() => expand(a)}
                          >
                            Read more
                          </Button>
                        )}

                        {!isHr && (
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {a.requiresAck ? (
                              st === "acknowledged" ? (
                                <p className="flex items-center gap-1.5 text-sm text-primary">
                                  <CheckCircle2 className="size-4" />
                                  You confirmed this on{" "}
                                  {formatDate(
                                    store.announcementReads.find(
                                      (r) =>
                                        r.announcementId === a.id &&
                                        r.employeeId === store.viewer.employeeId
                                    )?.acknowledgedOn ?? ""
                                  )}
                                </p>
                              ) : (
                                <Button
                                  disabled={!expanded}
                                  title={expanded ? undefined : "Read it first"}
                                  onClick={() => {
                                    store.acknowledgeAnnouncement(a.id)
                                    toast.success(
                                      "Confirmed. It is recorded with today's date."
                                    )
                                  }}
                                >
                                  I have read and understood this
                                </Button>
                              )
                            ) : st === "unread" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => expand(a)}
                              >
                                Mark as read
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {stats && (
                        <div className="flex flex-wrap items-center gap-4 border-t px-5 py-3 text-sm">
                          <div className="min-w-[200px] flex-1">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                Read by {stats.read} of {stats.total}
                                {a.requiresAck &&
                                  ` · confirmed by ${stats.acknowledged}`}
                              </span>
                              <span className="tabular">
                                {stats.total
                                  ? Math.round(
                                      ((a.requiresAck
                                        ? stats.acknowledged
                                        : stats.read) /
                                        stats.total) *
                                        100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                  width: `${stats.total ? ((a.requiresAck ? stats.acknowledged : stats.read) / stats.total) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setWho(a)}
                          >
                            <Users className="size-3.5" />
                            Who has not
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              (a.requiresAck
                                ? stats.unacknowledged
                                : stats.unread
                              ).length === 0
                            }
                            onClick={() => {
                              const n = store.remindAnnouncement(a.id)
                              toast.success(
                                n
                                  ? `Reminder emailed to ${n}. It is in the Outbox.`
                                  : "Nobody to remind."
                              )
                            }}
                          >
                            Remind
                          </Button>
                        </div>
                      )}
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {composing && (
        <ComposeDialog
          existing={composing === "new" ? undefined : composing}
          onClose={() => setComposing(null)}
        />
      )}
      {who && <WhoDialog a={who} onClose={() => setWho(null)} />}
      {archiving && (
        <FormDialog
          title="Archive this announcement?"
          description={archiving.title}
          onClose={() => setArchiving(null)}
          footer={
            <>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setArchiving(null)}
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  store.archiveAnnouncement(archiving.id)
                  toast.success(
                    "Archived. It leaves everyone's feed; the record of who read it stays."
                  )
                  setArchiving(null)
                }}
              >
                Archive
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            It disappears from people&apos;s feeds. Who read and confirmed it is
            kept.
          </p>
        </FormDialog>
      )}
    </PageShell>
  )
}

function WhoDialog({ a, onClose }: { a: Announcement; onClose: () => void }) {
  const store = useStore()
  const stats = statsFor(a, store.employees, store.announcementReads)
  const list = a.requiresAck ? stats.unacknowledged : stats.unread
  return (
    <FormDialog
      title={a.requiresAck ? "Not yet confirmed" : "Not yet read"}
      description={`${list.length} of ${stats.total} in ${audienceLabel(a).toLowerCase()}`}
      onClose={onClose}
      footer={
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone has.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {list.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <Initials person={e} size="xs" />
              <span className="flex-1">{fullName(e)}</span>
              <span className="text-xs text-muted-foreground">
                {e.department}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FormDialog>
  )
}
