/**
 * Every way into the Leave module from somewhere else.
 *
 * Attendance never decides a request, files one or edits a balance. It
 * reads the leave data and sends people here, so there is one place
 * where leave is actually done.
 */
export const leaveLink = {
  /** One request, opened where it sits. */
  request: (id: string) => `/leave?request=${id}`,
  /** The approval screen, with the request in question highlighted. */
  approval: (id: string) => `/leave?tab=approvals&request=${id}`,
  /** Someone's balances. */
  balances: (employeeId: string) =>
    `/leave?tab=balances&employee=${employeeId}`,
  /** The request form, prefilled for a person and a date range. */
  fileFor: (employeeId: string, from: string, to: string) =>
    `/leave?new=1&for=${employeeId}&from=${from}&to=${to}`,
}
