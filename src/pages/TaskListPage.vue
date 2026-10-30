<template>
  <div class="page">
    <PageHeader
      :color="project?.color"
      :eyebrow="eyebrow"
      :icon="view.kind === 'area' && area ? areaIcon(area) : undefined"
      :subtitle="subtitle"
      :title="title"
    >
      <div v-if="!LIST_ONLY.has(view.kind)" aria-label="Układ" class="seg">
        <button :aria-pressed="layout === 'list'" type="button" @click="switchLayout('list')">
          <List /> Lista
        </button>

        <button :aria-pressed="layout === 'board'" type="button" @click="switchLayout('board')">
          <SquareKanban /> Tablica
        </button>
      </div>

      <button v-if="view.kind === 'area' && area" class="btn btn--outline btn--sm" type="button" @click="ui.editProject(null, area.id)">
        <Plus /> Projekt
      </button>

      <button
        v-if="project"
        aria-label="Edytuj projekt"
        class="btn btn--icon"
        title="Edytuj projekt"
        type="button"
        @click="ui.editProject(project)"
      >
        <Settings2 />
      </button>

      <button
        v-if="view.kind === 'area' && area"
        aria-label="Edytuj kategorię"
        class="btn btn--icon"
        title="Edytuj kategorię"
        type="button"
        @click="ui.editArea(area)"
      >
        <Settings2 />
      </button>
    </PageHeader>

    <!-- "Plan": today, tomorrow and both weeks as tabs of one page -->
    <nav v-if="isPlan" aria-label="Plan" class="tabs">
      <RouterLink
        v-for="tab in planTabs"
        :key="tab.name"
        :aria-current="view.kind === tab.name ? 'page' : undefined"
        class="tabs__tab"
        :class="{ 'tabs__tab--on': view.kind === tab.name }"
        replace
        :to="{ name: tab.name }"
      >
        {{ tab.title }}
        <span
          v-if="tab.count"
          class="tabs__count mono"
          :class="{ 'tabs__count--overdue': tab.overdue }"
        >{{ tab.count }}</span>
      </RouterLink>
    </nav>

    <div v-if="tasks.status === 'loading' || tasks.status === 'idle'">
      <div v-for="index in 4" :key="index" class="skeleton" />
    </div>

    <div v-else-if="tasks.status === 'error'" class="alert">
      <div>
        <strong>Nie udało się wczytać zadań.</strong><br>
        {{ tasks.loadError }}
      </div>

      <button class="btn btn--sm btn--outline" type="button" @click="retry">Spróbuj ponownie</button>
    </div>

    <template v-else-if="layout === 'board'">
      <p v-if="view.kind === 'area' && areaProjects.length === 0" class="muted notice">
        W tej kategorii nie ma jeszcze projektów – dodaj pierwszy, a jego zadania pojawią się tutaj.
      </p>

      <TaskBoard :defaults="defaults" :done="list.done" :open="list.open" :show-project="view.kind !== 'project'" />
    </template>

    <template v-else>
      <TaskQuickAdd v-if="view.kind !== 'done' && (view.kind !== 'area' || areaProjects.length > 0)" class="add" :defaults="defaults" />

      <div v-if="view.kind === 'done' ? list.done.length === 0 : list.open.length === 0" class="empty">
        <CheckCheck v-if="list.done.length > 0 || view.kind === 'done'" />
        <Coffee v-else />
        <strong>{{ view.kind === 'done' ? 'Nic jeszcze nie ukończono' : (list.done.length > 0 ? 'Wszystko zrobione' : 'Nic tu nie ma') }}</strong>
        <span>{{ emptyText }}</span>

        <button
          v-if="view.kind === 'area' && area"
          class="btn btn--outline btn--sm"
          style="margin-top: 8px"
          type="button"
          @click="ui.editProject(null, area.id)"
        >
          <Plus /> Nowy projekt
        </button>
      </div>

      <template v-for="group in groups" :key="group.key">
        <h2 v-if="group.title" class="group" :class="{ 'group--overdue': group.overdue }">
          <span v-if="group.color" class="dot" :style="{ color: group.color }" />
          <span>{{ group.title }}</span>
          <span v-if="group.hint" class="faint">{{ group.hint }}</span>
        </h2>

        <!-- "Nadchodzące" follows the dates – dragging would change nothing there -->
        <TaskSortableList
          :show-due="group.showDue ?? true"
          :show-project="group.showProject ?? view.kind !== 'project'"
          :sortable="view.kind !== 'upcoming' && view.kind !== 'done'"
          :tasks="group.tasks"
        />
      </template>

      <template v-if="list.done.length > 0 && view.kind !== 'done'">
        <button :aria-expanded="showDone" class="btn btn--sm done-toggle" type="button" @click="showDone = !showDone">
          <ChevronRight class="chev" :class="{ 'chev--open': showDone }" />
          Ukończone <span class="faint mono">{{ list.done.length }}</span>
        </button>

        <div v-if="showDone">
          <TaskRow
            v-for="task in list.done"
            :key="task.id"
            editable
            :show-project="view.kind !== 'project'"
            :task="task"
          />
        </div>
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { Layout, Task, TaskInput, TaskView } from '@/types'
  import { CheckCheck, ChevronRight, Coffee, List, Plus, Settings2, SquareKanban } from 'lucide-vue-next'
  import { computed, ref, watchEffect } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import PageHeader from '@/components/PageHeader.vue'
  import TaskBoard from '@/components/TaskBoard.vue'
  import TaskQuickAdd from '@/components/TaskQuickAdd.vue'
  import TaskRow from '@/components/TaskRow.vue'
  import TaskSortableList from '@/components/TaskSortableList.vue'
  import { setPageTitle } from '@/composables/tabBadge'
  import { config } from '@/config'
  import { PLAN_TABS } from '@/router'
  import { useAreasStore } from '@/stores/areas'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { areaIcon } from '@/utils/areaIcons'
  import { addDays, formatDue, formatLongDay, formatWeekRange, startOfWeek, today, toIsoDay } from '@/utils/date'
  import { overlaps } from '@/utils/tasks'

  const props = defineProps<{ view: TaskView, layout: Layout }>()

  /** views ordered by date – a board makes no sense there */
  const LIST_ONLY = new Set<TaskView['kind']>(['today', 'tomorrow', 'week', 'next-week', 'upcoming', 'done'])

  const route = useRoute()
  const router = useRouter()
  const tasks = useTasksStore()
  const projects = useProjectsStore()
  const areas = useAreasStore()
  const ui = useUiStore()

  const showDone = ref(false)

  const list = computed(() => tasks.listFor(props.view))
  const project = computed(() => props.view.kind === 'project' ? projects.byId(props.view.id) : undefined)
  const area = computed(() => {
    if (props.view.kind === 'area') {
      return areas.byId(props.view.id)
    }

    return project.value ? areas.byId(project.value.areaId) : undefined
  })
  const areaProjects = computed(() => {
    const view = props.view

    return view.kind === 'area' ? projects.items.filter(item => item.areaId === view.id) : []
  })

  const isPlan = computed(() => (PLAN_TABS as readonly string[]).includes(props.view.kind))

  const planTabs = computed(() => [
    { name: 'today', title: 'Dziś', count: tasks.counts.today, overdue: tasks.counts.overdue > 0 },
    { name: 'tomorrow', title: 'Jutro', count: tasks.counts.tomorrow, overdue: false },
    { name: 'week', title: 'Ten tydzień', count: tasks.counts.week, overdue: tasks.counts.overdue > 0 },
    { name: 'next-week', title: 'Przyszły tydzień', count: tasks.counts.nextWeek, overdue: false },
  ])

  // "Plan" in the sidebar opens the tab used last
  watchEffect(() => {
    if (isPlan.value) {
      try {
        localStorage.setItem('todo:plan', props.view.kind)
      } catch {
        // private mode – the plan just opens on "Dziś"
      }
    }
  })

  const title = computed(() => {
    if (isPlan.value) {
      return 'Plan'
    }

    if (props.view.kind === 'project') {
      return project.value?.name ?? 'Projekt'
    }

    if (props.view.kind === 'area') {
      return area.value?.name ?? 'Kategoria'
    }

    return route.meta.title ?? 'Todo'
  })

  const eyebrow = computed(() => {
    if (range.value) {
      return range.value.from === range.value.to ? formatLongDay(range.value.from) : formatWeekRange(range.value.to)
    }

    if (props.view.kind === 'area') {
      return 'Kategoria'
    }

    return props.view.kind === 'project' ? (area.value?.name ?? 'Projekt') : undefined
  })

  const subtitle = computed(() => {
    const open = list.value.open.length

    // the plan's tabs carry the counts – and a line that comes and goes would make them jump
    if (tasks.status !== 'ready' || isPlan.value) {
      return undefined
    }

    if (props.view.kind === 'area') {
      return `${plural(areaProjects.value.length, 'projekt', 'projekty', 'projektów')} · ${plural(open, 'otwarte zadanie', 'otwarte zadania', 'otwartych zadań')}`
    }

    if (props.view.kind === 'done') {
      const count = list.value.done.length

      const retention = config.doneRetentionDays > 0 ? `usuwane ${config.doneRetentionDays} dni po ukończeniu` : null

      return [count ? plural(count, 'ukończone zadanie', 'ukończone zadania', 'ukończonych zadań') : null, retention].filter(Boolean).join(' · ') || undefined
    }

    return open ? plural(open, 'otwarte zadanie', 'otwarte zadania', 'otwartych zadań') : undefined
  })

  watchEffect(() => {
    setPageTitle(isPlan.value ? `${route.meta.title} · Plan · Todo` : `${title.value} · Todo`)
  })

  /** the days "Dziś", "Jutro", "Ten tydzień" (from today on) and "Przyszły tydzień" are about */
  const range = computed<{ from: string, to: string } | null>(() => {
    const day = today()
    const sunday = addDays(startOfWeek(day), 6)

    switch (props.view.kind) {
      case 'today': {
        return { from: day, to: day }
      }
      case 'tomorrow': {
        return { from: addDays(day, 1), to: addDays(day, 1) }
      }
      case 'week': {
        return { from: day, to: sunday }
      }
      case 'next-week': {
        return { from: addDays(sunday, 1), to: addDays(sunday, 7) }
      }
      default: {
        return null
      }
    }
  })

  /** New tasks land where you are: in the open project, on the first day of a dated list. An area has no single project. */
  const defaults = computed<TaskInput>(() => {
    if (props.view.kind === 'project') {
      return { projectId: props.view.id }
    }

    return range.value ? { due: range.value.from } : {}
  })

  const emptyText = computed(() => ({
    'inbox': 'Zadania bez projektu trafiają tutaj.',
    'today': 'Na dziś nic nie zaplanowano – dodaj zadanie powyżej.',
    'tomorrow': 'Na jutro nic nie zaplanowano.',
    'week': 'Do końca tygodnia nic nie zaplanowano.',
    'next-week': 'Na przyszły tydzień nic nie zaplanowano.',
    'upcoming': 'Zadania z przyszłym terminem pojawią się tutaj.',
    'all': 'Dodaj pierwsze zadanie powyżej.',
    'done': 'Ukończone zadania ze wszystkich projektów pojawią się tutaj.',
    'area': areaProjects.value.length > 0 ? 'Projekty tej kategorii nie mają otwartych zadań.' : 'Ta kategoria nie ma jeszcze projektów.',
    'project': 'Dodaj pierwsze zadanie do tego projektu.',
  })[props.view.kind])

  interface Group {
    key: string
    title?: string
    hint?: string
    /** project colour next to the title */
    color?: string
    overdue?: boolean
    /** the project is in the group title already */
    showProject?: boolean
    /** the day is in the page title already – only the time is shown */
    showDue?: boolean
    tasks: Task[]
  }

  /**
   * One group per project, in the sidebar's order (category by category), tasks without a project last.
   * `withArea` adds the category name next to the project – for lists spanning categories.
   */
  function byProject (tasks: Task[], extra: Partial<Group> = {}, withArea = false): Group[] {
    const groups: Group[] = projects.grouped.flatMap(({ area: groupArea, projects: items }) => items.map(item => ({
      ...extra,
      key: String(item.id),
      title: item.name,
      hint: withArea ? groupArea?.name : undefined,
      color: item.color,
      showProject: false,
      tasks: tasks.filter(task => task.projectId === item.id),
    })))

    const known = new Set(projects.items.map(item => item.id))
    const loose = tasks.filter(task => task.projectId === null || !known.has(task.projectId))

    groups.push({ ...extra, key: 'inbox', title: 'Do posortowania', showProject: false, tasks: loose })

    return groups.filter(group => group.tasks.length > 0)
  }

  /** "Dziś" / "Jutro" are grouped by project (overdue apart, on top), "Nadchodzące" by day, an area by project. */
  const groups = computed<Group[]>(() => {
    const open = list.value.open
    const view = props.view

    if (range.value) {
      const { from, to } = range.value
      const overdue = open.filter(task => task.due! < from)
      // one day is the page's – rows then show just the time
      const inRange = byProject(open.filter(task => overlaps(task, from, to)), { showDue: from !== to }, true)

      return overdue.length > 0
        ? [{ key: 'overdue', title: 'Zaległe', overdue: true, tasks: overdue }, ...inRange]
        : inRange
    }

    if (view.kind === 'done') {
      // by the day they were finished, newest first (the list comes sorted that way)
      const byDay = new Map<string, Task[]>()

      for (const task of list.value.done) {
        const day = task.completedAt ? toIsoDay(new Date(task.completedAt)) : 'none'
        byDay.set(day, [...(byDay.get(day) ?? []), task])
      }

      return [...byDay].map(([day, items]) => ({
        key: day,
        title: day === 'none' ? 'Bez daty ukończenia' : formatLongDay(day),
        hint: day === today() ? 'dziś' : (day === addDays(today(), -1) ? 'wczoraj' : undefined),
        showDue: false,
        tasks: items,
      }))
    }

    if (view.kind === 'upcoming') {
      const byDay = new Map<string, Task[]>()

      for (const task of open) {
        byDay.set(task.due!, [...(byDay.get(task.due!) ?? []), task])
      }

      return [...byDay].map(([day, items]) => ({ key: day, title: formatLongDay(day), hint: formatDue(day) === 'Jutro' ? 'jutro' : undefined, tasks: items }))
    }

    if (view.kind === 'area') {
      return byProject(open.filter(task => projects.byId(task.projectId)?.areaId === view.id))
    }

    return [{ key: 'all', tasks: open }]
  })

  function switchLayout (layout: Layout): void {
    if (layout === props.layout) {
      return
    }

    const base = String(route.name).replace(/-board$/, '')
    void router.replace({ name: layout === 'board' ? `${base}-board` : base, params: route.params })
  }

  function plural (count: number, one: string, few: string, many: string): string {
    const rest10 = count % 10
    const rest100 = count % 100
    const word = count === 1 ? one : (rest10 >= 2 && rest10 <= 4 && (rest100 < 12 || rest100 > 14) ? few : many)

    return `${count} ${word}`
  }

  function retry (): void {
    void tasks.load()
    projects.load().catch(() => {
      // shown by the task list error if it persists
    })
  }
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 2px;
  margin: -4px 0 16px;
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}

.tabs__tab {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: -1px;
  padding: 8px 12px;
  border-bottom: 2px solid transparent;
  color: var(--text-2);
  font-size: 13.5px;
  white-space: nowrap;
}

.tabs__tab:hover {
  color: var(--text);
}

.tabs__tab--on {
  border-bottom-color: var(--text);
  color: var(--text);
  font-weight: 500;
}

.tabs__count {
  color: var(--text-3);
  font-size: 11.5px;
}

.tabs__count--overdue {
  color: var(--danger);
}

.add {
  margin-bottom: 12px;
}

.notice {
  margin-bottom: 16px;
}

.group {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 20px 0 4px;
  padding: 0 10px 6px;
  border-bottom: 1px solid var(--line-strong);
  font-size: 13px;
  font-weight: 600;
}

.group--overdue {
  color: var(--danger);
  border-bottom-color: color-mix(in srgb, var(--danger) 40%, transparent);
}

.group .dot {
  align-self: center;
}

.group::first-letter {
  text-transform: uppercase;
}

.group span:last-child {
  font-weight: 400;
  font-size: 12px;
}

.done-toggle {
  margin-top: 24px;
  color: var(--text-2);
}

.chev {
  transition: transform .15s;
}

.chev--open {
  transform: rotate(90deg);
}
</style>
