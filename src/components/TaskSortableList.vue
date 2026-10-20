<template>
  <div class="sortable">
    <!-- with a date or a priority: they sort themselves -->
    <TaskRow
      v-for="task in parts.auto"
      :key="task.id"
      editable
      :show-due="showDue"
      :show-project="showProject"
      :task="task"
    />

    <p v-if="parts.auto.length > 0 && parts.manual.length > 0" class="sortable__label">
      Bez terminu i priorytetu · przeciągnij, żeby ułożyć
    </p>

    <!-- the rest: the user's order -->
    <div
      ref="list"
      class="sortable__manual"
      @dragleave="onLeave"
      @dragover="onOver"
      @drop="onDrop"
    >
      <div
        v-for="task in parts.manual"
        :key="task.id"
        class="sortable__item"
        :class="{
          'sortable__item--before': drop?.id === task.id && !drop.after,
          'sortable__item--after': drop?.id === task.id && drop.after,
          'sortable__item--dragging': moving === task.id,
        }"
        :data-task-id="task.id"
      >
        <TaskRow
          draggable
          editable
          :show-due="showDue"
          :show-project="showProject"
          :task="task"
          @dragend="moving = null"
          @dragstart="moving = task.id"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { computed, ref, useTemplateRef } from 'vue'
  import TaskRow from '@/components/TaskRow.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { draggedTask, dropTarget, isTaskDrag } from '@/utils/drag'
  import { dropIndex, positionAt, splitByOrder } from '@/utils/order'

  /**
   * Task rows: those with a date or a priority sort themselves (date, time, priority), the rest below them
   * is ordered by dragging the row itself. A drop saves one new position, between the new neighbours.
   * Without `sortable` the tasks stay exactly in the given order (e.g. "Nadchodzące").
   */
  const props = withDefaults(defineProps<{
    tasks: Task[]
    showProject?: boolean
    /** off when the page is one day – the row then shows only the time */
    showDue?: boolean
    sortable?: boolean
  }>(), { showProject: true, showDue: true, sortable: true })

  const store = useTasksStore()

  const list = useTemplateRef<HTMLDivElement>('list')
  const drop = ref<{ id: number, after: boolean } | null>(null)
  const moving = ref<number | null>(null)

  const parts = computed(() => props.sortable ? splitByOrder(props.tasks) : { auto: props.tasks, manual: [] })

  function own (): number | null {
    const id = draggedTask()

    return id !== null && parts.value.manual.some(task => task.id === id) ? id : null
  }

  function onOver (event: DragEvent): void {
    if (!isTaskDrag(event) || own() === null || !list.value) {
      return
    }

    event.preventDefault()
    drop.value = dropTarget(list.value, event.clientY)

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onLeave (event: DragEvent): void {
    if (!list.value?.contains(event.relatedTarget as Node | null)) {
      drop.value = null
    }
  }

  function onDrop (event: DragEvent): void {
    const id = own()
    const target = drop.value
    drop.value = null
    moving.value = null

    if (id === null || !target) {
      return
    }

    event.preventDefault()
    const manual = parts.value.manual
    const index = dropIndex(manual, id, target.id, target.after)

    // dropped where it already was
    if (manual.findIndex(task => task.id === id) === index) {
      return
    }

    void store.update(id, { position: positionAt(manual, id, index) })
  }
</script>

<style scoped>
.sortable__item {
  position: relative;
}

.sortable__label {
  margin: 14px 0 0;
  padding: 0 10px 6px;
  color: var(--text-3);
  font-size: 12px;
}

.sortable__item--dragging {
  opacity: .4;
}

/* where the row will land */
.sortable__item--before::before,
.sortable__item--after::after {
  content: '';
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  pointer-events: none;
}

.sortable__item--before::before {
  top: -1px;
}

.sortable__item--after::after {
  bottom: -1px;
}

.sortable :deep(.row[draggable='true']) {
  cursor: grab;
}

.sortable :deep(.row[draggable='true']:active) {
  cursor: grabbing;
}
</style>
