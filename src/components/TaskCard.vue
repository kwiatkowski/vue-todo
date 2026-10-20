<template>
  <article
    class="card"
    :class="[`p-${task.priority}`, { 'card--done': task.done, 'card--pending': task.id < 0, 'card--dragging': dragging }]"
    :draggable="task.id > 0"
    @click="ui.editTask(task)"
    @dragend="onDragEnd"
    @dragstart="onDragStart"
  >
    <div class="card__top">
      <TaskCheck class="card__check" :task="task" />
      <div class="card__title">{{ task.title }}</div>
      <TaskMenu class="card__menu" :task="task" />
    </div>

    <p v-if="task.notes" class="card__notes">{{ task.notes }}</p>

    <TaskMeta class="card__meta" :show-project="showProject" :task="{ ...task, notes: '', status: 'todo' }" />
  </article>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { ref } from 'vue'
  import TaskCheck from '@/components/TaskCheck.vue'
  import TaskMenu from '@/components/TaskMenu.vue'
  import TaskMeta from '@/components/TaskMeta.vue'
  import { useUiStore } from '@/stores/ui'
  import { endDragTask, setDragTask } from '@/utils/drag'

  const props = withDefaults(defineProps<{ task: Task, showProject?: boolean }>(), { showProject: true })

  const ui = useUiStore()
  const dragging = ref(false)

  function onDragStart (event: DragEvent): void {
    setDragTask(event, props.task.id)
    dragging.value = true
  }

  function onDragEnd (): void {
    dragging.value = false
    endDragTask()
  }
</script>

<style scoped>
.card {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 10px 10px 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  cursor: grab;
  transition: border-color .12s, transform .12s, opacity .12s;
}

/* priority as a thin edge on the left */
.card:not(.p-none)::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: -1px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--p);
}

.card:hover {
  border-color: var(--line-strong);
}

.card:active {
  cursor: grabbing;
}

.card--dragging {
  opacity: .4;
}

.card--pending {
  opacity: .6;
  pointer-events: none;
}

.card__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.card__check {
  margin-top: 1px;
}

.card__title {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.card--done .card__title {
  color: var(--text-3);
  text-decoration: line-through;
}

.card__menu {
  margin: -5px -4px -5px 0;
  opacity: 0;
}

.card:hover .card__menu,
.card:focus-within .card__menu {
  opacity: 1;
}

@media (hover: none) {
  .card__menu {
    opacity: 1;
  }
}

.card__notes {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-left: 28px;
  color: var(--text-2);
  font-size: 13px;
  white-space: pre-line;
}

.card__meta {
  margin-top: 0;
  padding-left: 28px;
}
</style>
