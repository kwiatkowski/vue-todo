<template>
  <div
    class="row"
    :class="{ 'row--done': task.done, 'row--doing': task.status === 'doing', 'row--pending': task.id < 0 }"
    :draggable="draggable && task.id > 0 && !renaming"
    @click="ui.editTask(task)"
    @dragend="endDragTask"
    @dragstart="onDragStart"
  >
    <TaskCheck class="row__check" :menu="editable" :task="task" />

    <div class="row__main">
      <input
        v-if="renaming"
        ref="input"
        v-model="draft"
        aria-label="Nazwa zadania"
        class="row__input"
        maxlength="200"
        @blur="saveName"
        @click.stop
        @keydown.enter.prevent="saveName"
        @keydown.esc.prevent="renaming = false"
      >

      <div v-else class="row__title">
        {{ task.title }}

        <button
          v-if="editable"
          aria-label="Zmień nazwę"
          class="row__rename"
          title="Zmień nazwę"
          type="button"
          @click.stop="startRename"
        >
          <Pencil />
        </button>

        <TaskProjectPicker v-if="editable && showProject" class="row__project" :task="task" />
      </div>

      <TaskMeta :due-aside="editable" :show-due="showDue" :show-project="showProject && !editable" :task="task" />
    </div>

    <div v-if="editable && due" class="row__due" :class="dueClass">
      <div class="row__due-day">{{ due.day }}</div>
      <div v-if="due.detail" class="row__due-detail">{{ due.detail }}</div>
    </div>

    <TaskMenu class="row__menu" :task="task" />
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { Pencil } from 'lucide-vue-next'
  import { computed, nextTick, ref, useTemplateRef } from 'vue'
  import TaskCheck from '@/components/TaskCheck.vue'
  import TaskMenu from '@/components/TaskMenu.vue'
  import TaskMeta from '@/components/TaskMeta.vue'
  import TaskProjectPicker from '@/components/TaskProjectPicker.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { formatDueParts, formatSpan, spanLength, today } from '@/utils/date'
  import { formatRange } from '@/utils/day'
  import { endDragTask, setDragTask } from '@/utils/drag'
  import { occursOn } from '@/utils/tasks'

  const props = withDefaults(defineProps<{
    task: Task
    showProject?: boolean
    showDue?: boolean
    /** can be dragged – within a sortable list or onto the day timeline */
    draggable?: boolean
    /** the circle picks a status, the title renames in place, the project name after it picks a project */
    editable?: boolean
  }>(), { showProject: true, showDue: true })

  const ui = useUiStore()
  const tasks = useTasksStore()

  /** right-hand column: the day, and below it the time (or the date, when the day is a name) */
  const due = computed(() => {
    if (!props.task.due) {
      return null
    }

    // several days: the span, and below it how far along it is – also on a page of one day
    if (props.task.start) {
      const length = spanLength(props.task.start, props.task.due)
      const day = today()

      return {
        day: formatSpan(props.task.start, props.task.due),
        detail: occursOn(props.task, day) ? `dzień ${spanLength(props.task.start, day)} z ${length}` : `${length} dni`,
      }
    }

    // the day is the page's – just the time, if any
    if (!props.showDue) {
      return props.task.time ? { day: formatRange(props.task.time, props.task.duration), detail: null } : null
    }

    const { day, date } = formatDueParts(props.task.due)

    return { day, detail: props.task.time ? formatRange(props.task.time, props.task.duration) : date }
  })

  const dueClass = computed(() => {
    if (props.task.done || !props.task.due) {
      return null
    }

    const day = today()

    return props.task.due < day ? 'row__due--overdue' : (occursOn(props.task, day) ? 'row__due--today' : null)
  })

  const renaming = ref(false)
  const draft = ref('')
  const input = useTemplateRef<HTMLInputElement>('input')

  async function startRename (): Promise<void> {
    draft.value = props.task.title
    renaming.value = true
    await nextTick()
    input.value?.focus()
  }

  /** Enter or a click elsewhere saves; an empty or unchanged name just closes the field. */
  function saveName (): void {
    if (!renaming.value) {
      return
    }

    renaming.value = false
    const title = draft.value.trim().replace(/\s+/g, ' ')

    if (title && title !== props.task.title) {
      void tasks.update(props.task.id, { title })
    }
  }

  function onDragStart (event: DragEvent): void {
    setDragTask(event, props.task.id)
  }
</script>

<style scoped>
.row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 8px 10px 10px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
}

.row:hover {
  background: var(--hover);
  border-radius: var(--radius);
  border-bottom-color: transparent;
}

.row__check {
  margin-top: 1px;
}

.row__main {
  flex: 1;
  min-width: 0;
}

.row__title {
  overflow-wrap: anywhere;
}

/* in progress: a soft accent band – what's being worked on stands out */
.row--doing {
  margin-block: 2px;
  border-bottom-color: transparent;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 9%, transparent);
}

.row--doing:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.row--doing .row__title {
  font-weight: 550;
}

.row__project {
  margin-left: 4px;
}

/* due date as a quiet right-hand column: grey, ink for today, red when overdue */
.row__due {
  flex: none;
  min-width: 84px;
  padding-top: 1px;
  text-align: right;
  line-height: 1.3;
}

.row__due-day {
  color: var(--text-2);
  font-size: 13px;
  white-space: nowrap;
}

/* the text font with even-width digits – times line up without looking like code */
.row__due-detail {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.row__due--today .row__due-day {
  color: var(--text);
  font-weight: 600;
}

.row__due--today .row__due-detail {
  color: var(--text-2);
}

.row__due--overdue .row__due-day,
.row__due--overdue .row__due-detail {
  color: var(--danger);
}

.row__due--overdue .row__due-day {
  font-weight: 600;
}

.row--done .row__due-day,
.row--done .row__due-detail {
  color: var(--text-3);
}

@media (max-width: 520px) {
  .row__due {
    min-width: 0;
  }
}

/* pencil after the title, on hover – the title itself still opens the dialog like the rest of the row */
.row__rename {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin: -3px 0 -3px 2px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-3);
  vertical-align: middle;
  cursor: pointer;
  opacity: 0;
  transition: opacity .12s, background-color .12s, color .12s;
}

.row__rename svg {
  width: 13px;
  height: 13px;
}

.row:hover .row__rename,
.row__rename:focus-visible {
  opacity: 1;
}

.row__rename:hover {
  background: var(--surface);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

@media (hover: none) {
  .row__rename {
    opacity: 1;
  }
}

.row__input {
  display: block;
  width: calc(100% + 10px);
  margin: -2px -5px;
  padding: 1px 4px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--surface);
  box-shadow: 0 0 0 3px var(--accent-soft);
  outline: none;
  line-height: inherit;
}

.row--done .row__title {
  color: var(--text-3);
  text-decoration: line-through;
  text-decoration-color: var(--text-3);
}

.row--pending {
  opacity: .6;
  pointer-events: none;
}

.row__menu {
  margin: -4px 0;
  opacity: 0;
}

.row:hover .row__menu,
.row:focus-within .row__menu {
  opacity: 1;
}

@media (hover: none) {
  .row__menu {
    opacity: 1;
  }
}

.row[draggable='true'] {
  cursor: grab;
}
</style>
