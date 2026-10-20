<template>
  <nav aria-label="Nawigacja" class="side">
    <div class="side__brand">
      <span class="side__logo"><Check :stroke-width="3" /></span>
      <span class="side__name">Todo</span>

      <button aria-label="Zamknij menu" class="btn btn--icon btn--sm side__close" type="button" @click="ui.sidebar = false">
        <X />
      </button>
    </div>

    <div class="side__scroll">
      <div class="side__group">
        <RouterLink
          v-for="item in views"
          :key="item.name"
          class="side__link"
          :class="{ 'is-active': isActive(item.names) }"
          :to="{ name: item.name }"
        >
          <component :is="item.icon" class="side__icon" />
          <span class="side__label">{{ item.title }}</span>

          <span
            v-if="item.count || item.always"
            class="side__count mono"
            :class="{ 'side__count--hot': item.hot, 'side__count--overdue': item.hot && tasks.counts.overdue > 0 }"
            :title="item.hot && tasks.counts.overdue > 0 ? `W tym zaległe: ${tasks.counts.overdue}` : undefined"
          >{{ item.count }}</span>
        </RouterLink>
      </div>

      <section
        v-for="group in projects.grouped"
        :key="group.area?.id ?? 'none'"
        class="side__group"
        :class="{
          'side__group--dragging': group.area && dragging === group.area.id,
          [`side__group--drop-${drop?.side}`]: group.area && drop?.id === group.area.id,
          'side__group--project-over': projectDrop?.areaId === (group.area?.id ?? null),
        }"
        @dragleave="onGroupLeave($event, group.area)"
        @dragover="onGroupOver($event, group.area)"
        @drop.prevent="onGroupDrop($event, group.area)"
      >
        <!-- the whole heading folds the category (the actions on the right do their own thing) -->
        <div
          :aria-expanded="group.area ? !isCollapsed(group.area) : undefined"
          :aria-label="group.area ? `${group.area.name} – ${isCollapsed(group.area) ? 'rozwiń' : 'zwiń'}` : undefined"
          class="side__heading"
          :class="{ 'side__heading--toggle': group.area }"
          :draggable="group.area ? 'true' : undefined"
          :role="group.area ? 'button' : undefined"
          :tabindex="group.area ? 0 : undefined"
          :title="group.area ? (isCollapsed(group.area) ? 'Rozwiń' : 'Zwiń') : undefined"
          @click="group.area && toggleArea(group.area)"
          @dragend="dragging = null; drop = null"
          @dragstart="group.area && onAreaDragStart($event, group.area)"
          @keydown.enter.self.prevent="group.area && toggleArea(group.area)"
          @keydown.space.self.prevent="group.area && toggleArea(group.area)"
        >
          <span
            v-if="group.area"
            aria-hidden="true"
            class="side__toggle"
            :class="{ 'side__toggle--collapsed': isCollapsed(group.area) }"
          >
            <ChevronDown />
          </span>

          <span
            v-if="group.area"
            class="side__area"
            :class="{ 'is-active': isActive(['area', 'area-board'], group.area.id) }"
          >
            <component :is="areaIcon(group.area)" class="side__area-icon" />
            <GripVertical aria-hidden="true" class="side__area-icon side__grip" />
            {{ group.area.name }}
          </span>

          <span v-else class="side__area side__area--plain">Bez kategorii</span>

          <!-- collapsed: what its projects add up to -->
          <span
            v-if="group.area && isCollapsed(group.area) && summary(group.projects).total > 0"
            class="side__count side__count--area mono"
            :title="summaryHint(group.projects)"
          >
            <span
              v-if="summary(group.projects).today > 0"
              aria-hidden="true"
              class="side__today"
              :class="{ 'side__today--overdue': summary(group.projects).overdue > 0 }"
            />
            {{ summary(group.projects).total }}
          </span>

          <DropMenu v-if="group.area" class="side__add" :label="`Kategoria ${group.area.name}`" trigger-class="btn btn--icon btn--sm side__menu">
            <button class="menu__item" role="menuitem" type="button" @click="router.push({ name: 'area', params: { id: group.area.id } })">
              <FolderOpen /> Otwórz kategorię
            </button>

            <button class="menu__item" role="menuitem" type="button" @click="ui.editArea(group.area)">
              <Pencil /> Edytuj kategorię
            </button>

            <button class="menu__item" role="menuitem" type="button" @click="ui.copyArea(group.area)">
              <Copy /> Kopiuj kategorię
            </button>

            <button
              class="menu__item"
              :disabled="areaIndex(group.area.id) === 0"
              role="menuitem"
              type="button"
              @click="areas.move(group.area.id, areaIndex(group.area.id) - 1)"
            >
              <ArrowUp /> Przesuń w górę
            </button>

            <button
              class="menu__item"
              :disabled="areaIndex(group.area.id) === areas.sorted.length - 1"
              role="menuitem"
              type="button"
              @click="areas.move(group.area.id, areaIndex(group.area.id) + 1)"
            >
              <ArrowDown /> Przesuń w dół
            </button>
          </DropMenu>

          <button
            :aria-label="group.area ? `Nowy projekt w: ${group.area.name}` : 'Nowy projekt'"
            class="btn btn--icon btn--sm side__add"
            type="button"
            @click.stop="ui.editProject(null, group.area?.id ?? null)"
          >
            <Plus />
          </button>
        </div>

        <template v-if="!group.area || !isCollapsed(group.area)">
          <div
            v-for="project in group.projects"
            :key="project.id"
            class="side__item"
            :class="{ 'side__item--active': isActive(['project', 'project-board'], project.id) }"
            :data-project-id="project.id"
          >
            <RouterLink
              class="side__link side__link--project"
              :class="{
                'is-active': isActive(['project', 'project-board'], project.id),
                'side__link--dragging': draggingProject === project.id,
                'side__link--drop-before': projectDrop?.target?.id === project.id && !projectDrop.target.after,
                'side__link--drop-after': projectDrop?.target?.id === project.id && projectDrop.target.after,
              }"
              draggable="true"
              :to="{ name: 'project', params: { id: project.id } }"
              @dragend="draggingProject = null; projectDrop = null"
              @dragstart="onProjectDragStart($event, project.id)"
            >
              <span class="side__swatch" :style="{ background: project.color }" />
              <span class="side__label">{{ project.name }}</span>

              <span
                v-if="tasks.counts.byProject.get(project.id)"
                class="side__count mono"
                :title="todayHint(project.id)"
              >
                <span
                  v-if="tasks.counts.todayByProject.get(project.id)"
                  aria-hidden="true"
                  class="side__today"
                  :class="{ 'side__today--overdue': tasks.counts.todayByProject.get(project.id)!.overdue > 0 }"
                />
                {{ tasks.counts.byProject.get(project.id) }}
              </span>
            </RouterLink>

            <!-- on hover, in place of the count -->
            <div class="side__actions">
              <button
                :aria-label="`Nowe zadanie w: ${project.name}`"
                class="side__action"
                title="Nowe zadanie"
                type="button"
                @click="ui.newTask({ projectId: project.id })"
              >
                <Plus />
              </button>

              <button
                :aria-label="`Kopiuj projekt: ${project.name}`"
                class="side__action"
                title="Kopiuj projekt"
                type="button"
                @click="ui.copyProject(project)"
              >
                <Copy />
              </button>

              <button
                :aria-label="`Edytuj projekt: ${project.name}`"
                class="side__action"
                title="Edytuj projekt"
                type="button"
                @click="ui.editProject(project)"
              >
                <Pencil />
              </button>
            </div>
          </div>

          <button
            v-if="group.projects.length === 0"
            class="side__link side__link--ghost"
            type="button"
            @click="ui.editProject(null, group.area?.id ?? null)"
          >
            <span class="side__swatch side__swatch--empty" />
            <span class="side__label">Dodaj projekt</span>
          </button>
        </template>
      </section>

      <button class="side__link side__link--ghost side__new-area" type="button" @click="ui.editArea()">
        <Plus class="side__icon" />
        <span class="side__label">Dodaj kategorię</span>
      </button>
    </div>

    <footer class="side__foot">
      <img v-if="config.user?.avatar" alt="" class="side__avatar" :src="config.user.avatar">

      <div class="side__user">
        <div class="side__user-name">{{ config.user?.name ?? 'Todo' }}</div>
        <div v-if="config.version" class="side__version mono">v{{ config.version }}</div>
      </div>

      <button
        :aria-label="dark ? 'Jasny motyw' : 'Ciemny motyw'"
        class="btn btn--icon btn--sm"
        :title="dark ? 'Jasny motyw' : 'Ciemny motyw'"
        type="button"
        @click="toggleTheme"
      >
        <Sun v-if="dark" />
        <Moon v-else />
      </button>

      <a
        v-if="config.adminUrl"
        aria-label="Panel WordPressa"
        class="btn btn--icon btn--sm"
        :href="config.adminUrl"
        title="Panel WordPressa"
      >
        <LayoutDashboard />
      </a>

      <a
        v-if="config.logoutUrl"
        aria-label="Wyloguj"
        class="btn btn--icon btn--sm"
        :href="config.logoutUrl"
        title="Wyloguj"
      >
        <LogOut />
      </a>
    </footer>
  </nav>
</template>

<script lang="ts" setup>
  import type { Area, Project } from '@/types'
  import { ArrowDown, ArrowUp, CalendarArrowUp, CalendarCheck, CalendarDays, Check, ChevronDown, CircleCheck, Copy, FolderOpen, GripVertical, Inbox, Layers, LayoutDashboard, LogOut, Moon, Pencil, Plus, Sun, Sunrise, X } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { useAreasStore } from '@/stores/areas'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { areaIcon } from '@/utils/areaIcons'
  import { dropTarget, getDragArea, getDragProject, isAreaDrag, isProjectDrag, setDragArea, setDragProject } from '@/utils/drag'

  const route = useRoute()
  const router = useRouter()
  const projects = useProjectsStore()
  const tasks = useTasksStore()
  const ui = useUiStore()
  const areas = useAreasStore()

  /** area being dragged, and where it would land */
  const dragging = ref<number | null>(null)
  const drop = ref<{ id: number, side: 'before' | 'after' } | null>(null)

  /** project being dragged, the area (null = no category) it would land in and next to which project */
  const draggingProject = ref<number | null>(null)
  const projectDrop = ref<{ areaId: number | null, target: { id: number, after: boolean } | null } | null>(null)
  const { dark, toggleTheme } = useTheme()

  const views = computed(() => [
    { name: 'today', names: ['today'], title: 'Dziś', icon: Sun, count: tasks.counts.today, hot: true },
    { name: 'tomorrow', names: ['tomorrow'], title: 'Jutro', icon: Sunrise, count: tasks.counts.tomorrow },
    { name: 'week', names: ['week'], title: 'Ten tydzień', icon: CalendarCheck, count: tasks.counts.week, hot: true },
    { name: 'next-week', names: ['next-week'], title: 'Przyszły tydzień', icon: CalendarArrowUp, count: tasks.counts.nextWeek },
    { name: 'calendar', names: ['calendar-day', 'calendar-week'], title: 'Kalendarz', icon: CalendarDays, count: 0 },
    { name: 'inbox', names: ['inbox', 'inbox-board'], title: 'Do posortowania', icon: Inbox, count: tasks.counts.inbox, always: true },
    { name: 'all', names: ['all', 'all-board'], title: 'Wszystkie', icon: Layers, count: tasks.counts.all },
    { name: 'done', names: ['done'], title: 'Zakończone', icon: CircleCheck, count: tasks.counts.done },
  ])

  function isActive (names: string[], id?: number): boolean {
    return names.includes(String(route.name)) && (id === undefined || Number(route.params.id) === id)
  }

  // one drop zone per category section – it takes categories (reorder) and projects (reorder / move)
  function onGroupOver (event: DragEvent, area: Area | null): void {
    if (isProjectDrag(event)) {
      onProjectOver(event, area)
    } else {
      onAreaOver(event, area)
    }
  }

  function onGroupLeave (event: DragEvent, area: Area | null): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      projectDrop.value = null
    }

    onAreaLeave(event, area)
  }

  function onGroupDrop (event: DragEvent, area: Area | null): void {
    if (isProjectDrag(event)) {
      onProjectDrop(event, area)
    } else {
      onAreaDrop(event, area)
    }
  }

  function onProjectDragStart (event: DragEvent, id: number): void {
    setDragProject(event, id)
    draggingProject.value = id
  }

  function onProjectOver (event: DragEvent, area: Area | null): void {
    event.preventDefault()
    const section = event.currentTarget as HTMLElement
    // over the heading or the empty slot – to the end of the category
    const onProject = (event.target as HTMLElement).closest('[data-project-id]')
    projectDrop.value = { areaId: area?.id ?? null, target: onProject ? dropTarget(section, event.clientY, 'data-project-id') : null }
  }

  function onProjectDrop (event: DragEvent, area: Area | null): void {
    const id = getDragProject(event)
    const target = projectDrop.value?.target ?? null
    projectDrop.value = null
    draggingProject.value = null

    if (id === null) {
      return
    }

    const areaId = area?.id ?? null
    const group = projects.grouped.find(item => (item.area?.id ?? null) === areaId)?.projects.filter(item => item.id !== id) ?? []
    const index = target ? group.findIndex(item => item.id === target.id) + (target.after ? 1 : 0) : group.length

    void projects.move(id, areaId, index)
  }

  /** "Na dziś: 2 (w tym zaległe: 1)" – the dot's explanation */
  /* ---------- collapsing categories – remembered in this browser ---------- */

  const COLLAPSED_KEY = 'todo:collapsed-areas'

  const collapsed = ref<Set<number>>(readCollapsed())

  function readCollapsed (): Set<number> {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]')

      return new Set(Array.isArray(saved) ? saved.filter(item => Number.isInteger(item)) : [])
    } catch {
      return new Set()
    }
  }

  function isCollapsed (area: Area): boolean {
    return collapsed.value.has(area.id)
  }

  function toggleArea (area: Area): void {
    const next = new Set(collapsed.value)

    if (next.has(area.id)) {
      next.delete(area.id)
    } else {
      next.add(area.id)
    }

    collapsed.value = next

    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]))
    } catch {
      // private mode – it just won't be remembered
    }
  }

  /** A collapsed category's projects added up: open tasks, and of those due today (incl. overdue) and overdue. */
  function summary (items: Project[]): { total: number, today: number, overdue: number } {
    let total = 0
    let dueToday = 0
    let overdue = 0

    for (const project of items) {
      total += tasks.counts.byProject.get(project.id) ?? 0
      dueToday += tasks.counts.todayByProject.get(project.id)?.today ?? 0
      overdue += tasks.counts.todayByProject.get(project.id)?.overdue ?? 0
    }

    return { total, today: dueToday, overdue }
  }

  function summaryHint (items: Project[]): string {
    const { total, today: dueToday, overdue } = summary(items)
    const parts = [`Otwarte: ${total}`]

    if (dueToday > 0) {
      parts.push(`na dziś: ${dueToday}${overdue > 0 ? ` (w tym zaległe: ${overdue})` : ''}`)
    }

    return parts.join(' · ')
  }

  function todayHint (projectId: number): string | undefined {
    const entry = tasks.counts.todayByProject.get(projectId)

    if (!entry) {
      return undefined
    }

    return `Na dziś: ${entry.today}${entry.overdue > 0 ? ` (w tym zaległe: ${entry.overdue})` : ''}`
  }

  function areaIndex (id: number): number {
    return areas.sorted.findIndex(area => area.id === id)
  }

  function onAreaDragStart (event: DragEvent, area: Area): void {
    setDragArea(event, area.id)
    dragging.value = area.id
  }

  /** The upper half of a category drops before it, the lower half after it. */
  function onAreaOver (event: DragEvent, area: Area | null): void {
    if (!area || !isAreaDrag(event)) {
      return
    }

    event.preventDefault()
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    drop.value = { id: area.id, side: event.clientY < box.top + box.height / 2 ? 'before' : 'after' }
  }

  function onAreaLeave (event: DragEvent, area: Area | null): void {
    if (area && drop.value?.id === area.id && !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      drop.value = null
    }
  }

  function onAreaDrop (event: DragEvent, area: Area | null): void {
    const id = getDragArea(event)
    const side = drop.value?.side
    drop.value = null
    dragging.value = null

    if (!area || id === null || id === area.id || !side) {
      return
    }

    // index among the others – the dragged one is taken out first
    const rest = areas.sorted.filter(item => item.id !== id)
    const target = rest.findIndex(item => item.id === area.id)
    void areas.move(id, target + (side === 'after' ? 1 : 0))
  }

</script>

<style scoped>
/* height comes from the shell: sticky 100dvh on desktop, fixed full height on mobile */
.side {
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border-right: 1px solid var(--line);
}

.side__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px 18px;
}

.side__logo {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-ink);
}

.side__logo svg {
  width: 14px;
  height: 14px;
}

.side__name {
  flex: 1;
  font-weight: 650;
  letter-spacing: -.01em;
}

.side__close {
  display: none;
}

.side__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 16px;
}

.side__group {
  display: grid;
  gap: 1px;
  margin-bottom: 18px;
}

.side__heading {
  display: flex;
  align-items: center;
  height: 28px;
  padding-left: 8px;
}

.side__area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.side__area.is-active {
  color: var(--text);
}

.side__toggle {
  flex: none;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  margin-left: -6px;
  margin-right: 2px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}

.side__toggle svg {
  width: 13px;
  height: 13px;
  transition: transform .15s;
}

.side__toggle--collapsed svg {
  transform: rotate(-90deg);
}

.side__heading.side__heading--toggle {
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.side__heading--toggle:hover {
  background: var(--hover);
}

.side__heading--toggle:hover .side__toggle,
.side__heading--toggle:hover .side__area {
  color: var(--text);
}

/* collapsed category: the sum of its projects, where a project's count would be */
.side__count--area {
  margin-right: 6px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
}

.side__area-icon {
  flex: none;
  width: 13px;
  height: 13px;
}

/* the category icon turns into a grip on hover – the heading is the drag handle */
.side__grip {
  display: none;
}

@media (hover: hover) {
  .side__heading[draggable='true']:hover .side__area-icon:not(.side__grip) {
    display: none;
  }

  .side__heading[draggable='true']:hover .side__grip {
    display: block;
  }
}

.side__group {
  position: relative;
}

.side__group--dragging {
  opacity: .4;
}

.side__group--project-over {
  border-radius: var(--radius);
  background: var(--hover);
}

.side__link--dragging {
  opacity: .4;
}

.side__item {
  position: relative;
  min-width: 0; /* a grid item – without it a long name widens the sidebar instead of ending in "…" */
}

.side__actions {
  position: absolute;
  top: 50%;
  right: 4px;
  display: flex;
  gap: 1px;
  translate: 0 -50%;
  opacity: 0;
  pointer-events: none;
  transition: opacity .1s;
}

/* hover, or keyboard focus – not the focus a click leaves behind, or the count would stay hidden after it */
.side__item:hover .side__actions,
.side__item:has(:focus-visible) .side__actions {
  opacity: 1;
  pointer-events: auto;
}

.side__item:hover .side__count,
.side__item:has(:focus-visible) .side__count {
  visibility: hidden;
}

/* something due today in the project: a green dot before its count – red when some of it is overdue */
.side__today {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--accent);
  vertical-align: 1px;
}

.side__today--overdue {
  background: var(--danger);
}

/* the name makes room for the three actions and ends in "…" instead of running under them */
.side__item:hover .side__link,
.side__item:has(:focus-visible) .side__link {
  padding-right: 84px;
}

/* no hover on touch – the actions of the open project stay visible */
@media (hover: none) {
  .side__item--active .side__actions {
    opacity: 1;
    pointer-events: auto;
  }

  .side__item--active .side__count {
    visibility: hidden;
  }

  .side__item--active .side__link {
    padding-right: 84px;
  }
}

.side__action {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  cursor: pointer;
}

.side__action svg {
  width: 14px;
  height: 14px;
}

.side__action:hover {
  background: var(--press);
  color: var(--text);
}

/* where the project will land */
.side__link--drop-before {
  box-shadow: inset 0 2px 0 var(--accent);
}

.side__link--drop-after {
  box-shadow: inset 0 -2px 0 var(--accent);
}

.side__group--drop-before::before,
.side__group--drop-after::after {
  content: '';
  position: absolute;
  left: 6px;
  right: 6px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
}

.side__group--drop-before::before {
  top: -10px;
}

.side__group--drop-after::after {
  bottom: -10px;
}

.side__heading :deep(.side__menu) {
  width: 24px;
  height: 24px;
}

.side__add {
  opacity: 0;
  width: 24px;
  height: 24px;
}

.side__heading:hover .side__add,
.side__heading:focus-visible .side__add,
.side__heading:has(:focus-visible) .side__add {
  opacity: 1;
}

/* with a mouse the "…" and "+" float over the right edge on hover, so a collapsed category's sum
   lines up with the projects' counts; on touch they stay in the row, always visible */
@media (hover: hover) {
  .side__heading {
    position: relative;
  }

  .side__heading > .side__add {
    position: absolute;
    top: 2px;
    right: 6px;
  }

  .side__heading > .side__add.menu {
    right: 32px;
  }

  .side__count--area {
    margin-right: 8px;
  }

  .side__heading:hover .side__count--area,
  .side__heading:focus-visible .side__count--area,
  .side__heading:has(:focus-visible) .side__count--area {
    visibility: hidden;
  }
}

@media (hover: none) {
  .side__add {
    opacity: 1;
  }
}

.side__link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-2);
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.side__link:hover {
  background: var(--hover);
  color: var(--text);
}

.side__link.is-active {
  background: var(--surface);
  color: var(--text);
  font-weight: 500;
  box-shadow: var(--shadow);
}

.side__icon {
  flex: none;
  width: 16px;
  height: 16px;
}

.side__link.is-active .side__icon {
  color: var(--accent);
}

.side__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side__count {
  color: var(--text-3);
  font-size: 12px;
}

/* today and this week: ink when something is due, red when some of it is overdue */
.side__count--hot {
  color: var(--text);
  font-weight: 600;
}

.side__count--overdue {
  color: var(--danger);
}

.side__swatch {
  flex: none;
  width: 10px;
  height: 10px;
  margin-inline: 3px;
  border-radius: 3px;
}

.side__swatch--empty {
  border: 1.5px dashed var(--text-3);
}

.side__link--ghost {
  color: var(--text-3);
}

.side__new-area {
  margin-top: -6px;
}

.side__foot {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 10px 10px 14px;
  border-top: 1px solid var(--line);
}

.side__avatar {
  width: 26px;
  height: 26px;
  margin-right: 6px;
  border-radius: 50%;
}

.side__user {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.side__user-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side__version {
  color: var(--text-3);
  font-size: 11px;
}

@media (max-width: 900px) {
  .side__close {
    display: inline-flex;
  }
}
</style>
