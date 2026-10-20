import type { Area, AreaInput } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { areasApi } from '@/api/todo'
import { compareByPosition, moveItem } from '@/utils/areas'
import { useNotifyStore } from './notify'
import { useProjectsStore } from './projects'
import { useTasksStore } from './tasks'

/** Categories of projects ("Praca", "Dom", …). The server creates those two on first use. */
export const useAreasStore = defineStore('areas', () => {
  const notify = useNotifyStore()

  const items = ref<Area[]>([])

  const sorted = computed(() => items.value.toSorted(compareByPosition))

  function byId (id: number | null | undefined): Area | undefined {
    return id ? items.value.find(area => area.id === id) : undefined
  }

  async function load (): Promise<void> {
    items.value = await areasApi.list()
  }

  async function add (input: AreaInput & { name: string }): Promise<Area | null> {
    try {
      const area = await areasApi.create(input)
      items.value.push(area)

      return area
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function update (id: number, changes: AreaInput): Promise<boolean> {
    try {
      const area = await areasApi.update(id, changes)
      items.value = items.value.map(item => item.id === id ? area : item)

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  async function remove (id: number): Promise<boolean> {
    try {
      await areasApi.remove(id)
      items.value = items.value.filter(item => item.id !== id)
      useProjectsStore().detachArea(id)
      notify.show('Kategoria usunięta – jej projekty zostały, bez kategorii.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  /** Copies an area on the server, then reloads what it created; resolves to the new area, null on error. */
  async function copy (id: number, withTasks: boolean): Promise<Area | null> {
    try {
      const area = await areasApi.copy(id, withTasks)

      await Promise.all([
        load(),
        useProjectsStore().load(),
        withTasks ? useTasksStore().load() : Promise.resolve(),
      ])
      notify.show(`Skopiowano jako „${area.name}”.`)

      return area
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  /** Moves an area to `index` of the sorted list – at once, back again if the server says no. */
  async function move (id: number, index: number): Promise<void> {
    const ids = moveItem(sorted.value.map(area => area.id), id, index)

    if (ids.join(',') === sorted.value.map(area => area.id).join(',')) {
      return
    }

    const before = items.value
    items.value = items.value.map(area => ({ ...area, position: ids.indexOf(area.id) }))

    try {
      items.value = await areasApi.reorder(ids)
    } catch (error) {
      items.value = before
      notify.error(error)
    }
  }

  return { items, sorted, byId, load, add, update, remove, move, copy }
})
