"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useStore } from "@/lib/store"
import { fullName, initials, relativeTime } from "@/lib/format"
import { canViewRecord } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getNavForUser } from "@/lib/nav/get-nav-for-user"

export interface Crumb {
  label: string
  href?: string
}

export function Topbar({ crumbs }: { crumbs: Crumb[] }) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    function onOpen() {
      setSearchOpen(true)
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("zelos:open-search", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("zelos:open-search", onOpen)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-5">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <li
              key={`${c.label}-${i}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {c.href && i < crumbs.length - 1 ? (
                <Link
                  href={c.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate",
                    i === crumbs.length - 1
                      ? "font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <ThemeToggle />
      <NotificationBell />

      {searchOpen && <SearchPalette onOpenChange={setSearchOpen} />}
    </header>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // The icon is chosen by CSS rather than by a mounted flag, so there is nothing
  // for the server and client to disagree about.
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="size-[18px] dark:hidden" />
      <Sun className="hidden size-[18px] dark:block" />
    </Button>
  )
}

function NotificationBell() {
  const { notifications, markNotificationsRead } = useStore()
  const unread = notifications.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markNotificationsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ul className="max-h-[380px] overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id} className="border-b last:border-0">
              <Link
                href={n.href ?? "#"}
                className="flex gap-2.5 px-3 py-3 transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-primary"
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug font-medium">
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {n.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/80">
                    {relativeTime(n.at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t p-2">
          <Link
            href="/alerts"
            className="block rounded-lg px-2.5 py-2 text-center text-sm text-primary transition-colors hover:bg-muted"
          >
            View all alerts
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SearchPalette({
  onOpenChange,
}: {
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const { employees, viewer, session } = useStore()
  // Mounted only while open, so the query clears itself on close.
  const [query, setQuery] = React.useState("")

  const q = query.trim().toLowerCase()

  const pages = React.useMemo(
    () =>
      getNavForUser(session)
        .flatMap((g) => g.items)
        .filter((i) => !q || i.label.toLowerCase().includes(q)),
    [q, session]
  )

  // Directory search needs 3 characters, matching the spec for the employee list.
  const people = React.useMemo(() => {
    if (q.length < 3) return []
    return employees
      .filter((e) => canViewRecord(viewer, e, employees))
      .filter(
        (e) =>
          fullName(e).toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [q, employees, viewer])

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] max-w-[560px] translate-y-0 gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Find people and pages across Zelos HR.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2.5 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, pages…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto p-2">
          {people.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                People
              </p>
              {people.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => go(`/employees/${e.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white",
                      e.avatarTone
                    )}
                  >
                    {initials(e)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {fullName(e)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.jobTitle} · {e.employeeId}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}

          {q.length > 0 && q.length < 3 && people.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Type at least 3 characters to search people.
            </p>
          )}

          {pages.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                Pages
              </p>
              {pages.map((p) => (
                <button
                  key={p.href + p.label}
                  type="button"
                  onClick={() => go(p.href)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <p.icon className="size-4 shrink-0 text-muted-foreground" />
                  {p.label}
                </button>
              ))}
            </>
          )}

          {pages.length === 0 && people.length === 0 && q.length >= 3 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query}”.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
