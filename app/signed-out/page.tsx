import Link from "next/link"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"

export const metadata = { title: "Signed out · Zelos HR" }

export default function SignedOutPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <LogOut className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          You have signed out
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The prototype has no accounts, so signing back in opens the demo as HR
          Admin with fresh data.
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/overview">Sign back in</Link>
        </Button>
      </div>
    </main>
  )
}
