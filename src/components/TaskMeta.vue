<template>
  <!-- in a list's row (columns): fixed places for the status, the priority and the rest – an empty one keeps its room,
       so the chips line up from row to row; elsewhere the slots don't exist for the layout (display: contents) -->
  <div v-if="visible || columns" class="meta" :class="{ 'meta--columns': columns }">
    <span class="meta__slot meta__slot--status">
      <span v-if="task.status === 'doing'" class="chip chip--accent">
        <CircleDashed /> W toku
      </span>
    </span>

    <span v-if="task.due && showDue && !dueAside" class="chip mono" :class="dueClass">
      <CalendarDays />
      {{ task.start ? formatSpan(task.start, task.due) : formatDue(task.due) }}<template v-if="task.time">, {{ formatRange(task.time, task.duration) }}</template>
    </span>

    <span v-else-if="task.time && !showDue && !dueAside" class="chip chip--soft mono">
      <Clock /> {{ formatRange(task.time, task.duration) }}
    </span>

    <span class="meta__slot meta__slot--priority">
      <span v-if="task.priority !== 'none'" class="chip" :class="`p-${task.priority} flag`">
        <Flag /> {{ priorityTitle(task.priority) }}
      </span>
    </span>

    <span v-if="project && showProject" class="chip">
      <span class="dot" :style="{ color: project.color }" /> {{ project.name }}
    </span>

    <span class="meta__slot meta__slot--extra">
      <span v-if="task.notes" aria-label="Ma notatki" class="chip" title="Ma notatki">
        <AlignLeft />
      </span>

      <!-- straight to the comments of the task -->
      <button
        v-if="task.comments > 0"
        :aria-label="`Komentarze: ${task.comments} – pokaż`"
        class="chip chip--link mono"
        :title="`Komentarze: ${task.comments}`"
        type="button"
        @click.stop="ui.editTask(task, 'comments')"
      >
        <MessageSquare /> {{ task.comments }}
      </button>
    </span>
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { AlignLeft, CalendarDays, CircleDashed, Clock, Flag, MessageSquare } from 'lucide-vue-next'
  import { computed } from 'vue'
  import { useProjectsStore } from '@/stores/projects'
  import { useUiStore } from '@/stores/ui'
  import { formatDue, formatSpan, today } from '@/utils/date'
  import { formatRange } from '@/utils/day'
  import { isOverdue, occursOn, priorityTitle } from '@/utils/tasks'

  const props = withDefaults(defineProps<{
    task: Task
    showProject?: boolean
    /** off in the day view – the day is the page */
    showDue?: boolean
    /** the row shows the due date itself, in its right-hand column */
    dueAside?: boolean
    /** a list's row: the chips in fixed places, a column of their own */
    columns?: boolean
  }>(), { showProject: true, showDue: true })

  const projects = useProjectsStore()
  const ui = useUiStore()
  const project = computed(() => projects.byId(props.task.projectId))

  const dueClass = computed(() => {
    if (isOverdue(props.task)) {
      return 'chip--danger'
    }

    return occursOn(props.task, today()) && !props.task.done ? 'chip--accent' : 'chip--soft'
  })

  const visible = computed(() => props.task.status === 'doing'
    || (props.task.due && props.showDue && !props.dueAside)
    || (props.task.time && !props.dueAside)
    || props.task.priority !== 'none'
    || (project.value && props.showProject)
    || props.task.notes
    || props.task.comments > 0)
</script>

<style scoped>
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin-top: 4px;
}

.meta__slot {
  display: contents;
}

/* status | priority | notes and comments – the widths of their longest chips */
.meta--columns {
  display: grid;
  grid-template-columns: 70px 76px 64px;
  align-items: center;
  gap: 0 6px;
  margin-top: 0;
}

.meta--columns .meta__slot {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.chip--link {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.chip--link:hover {
  background: var(--hover);
  color: var(--text);
}

.flag {
  color: var(--p);
}
</style>
