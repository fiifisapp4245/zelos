import type { PermissionRole } from "./types"

/**
 * The signed-in user, shaped like the planned `GET /api/me/` response rather
 * than like the prototype's store, so the sidebar reads the same fields it
 * will read once the API exists. Snake case is deliberate: it is the wire
 * format, not our own.
 */
export interface SessionContext {
  id: string
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string
  roles: PermissionRole[]
  /**
   * Whether someone manages people is a fact about the org chart, not a flag
   * on their account — so it is counted, never stored as a boolean.
   */
  direct_report_count: number
  company: {
    name: string
  }
}
