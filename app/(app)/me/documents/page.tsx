"use client"

import { FileText } from "lucide-react"

import { ModulePlaceholder } from "@/components/common/module-placeholder"

export default function Page() {
  return (
    <ModulePlaceholder
      title="My documents"
      description="Your contract, certificates and identity documents, and anything HR has asked you to upload."
      icon={FileText}
      crumbs={[
        { label: "Workspace", href: "/overview" },
        { label: "Me" },
        { label: "My documents" },
      ]}
      emptyTitle="No documents on file"
      emptyDescription="Documents you upload and those HR files against your record appear here, newest first."
    />
  )
}
