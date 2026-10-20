<template>
  <div v-if="visible" class="meta">
    <span v-if="task.status === 'doing'" class="chip chip--accent">
      <CircleDashed /> W toku
    </span>

    <span v-if="task.due && showDue && !dueAside" class="chip mono" :class="dueClass">
      <CalendarDays />
      {{ formatDue(task.due) }}<template v-if="task.time">, {{ formatRange(task.time, task.duration) }}</template>
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
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { AlignLeft, CalendarDays, CircleDashed, Clock, Flag } from 'lucide-vue-next'
  import { computed } from 'vue'
  import { useProjectsStore } from '@/stores/projects'
  import { formatDue, today } from '@/utils/date'
  import { formatRange } from '@/utils/day'
  import { isOverdue, priorityTitle } from '@/utils/tasks'

  const props = withDefaults(defineProps<{
    task: Task
    showProject?: boolean
    /** off in the day view – the day is the page */
    showDue?: boolean
    /** the row shows the due date itself, in its right-hand column */
    dueAside?: boolean
  }>(), { showProject: true, showDue: true })

  const projects = useProjectsStore()
  const project = computed(() => projects.byId(props.task.projectId))

  const dueClass = computed(() => {
    if (isOverdue(props.task)) {
      return 'chip--danger'
    }

    return props.task.due === today() && !props.task.done ? 'chip--accent' : 'chip--soft'
  })

  const visible = computed(() => props.task.status === 'doing'
    || (props.task.due && props.showDue && !props.dueAside)
    || (props.task.time && !props.dueAside)
    || props.task.priority !== 'none'
    || (project.value && props.showProject)
    || props.task.notes)
</script>

<style scoped>
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
