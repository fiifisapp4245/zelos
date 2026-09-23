import { Target } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My performance"
      description="Your goals, check-ins and review history."
      icon={Target}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My performance" },
      ]}
      emptyTitle="No review cycle is open"
      emptyDescription="Your goals and the notes from your check-ins appear here once a cycle is running."
    />
  )
}
