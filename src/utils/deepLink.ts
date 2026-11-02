/**
 * Links from outside the app (the Home Assistant card): `?zadanie=123` opens that task, `?nowe` the new-task dialog.
 * Read once, from the address the app was opened with – before the router's redirects drop the query.
 */
const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)

export const deepLink: { taskId: number | null, newTask: boolean } = {
  taskId: Number.parseInt(initial.get('zadanie') ?? '', 10) || null,
  newTask: initial.has('nowe'),
}

/** The query is used – out of the address, so a reload doesn't open the dialog again. */
export function clearDeepLink (): void {
  deepLink.taskId = null
  deepLink.newTask = false

  const url = new URL(window.location.href)
  url.searchParams.delete('zadanie')
  url.searchParams.delete('nowe')
  window.history.replaceState(window.history.state, '', url)
}
