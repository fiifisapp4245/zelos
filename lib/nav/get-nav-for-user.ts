import type { SessionContext } from "../session"
import {
  NAV_ITEMS,
  NAV_SECTION_LABEL,
  SECTION_ORDER,
  type NavAudience,
  type NavSection,
} from "./nav-config"

/**
 * Which sidebar someone gets. Exactly one, because the three products in the
 * spec are distinct sidebars rather than a union of permissions — an HR Admin
 * who happens to have direct reports still sees the HR Admin sidebar.
 *
 * Managing people is read from the org chart (`direct_report_count`), never
 * from a stored flag, so a transfer changes the sidebar without an edit.
 */
export function resolveAudience(session: SessionContext): NavAudience {
  if (session.roles.includes("hr_admin")) return "hr_admin"
  if (session.roles.includes("payroll")) return "payroll"
  if (session.direct_report_count > 0) return "manager"

  // Default branch. Anyone the rules above do not claim — including a session
  // carrying no roles at all, or a role this build does not know — gets the
  // employee product. Nobody is ever left without a home.
  return "employee"
}

/**
 * Builds the sidebar for one session. Pure: same session in, same sections
 * out, no store, no router, no clock.
 */
export function getNavForUser(session: SessionContext): NavSection[] {
  const audience = resolveAudience(session)

  return SECTION_ORDER[audience]
    .map((id) => ({
      id,
      label: NAV_SECTION_LABEL[id],
      items: NAV_ITEMS.filter(
        (item) => item.section === id && item.roles.includes(audience)
      ),
    }))
    .filter((section) => section.items.length > 0)
}
