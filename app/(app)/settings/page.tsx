import { redirect } from "next/navigation"

import { SETTINGS_NAV_GROUPS } from "@/lib/nav/settings-nav"

/**
 * Settings opens on its first page, inside the same frame as every other
 * one: the group tabs and the page list are the way around, so a separate
 * index of cards would be a second map of the same ground.
 */
export default function SettingsPage() {
  redirect(SETTINGS_NAV_GROUPS[0].items[0].href)
}
