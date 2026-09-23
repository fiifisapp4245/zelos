import { CircleUser } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My profile"
      description="Your own record — personal details, emergency contact, employment and documents."
      icon={CircleUser}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My profile" },
      ]}
      emptyTitle="Nothing to review"
      emptyDescription="Details you can maintain yourself appear here; anything HR owns is shown read-only."
    />
  )
}
