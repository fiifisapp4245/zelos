import { RUN_TIMEOUT_MS, runCases, type CaseResult } from "@/lib/assess/logic"

/**
 * Runs a candidate's code in a Web Worker, not on the page.
 *
 * A worker has no access to the page, its storage or its cookies, and the
 * network calls are removed before the code runs (see runCases). It is killed
 * if it has not answered in a few seconds, which stops an infinite loop. This
 * is a prototype's sandbox: a real build runs candidate code in an isolated
 * server-side container with memory and CPU limits, never in the browser.
 */
export function runInSandbox(
  source: string,
  fn: string,
  cases: { args: unknown[]; expected: unknown; hidden: boolean }[]
): Promise<{ results: CaseResult[]; timedOut: boolean }> {
  return new Promise((resolve) => {
    const body = `const runCases = ${runCases.toString()};
self.onmessage = (e) => { self.postMessage(runCases(e.data.source, e.data.fn, e.data.cases)); };`
    const url = URL.createObjectURL(
      new Blob([body], { type: "text/javascript" })
    )
    const worker = new Worker(url)
    const done = (r: { results: CaseResult[]; timedOut: boolean }) => {
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(url)
      resolve(r)
    }
    const timer = setTimeout(
      () =>
        done({
          timedOut: true,
          results: cases.map((c) => ({
            passed: false,
            hidden: c.hidden,
            ...(c.hidden
              ? {}
              : {
                  got: "Time limit exceeded",
                  expected: JSON.stringify(c.expected),
                }),
          })),
        }),
      RUN_TIMEOUT_MS
    )
    worker.onmessage = (e: MessageEvent<CaseResult[]>) =>
      done({ results: e.data, timedOut: false })
    worker.onerror = (e) => {
      e.preventDefault()
      done({
        timedOut: false,
        results: cases.map((c) => ({
          passed: false,
          hidden: c.hidden,
          ...(c.hidden
            ? {}
            : {
                got: `Error: ${e.message}`,
                expected: JSON.stringify(c.expected),
              }),
        })),
      })
    }
    worker.postMessage({ source, fn, cases })
  })
}
