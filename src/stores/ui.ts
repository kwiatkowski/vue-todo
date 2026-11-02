import type { Area, Project, Task, TaskInput, TaskTab } from '@/types'
import type { Component } from 'vue'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { duplicateOf } from '@/utils/order'
import { useTasksStore } from './tasks'

/**
 * Shell state: the mobile sidebar and the edit dialogs. The dialogs live once in App.vue,
 * any component opens them from here.
 */
export const useUiStore = defineStore('ui', () => {
  const sidebar = ref(false)

  /** existing task to edit, or defaults for a new one – `source` when the new one is a duplicate, `tab` the right column's tab to open on */
  const task = ref<{ task: Task | null, defaults: TaskInput, source?: Task, tab?: TaskTab } | null>(null)
  const project = ref<{ project: Project | null, areaId: number | null } | null>(null)
  const area = ref<{ area: Area | null } | null>(null)
  /** what is being copied – the copy dialog is open while set */
  const copying = ref<{ kind: 'area', item: Area } | { kind: 'project', item: Project } | null>(null)
  /** the task waiting for "really delete?" – the confirmation is open while set */
  const removing = ref<Task | null>(null)
  /** the page's title – shown on the top bar, above the list's left edge (PageHeader sets it) */
  const page = ref<{ title: string, eyebrow?: string, color?: string, icon?: Component } | null>(null)
  /** "Co nowego" – the changes of the day's version */
  const changelog = ref(false)

  function editTask (value: Task, tab?: TaskTab): void {
    task.value = { task: value, defaults: {}, tab }
  }

  function newTask (defaults: TaskInput = {}): void {
    task.value = { task: null, defaults }
  }

  /** The new-task dialog filled with a copy of `value` – change its project (or anything) before saving. */
  function duplicateTask (value: Task): void {
    task.value = { task: null, defaults: duplicateOf(value, useTasksStore().items), source: value }
  }

  function editProject (value: Project | null = null, areaId: number | null = null): void {
    project.value = { project: value, areaId: value?.areaId ?? areaId }
  }

  function editArea (value: Area | null = null): void {
    area.value = { area: value }
  }

  function copyArea (value: Area): void {
    copying.value = { kind: 'area', item: value }
  }

  function copyProject (value: Project): void {
    copying.value = { kind: 'project', item: value }
  }

  function removeTask (value: Task): void {
    removing.value = value
  }

  return { sidebar, task, project, area, copying, removing, changelog, page, editTask, newTask, duplicateTask, editProject, editArea, copyArea, copyProject, removeTask }
})
