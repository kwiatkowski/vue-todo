<template>
  <div v-if="visible" class="meta">
    <!-- no "W toku" here – the status is the circle at the start of the row (three states) -->
    <span v-if="task.due && showDue && !dueAside" class="chip mono" :class="dueClass">
      <CalendarDays />
      {{ task.start ? formatSpan(task.start, task.due) : formatDue(task.due) }}<template v-if="task.time">, {{ formatRange(task.time, task.duration) }}</template>
    </span>

    <span v-else-if="task.time && !showDue && !dueAside" class="chip chip--soft mono">
      <Clock /> {{ formatRange(task.time, task.duration) }}
    </span>

    <span v-if="task.priority !== 'none'" class="chip" :class="`p-${task.priority} flag`">
      <Flag /> {{ priorityTitle(task.priority) }}
    </span>

    <span v-if="project && showProject" class="chip">
      <span class="dot" :style="{ color: project.color }" /> {{ project.name }}
    </span>

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
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { AlignLeft, CalendarDays, Clock, Flag, MessageSquare } from 'lucide-vue-next'
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

  const visible = computed(() => (props.task.due && props.showDue && !props.dueAside)
    || (props.task.time && !props.dueAside)
    || props.task.priority !== 'none'
    || (project.value && props.showProject)
    || props.task.notes
    || props.task.comments > 0)
</script>

<style scoped>
.chip--link {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.chip--link:hover {
  background: var(--hover);
  color: var(--text);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin-top: 4px;
}

.flag {
  color: var(--p);
}
</style>
