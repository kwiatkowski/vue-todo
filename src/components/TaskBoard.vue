<template>
  <div class="board">
    <section
      v-for="column in columns"
      :key="column.value"
      :aria-label="column.title"
      class="col"
      :class="[`col--${column.value}`, { 'col--over': over?.status === column.value && over.from !== column.value }]"
      @dragenter.prevent="onDragOver($event, column.value)"
      @dragleave="onDragLeave($event)"
      @dragover="onDragOver($event, column.value)"
      @drop.prevent="onDrop($event, column.value)"
    >
      <header class="col__head">
        <component :is="STATUS_ICONS[column.value]" class="col__icon" />
        <h2 class="col__title">{{ column.title }}</h2>
        <span class="col__count mono">{{ column.total }}</span>
      </header>

      <div class="col__cards">
        <div
          v-for="task in column.tasks"
          :key="task.id"
          class="col__item"
          :class="{
            'col__item--before': over?.target?.id === task.id && !over.target.after,
            'col__item--after': over?.target?.id === task.id && over.target.after,
          }"
          :data-task-id="task.id"
        >
          <TaskCard :show-project="showProject" :task="task" />
        </div>

        <button v-if="column.hidden > 0" class="btn btn--sm col__more" type="button" @click="showAllDone = true">
          Pokaż starsze ({{ column.hidden }})
        </button>

        <div v-if="column.tasks.length === 0" class="col__empty">
          {{ column.value === 'doing' ? 'Przeciągnij tu to, nad czym pracujesz' : column.value === 'done' ? 'Jeszcze nic' : 'Pusto' }}
        </div>
      </div>

      <TaskQuickAdd
        v-if="column.value !== 'done'"
        compact
        :defaults="{ ...defaults, status: column.value }"
        placeholder="Dodaj kartę"
      />
    </section>
  </div>
</template>

<script lang="ts" setup>
  import type { Status, Task, TaskInput } from '@/types'
  import { computed, ref } from 'vue'
  import TaskCard from '@/components/TaskCard.vue'
  import TaskQuickAdd from '@/components/TaskQuickAdd.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { draggedTask, dropTarget, getDragTask, isTaskDrag } from '@/utils/drag'
  import { STATUS_ICONS } from '@/utils/icons'
  import { dropIndex, positionAt } from '@/utils/order'
  import { statusChange, STATUSES } from '@/utils/tasks'

  /** Done shows the latest few – an old board would otherwise be all "Zrobione". */
  const DONE_LIMIT = 10

  const props = withDefaults(defineProps<{
    open: Task[]
    done: Task[]
    defaults?: TaskInput
    showProject?: boolean
  }>(), { defaults: () => ({}), showProject: true })

  const tasks = useTasksStore()

  /** column under the pointer, the column the card comes from, and the card it would land next to */
  const over = ref<{ status: Status, from: Status | null, target: { id: number, after: boolean } | null } | null>(null)
  const showAllDone = ref(false)

  const columns = computed(() => STATUSES.map(({ value, title }) => {
    const all = value === 'done' ? props.done : props.open.filter(task => task.status === value)
    const visible = value === 'done' && !showAllDone.value ? all.slice(0, DONE_LIMIT) : all

    return { value, title, tasks: visible, total: all.length, hidden: all.length - visible.length }
  }))

  function onDragOver (event: DragEvent, status: Status): void {
    if (!isTaskDrag(event)) {
      return
    }

    event.preventDefault()

    const id = draggedTask()
    const from = props.open.find(task => task.id === id)?.status ?? (props.done.some(task => task.id === id) ? 'done' : null)
    const cards = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.col__cards')
    // "Zrobione" is ordered by completion – no place to pick there
    const target = status === 'done' || !cards ? null : dropTarget(cards, event.clientY)

    over.value = { status, from, target }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onDragLeave (event: DragEvent): void {
    // leaving into a child card is not leaving the column
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      over.value = null
    }
  }

  function onDrop (event: DragEvent, status: Status): void {
    const target = over.value?.target ?? null
    over.value = null
    const id = getDragTask(event)
    const task = tasks.items.find(item => item.id === id)

    if (id === null || !task) {
      return
    }

    if (status === 'done') {
      void tasks.setStatus(id, status)

      return
    }

    const column = props.open.filter(item => item.status === status)
    const index = target ? dropIndex(column, id, target.id, target.after) : column.filter(item => item.id !== id).length

    if (task.status === status && column.findIndex(item => item.id === id) === index) {
      return
    }

    const position = positionAt(column, id, index)

    void tasks.update(id, task.status === status ? { position } : { ...statusChange(status), position })
  }
</script>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  align-items: start;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.col {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 160px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: var(--panel);
  transition: border-color .12s, background-color .12s;
}

.col--over {
  border-color: var(--accent);
  border-style: dashed;
  background: var(--accent-soft);
}

.col__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
}

.col__icon {
  width: 15px;
  height: 15px;
  color: var(--text-3);
}

.col--doing .col__icon {
  color: var(--accent);
}

.col--done .col__icon {
  color: var(--text-2);
}

.col__title {
  font-size: 13px;
  font-weight: 600;
}

.col__count {
  color: var(--text-3);
  font-size: 12px;
}

.col__cards {
  display: grid;
  gap: 8px;
}

.col__item {
  position: relative;
}

/* where the card will land */
.col__item--before::before,
.col__item--after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  pointer-events: none;
}

.col__item--before::before {
  top: -5px;
}

.col__item--after::after {
  bottom: -5px;
}

.col__empty {
  display: grid;
  place-items: center;
  min-height: 64px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius);
  color: var(--text-3);
  font-size: 12.5px;
  text-align: center;
  padding: 8px;
}

.col__more {
  justify-self: center;
  color: var(--text-2);
}

@media (max-width: 900px) {
  .board {
    grid-template-columns: repeat(3, minmax(78vw, 1fr));
    scroll-snap-type: x mandatory;
    margin-inline: calc(-1 * var(--edge));
    padding-inline: var(--edge);
  }

  .col {
    scroll-snap-align: center;
  }
}
</style>
