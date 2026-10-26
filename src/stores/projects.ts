import type { Area, Project, ProjectInput } from '@/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { projectsApi } from '@/api/todo'
import { compareByPosition } from '@/utils/areas'
import { useAreasStore } from './areas'
import { useNotifyStore } from './notify'
import { useTasksStore } from './tasks'

export const PROJECT_COLORS = [
  '#7a9a3a', '#2e8b74', '#3a6ea5', '#5b5fc7', '#8b5cb8',
  '#c0508a', '#d0563b', '#d99a2b', '#8a7356', '#6b7280',
]

export interface ProjectGroup {
  /** null = projects without a category */
  area: Area | null
  projects: Project[]
}

export const useProjectsStore = defineStore('projects', () => {
  const notify = useNotifyStore()
  const areas = useAreasStore()

  const items = ref<Project[]>([])

  const sorted = computed(() => items.value.toSorted(compareByPosition))

  /** Projects under their categories (every category, even an empty one), uncategorized last. */
  const grouped = computed<ProjectGroup[]>(() => {
    const known = new Set(areas.items.map(area => area.id))
    const groups: ProjectGroup[] = areas.sorted.map(area => ({
      area,
      projects: sorted.value.filter(project => project.areaId === area.id),
    }))
    const loose = sorted.value.filter(project => project.areaId === null || !known.has(project.areaId))

    if (loose.length > 0) {
      groups.push({ area: null, projects: loose })
    }

    return groups
  })

  function byId (id: number | null | undefined): Project | undefined {
    return id ? items.value.find(project => project.id === id) : undefined
  }

  function idsInArea (areaId: number): Set<number> {
    return new Set(items.value.filter(project => project.areaId === areaId).map(project => project.id))
  }

  async function load (): Promise<void> {
    items.value = await projectsApi.list()
  }

  /** Waits for the server (the new project needs its id for navigation); resolves to null on error. */
  async function add (input: ProjectInput & { name: string }): Promise<Project | null> {
    try {
      const project = await projectsApi.create(input)
      // the server also fixed the order of the new project's area – take the whole list
      items.value = await projectsApi.list().catch(() => [...items.value, project])

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  async function update (id: number, changes: ProjectInput): Promise<boolean> {
    try {
      const project = await projectsApi.update(id, changes)
      items.value = items.value.map(item => item.id === id ? project : item)

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  async function remove (id: number): Promise<boolean> {
    try {
      await projectsApi.remove(id)
      items.value = items.value.filter(item => item.id !== id)
      useTasksStore().hideProject(id)
      notify.show('Projekt ukryty w Todo – przywrócisz go z zadaniami w Projektach.')

      return true
    } catch (error) {
      notify.error(error)

      return false
    }
  }

  /**
   * Puts a project at `index` of an area's list (null = no category), moving it there from another area if needed.
   * Shown at once, rolled back if the server says no.
   */
  async function move (id: number, areaId: number | null, index: number): Promise<void> {
    const project = byId(id)

    if (!project) {
      return
    }

    const known = new Set(areas.items.map(area => area.id))
    const inArea = (item: Project) => areaId === null ? item.areaId === null || !known.has(item.areaId) : item.areaId === areaId
    const siblings = sorted.value.filter(item => inArea(item) && item.id !== id).map(item => item.id)
    siblings.splice(Math.min(Math.max(index, 0), siblings.length), 0, id)

    const moved = !inArea(project)

    if (!moved && siblings.join(',') === sorted.value.filter(item => inArea(item)).map(item => item.id).join(',')) {
      return
    }

    const before = items.value
    items.value = items.value.map(item => ({
      ...item,
      areaId: item.id === id ? areaId : item.areaId,
      position: siblings.includes(item.id) ? siblings.indexOf(item.id) : item.position,
    }))

    try {
      if (moved) {
        await projectsApi.update(id, { areaId })
      }

      items.value = await projectsApi.reorder(siblings)
    } catch (error) {
      items.value = before
      notify.error(error)
    }
  }

  /** Copies a project on the server, then reloads what it created; resolves to the new project, null on error. */
  async function copy (id: number, withTasks: boolean, name: string): Promise<Project | null> {
    try {
      const project = await projectsApi.copy(id, withTasks, name)

      await Promise.all([load(), withTasks ? useTasksStore().load() : Promise.resolve()])
      notify.show(`Skopiowano jako „${project.name}”.`)

      return project
    } catch (error) {
      notify.error(error)

      return null
    }
  }

  /** After a category is deleted its projects stay, without a category – same as on the server. */
  function detachArea (areaId: number): void {
    for (const project of items.value) {
      if (project.areaId === areaId) {
        project.areaId = null
      }
    }
  }

  return { items, sorted, grouped, byId, idsInArea, load, add, update, remove, move, copy, detachArea }
})
