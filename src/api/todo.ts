import type { Area, AreaInput, Project, ProjectInput, Task, TaskInput } from '@/types'
import { request } from './client'

export const areasApi = {
  list: () => request<Area[]>('GET', 'areas'),
  create: (input: AreaInput & { name: string }) => request<Area>('POST', 'areas', input),
  update: (id: number, input: AreaInput) => request<Area>('PATCH', `areas/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `areas/${id}`),
  /** "Name (kopia)" below the original, with copies of its projects – and their open tasks with `tasks` */
  copy: (id: number, tasks: boolean) => request<Area>('POST', `areas/${id}/copy`, { tasks }),
  /** every area once, in the new order */
  reorder: (ids: number[]) => request<Area[]>('POST', 'areas/order', { ids }),
}

export const projectsApi = {
  list: () => request<Project[]>('GET', 'projects'),
  create: (input: ProjectInput & { name: string }) => request<Project>('POST', 'projects', input),
  update: (id: number, input: ProjectInput) => request<Project>('PATCH', `projects/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `projects/${id}`),
  /** a copy below the original in the same area, named `name` – with its open tasks when `tasks` */
  copy: (id: number, tasks: boolean, name: string) => request<Project>('POST', `projects/${id}/copy`, { tasks, name }),
  /** these projects (one area) in this order; answers with all projects */
  reorder: (ids: number[]) => request<Project[]>('POST', 'projects/order', { ids }),
}

export const tasksApi = {
  list: () => request<Task[]>('GET', 'tasks'),
  create: (input: TaskInput & { title: string }) => request<Task>('POST', 'tasks', input),
  update: (id: number, input: TaskInput) => request<Task>('PATCH', `tasks/${id}`, input),
  remove: (id: number) => request<{ deleted: boolean }>('DELETE', `tasks/${id}`),
}
