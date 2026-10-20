/** Native drag & drop of tasks: reordering lists and columns, between columns, onto the day timeline. */

const TYPE = 'application/x-todo-task'

/** dragover can't read the data, only its types – lists need to know which task it is to accept it */
let dragged: number | null = null

export function setDragTask (event: DragEvent, id: number): void {
  dragged = id

  if (!event.dataTransfer) {
    return
  }

  event.dataTransfer.setData(TYPE, String(id))
  event.dataTransfer.setData('text/plain', String(id))
  event.dataTransfer.effectAllowed = 'move'
}

export function endDragTask (): void {
  dragged = null
}

/** The task being dragged in this window, if any. */
export function draggedTask (): number | null {
  return dragged
}

/**
 * Where a drop at `clientY` lands among the items of `container` marked with `attribute` (their id):
 * before the first item whose middle is below the pointer, else after the last one.
 */
export function dropTarget (container: HTMLElement, clientY: number, attribute = 'data-task-id'): { id: number, after: boolean } | null {
  const items = [...container.querySelectorAll<HTMLElement>(`[${CSS.escape(attribute)}]`)]

  for (const item of items) {
    const box = item.getBoundingClientRect()

    if (clientY < box.top + box.height / 2) {
      return { id: Number(item.getAttribute(attribute)), after: false }
    }
  }

  const last = items.at(-1)

  return last ? { id: Number(last.getAttribute(attribute)), after: true } : null
}

/** During dragover only the types are readable, not the data. */
export function isTaskDrag (event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(TYPE) ?? false
}

export function getDragTask (event: DragEvent): number | null {
  const id = Number(event.dataTransfer?.getData(TYPE))

  return Number.isInteger(id) && id > 0 ? id : null
}

const AREA_TYPE = 'application/x-todo-area'

/** Areas are dragged in the sidebar, separately from tasks – a task can't land among them. */
export function setDragArea (event: DragEvent, id: number): void {
  event.dataTransfer?.setData(AREA_TYPE, String(id))

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

export function isAreaDrag (event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(AREA_TYPE) ?? false
}

export function getDragArea (event: DragEvent): number | null {
  const id = Number(event.dataTransfer?.getData(AREA_TYPE))

  return Number.isInteger(id) && id > 0 ? id : null
}

const PROJECT_TYPE = 'application/x-todo-project'

/** Projects are dragged in the sidebar – within their category or into another one. */
export function setDragProject (event: DragEvent, id: number): void {
  event.dataTransfer?.setData(PROJECT_TYPE, String(id))

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

export function isProjectDrag (event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(PROJECT_TYPE) ?? false
}

export function getDragProject (event: DragEvent): number | null {
  const id = Number(event.dataTransfer?.getData(PROJECT_TYPE))

  return Number.isInteger(id) && id > 0 ? id : null
}
