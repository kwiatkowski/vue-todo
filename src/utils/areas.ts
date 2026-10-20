interface Ordered {
  name: string
  position: number | null
}

/** The user's order of areas and projects; never placed ones come after the placed ones, by name – same as the server. */
export function compareByPosition (a: Ordered, b: Ordered): number {
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
    || a.name.localeCompare(b.name, 'pl')
}

/** A copy of `ids` with `id` moved to `index` (clamped to the list). */
export function moveItem (ids: number[], id: number, index: number): number[] {
  const rest = ids.filter(item => item !== id)

  if (rest.length === ids.length) {
    return ids
  }

  rest.splice(Math.min(Math.max(index, 0), rest.length), 0, id)

  return rest
}
