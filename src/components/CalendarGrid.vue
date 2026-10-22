<template>
  <div class="cal" :class="{ 'cal--week': week }" :style="{ '--cols': columns.length }">
    <div ref="inner" class="cal__inner">
      <!-- day names – only in the week view, the day view has the page title -->
      <div v-if="week" class="cal__heads">
        <span />

        <button
          v-for="column in columns"
          :key="column.day"
          class="cal__head"
          :class="{ 'cal__head--today': column.day === todayIso, 'cal__head--weekend': isWeekend(column.day) }"
          :title="`Otwórz dzień: ${formatLongDay(column.day)}`"
          type="button"
          @click="emit('open-day', column.day)"
        >
          <span class="cal__head-name">{{ formatShortWeekday(column.day) }}</span>
          <span class="cal__head-date">{{ Number(column.day.slice(8)) }}</span>
        </button>
      </div>

      <!-- tasks without a time: on the day, but not at an hour – like an all-day row in a calendar -->
      <div class="cal__allday">
        <div class="cal__allday-label">
          <span>Cały<br>dzień</span>
        </div>

        <section
          v-for="column in columns"
          :key="column.day"
          :aria-label="`Cały dzień, ${formatLongDay(column.day)}`"
          class="cal__allday-cell"
          :class="{ 'cal__allday-cell--over': overAllDay === column.day }"
          @click.self="ui.newTask({ due: column.day })"
          @dragleave="onAllDayLeave($event)"
          @dragover="onAllDayOver($event, column.day)"
          @drop.prevent="onAllDayDrop($event, column)"
        >
          <article
            v-for="task in column.allDay"
            :key="task.id"
            class="pill"
            :class="{ 'pill--dragging': draggingId === task.id, 'pill--done': task.done }"
            :draggable="task.id > 0"
            :style="{ '--c': projects.byId(task.projectId)?.color ?? 'var(--text-3)' }"
            :title="task.start ? `${task.title} · ${formatSpan(task.start, task.due!)}` : task.title"
            @click="ui.editTask(task)"
            @dragend="onPillDragEnd"
            @dragstart="onPillDragStart($event, task, column.day)"
          >
            <TaskCheck class="pill__check" :task="task" />
            <span class="pill__title">{{ task.title }}</span>
            <Flag v-if="task.priority !== 'none' && !week" class="pill__flag" :class="`p-${task.priority}`" />
          </article>

          <p v-if="!week && column.allDay.length === 0" class="cal__allday-empty">
            Nic na cały dzień – zadania bez godziny pojawią się tutaj. Przeciągnij tu blok z osi, żeby zdjąć mu godzinę.
          </p>
        </section>
      </div>

      <div ref="scroller" class="cal__scroll">
        <div
          ref="grid"
          class="cal__grid"
          :style="{ height: `${24 * HOUR}px` }"
          @dragleave="onDragLeave"
          @dragover="onDragOver"
          @drop.prevent="onDrop"
        >
          <div
            v-for="hour in 24"
            :key="hour"
            class="cal__hour"
            :class="{ 'cal__hour--off': hour - 1 < 7 || hour - 1 >= 21 }"
            :style="{ top: `${(hour - 1) * HOUR}px` }"
          >
            <span class="cal__label">{{ String(hour - 1).padStart(2, '0') }}:00</span>
          </div>

          <!-- in the gutter, so in the week view it doesn't cover the days before today -->
          <span v-if="showsToday" class="cal__now-label" :style="{ top: `${nowMinutes / 60 * HOUR}px` }">{{ fromMinutes(nowMinutes) }}</span>

          <div class="cal__cols">
            <div
              v-for="column in placedColumns"
              :key="column.day"
              class="cal__col"
              :class="{ 'cal__col--today': week && column.day === todayIso }"
              :data-day="column.day"
              @click="onColumnClick($event, column.day)"
            >
              <div v-if="column.day === todayIso" class="cal__now" :style="{ top: `${nowMinutes / 60 * HOUR}px` }" />

              <div v-if="ghost?.day === column.day" class="cal__ghost" :style="{ top: `${ghost.minutes / 60 * HOUR}px` }">
                <span>{{ fromMinutes(ghost.minutes) }}</span>
              </div>

              <article
                v-for="item in column.placed"
                :key="item.task.id"
                class="block"
                :class="{ 'block--done': item.task.done, 'block--short': item.end - item.start < 45, 'block--dragging': draggingId === item.task.id }"
                draggable="true"
                :style="blockStyle(item)"
                :title="`${item.task.title} · ${formatRange(item.task.time!, item.task.duration)}`"
                @click.stop="ui.editTask(item.task)"
                @dragend="onBlockDragEnd"
                @dragstart="onBlockDragStart($event, item)"
              >
                <div class="block__body">
                  <TaskCheck class="block__check" :task="item.task" />

                  <div class="block__text">
                    <div class="block__title">{{ item.task.title }}</div>
                    <div class="block__time">{{ formatRange(item.task.time!, resizing?.id === item.task.id ? resizing.duration : item.task.duration) }}</div>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  class="block__resize"
                  @click.stop
                  @pointerdown.stop.prevent="startResize($event, item)"
                />
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import type { PlacedTask } from '@/utils/day'
  import { Flag } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
  import TaskCheck from '@/components/TaskCheck.vue'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { addDays, formatLongDay, formatShortWeekday, formatSpan, parseIsoDay, spanLength, today } from '@/utils/date'
  import { formatRange, fromMinutes, layoutDay, snap } from '@/utils/day'
  import { endDragTask, getDragTask, isTaskDrag, setDragTask } from '@/utils/drag'

  /** pixels per hour */
  const HOUR = 56

  export interface CalendarColumn {
    day: string
    /** with a time – on the hour grid */
    timed: Task[]
    /** without a time – in the "Cały dzień" row on top */
    allDay: Task[]
  }

  /**
   * Hour grid for one day (the day view) or seven (the week view). Drag a task to another hour or day,
   * onto "Cały dzień" to take its time away, pull a block's lower edge to change its length,
   * click a free slot to plan a new task there.
   */
  const props = defineProps<{ columns: CalendarColumn[] }>()

  const emit = defineEmits<{ 'open-day': [day: string] }>()

  const store = useTasksStore()
  const projects = useProjectsStore()
  const ui = useUiStore()

  const inner = useTemplateRef<HTMLDivElement>('inner')
  const scroller = useTemplateRef<HTMLDivElement>('scroller')
  const grid = useTemplateRef<HTMLDivElement>('grid')

  const now = ref(new Date())
  const ghost = ref<{ day: string, minutes: number } | null>(null)
  const overAllDay = ref<string | null>(null)
  const draggingId = ref<number | null>(null)
  const resizing = ref<{ id: number, duration: number } | null>(null)
  /** where in the block it was grabbed, so it doesn't jump to the cursor */
  let grabOffset = 0
  /** the day a pill was picked up on – a task spanning days moves by the distance from it */
  let grabDay: string | null = null

  const week = computed(() => props.columns.length > 1)
  const todayIso = computed(() => today(now.value))
  const placedColumns = computed(() => props.columns.map(column => ({ day: column.day, placed: layoutDay(column.timed) })))
  const nowMinutes = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
  const showsToday = computed(() => props.columns.some(column => column.day === todayIso.value))

  function isWeekend (day: string): boolean {
    const weekday = parseIsoDay(day).getDay()

    return weekday === 0 || weekday === 6
  }

  function blockStyle (item: PlacedTask): Record<string, string> {
    const color = projects.byId(item.task.projectId)?.color ?? 'var(--text-3)'
    const duration = resizing.value?.id === item.task.id ? resizing.value.duration : item.end - item.start

    return {
      '--c': color,
      'top': `${item.start / 60 * HOUR}px`,
      'height': `${Math.max(duration / 60 * HOUR, 22) - 2}px`,
      'left': `calc(${item.column / item.columns * 100}% + 2px)`,
      'width': `calc(${100 / item.columns}% - 4px)`,
    }
  }

  /** minutes since midnight at the pointer, snapped to 15 */
  function minutesAt (clientY: number, offset = 0): number {
    const top = grid.value?.getBoundingClientRect().top ?? 0

    return Math.min(Math.max(snap((clientY - top - offset) / HOUR * 60), 0), 24 * 60 - 15)
  }

  /** the day column under the pointer */
  function dayAt (event: MouseEvent): string | null {
    const column = (event.target as HTMLElement).closest<HTMLElement>('[data-day]')

    if (column) {
      return column.dataset.day ?? null
    }

    // over the gutter or a line between columns – pick by x
    const columns = [...(grid.value?.querySelectorAll<HTMLElement>('[data-day]') ?? [])]

    return columns.find(item => {
      const box = item.getBoundingClientRect()

      return event.clientX >= box.left && event.clientX < box.right
    })?.dataset.day ?? null
  }

  function onColumnClick (event: MouseEvent, day: string): void {
    // a click on an empty slot plans a new task there, on the half hour
    const minutes = Math.floor(minutesAt(event.clientY) / 30) * 30
    ui.newTask({ due: day, time: fromMinutes(minutes) })
  }

  function onBlockDragStart (event: DragEvent, item: PlacedTask): void {
    setDragTask(event, item.task.id)
    grabOffset = event.clientY - (event.currentTarget as HTMLElement).getBoundingClientRect().top
    draggingId.value = item.task.id
  }

  function onBlockDragEnd (): void {
    draggingId.value = null
    endDragTask()
  }

  function onDragOver (event: DragEvent): void {
    const day = dayAt(event)

    if (!isTaskDrag(event) || !day) {
      return
    }

    event.preventDefault()
    ghost.value = { day, minutes: minutesAt(event.clientY, draggingId.value === null ? 0 : grabOffset) }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  function onDragLeave (event: DragEvent): void {
    if (!grid.value?.contains(event.relatedTarget as Node | null)) {
      ghost.value = null
    }
  }

  function onDrop (event: DragEvent): void {
    const id = getDragTask(event)
    const target = ghost.value
    ghost.value = null
    draggingId.value = null
    grabOffset = 0

    // onto the timeline it becomes a one-day task at that hour
    if (id !== null && target) {
      void store.update(id, { start: null, due: target.day, time: fromMinutes(target.minutes) })
    }
  }

  function onPillDragStart (event: DragEvent, task: Task, day: string): void {
    setDragTask(event, task.id)
    grabDay = day
    draggingId.value = task.id
    grabOffset = 0 // lands where the pointer is
  }

  function onPillDragEnd (): void {
    draggingId.value = null
    grabDay = null
    endDragTask()
  }

  // a block dropped on "Cały dzień" loses its time (and in the week view may change its day)
  function onAllDayOver (event: DragEvent, day: string): void {
    if (isTaskDrag(event)) {
      event.preventDefault()
      overAllDay.value = day
    }
  }

  function onAllDayLeave (event: DragEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      overAllDay.value = null
    }
  }

  function onAllDayDrop (event: DragEvent, column: CalendarColumn): void {
    overAllDay.value = null
    draggingId.value = null
    const id = getDragTask(event)
    const task = id === null ? undefined : store.items.find(item => item.id === id)
    // from a list (not a pill) a task spanning days starts on the day it's dropped on
    const from = grabDay ?? task?.start ?? null
    grabDay = null

    if (!task || (from === column.day && task.time === null)) {
      return
    }

    // a task spanning days keeps its length, shifted by as many days as the pill moved
    if (task.start && task.due && from) {
      const shift = spanLength(from, column.day) - 1

      void store.update(task.id, { start: addDays(task.start, shift), due: addDays(task.due, shift) })

      return
    }

    if (!column.allDay.some(item => item.id === task.id)) {
      void store.update(task.id, { due: column.day, time: null, duration: null })
    }
  }

  function startResize (event: PointerEvent, item: PlacedTask): void {
    const handle = event.currentTarget as HTMLElement
    const startY = event.clientY
    const startDuration = item.end - item.start
    const max = 24 * 60 - item.start

    handle.setPointerCapture(event.pointerId)
    resizing.value = { id: item.task.id, duration: startDuration }

    const move = (moveEvent: PointerEvent) => {
      const duration = snap(startDuration + (moveEvent.clientY - startY) / HOUR * 60)
      resizing.value = { id: item.task.id, duration: Math.min(Math.max(duration, 15), max) }
    }

    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)

      const duration = resizing.value?.duration
      resizing.value = null

      if (duration !== undefined && duration !== startDuration) {
        void store.update(item.task.id, { duration })
      }
    }

    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  /** Opens at the current hour when today is shown, else at the first planned task, else at 8:00. */
  function scrollToStart (): void {
    const first = Math.min(...placedColumns.value.flatMap(column => column.placed.map(item => item.start)))
    const target = showsToday.value ? nowMinutes.value : (Number.isFinite(first) ? Math.min(first, 8 * 60) : 8 * 60)

    scroller.value?.scrollTo({ top: Math.max(target - 60, 0) / 60 * HOUR })

    // a narrow screen shows the week sideways – start at today's column
    const column = grid.value?.querySelector<HTMLElement>(`[data-day="${CSS.escape(todayIso.value)}"]`)

    if (week.value && column && inner.value && inner.value.scrollWidth > inner.value.clientWidth) {
      inner.value.scrollLeft = column.offsetLeft
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    scrollToStart()
    timer = setInterval(() => (now.value = new Date()), 60_000)
  })

  onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.cal {
  --gutter: 60px;

  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

/* the week scrolls sideways on narrow screens – heads, all-day row and grid together */
.cal__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-x: auto;
}

.cal--week .cal__inner > * {
  min-width: calc(var(--gutter) + var(--cols) * 104px);
}

.cal__heads,
.cal__allday,
.cal__cols {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
}

.cal__heads,
.cal__allday {
  grid-template-columns: var(--gutter) repeat(var(--cols), minmax(0, 1fr));
}

/* all three reserve the hour grid's scrollbar width, so the day columns line up */
.cal__heads,
.cal__allday,
.cal__scroll {
  scrollbar-gutter: stable;
}

.cal__heads {
  overflow-y: hidden;
}

/* ---------- day heads (week) ---------- */

.cal__heads {
  flex: none;
  border-bottom: 1px solid var(--line);
}

.cal__head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border: 0;
  border-left: 1px solid var(--line);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.cal__head:hover {
  background: var(--hover);
  color: var(--text);
}

.cal__head-name {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.cal__head-date {
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cal__head--weekend {
  color: var(--text-3);
}

.cal__head--today {
  color: var(--text);
}

.cal__head--today .cal__head-date {
  display: inline-grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 4px;
  border-radius: 15px;
  background: var(--text);
  color: var(--bg);
}

/* ---------- all-day row ---------- */

.cal__allday {
  flex: none;
  max-height: 40%;
  overflow-y: auto;
  border-bottom: 1px solid var(--line-strong);
  background: var(--accent-soft);
}

.cal__allday-label {
  padding: 10px 0 10px 8px;
  color: var(--accent-text);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.cal__allday-cell {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  min-width: 0;
  min-height: 44px;
  padding: 8px 8px 8px 4px;
  cursor: copy;
  transition: box-shadow .12s;
}

.cal--week .cal__allday-cell {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 4px;
  padding: 6px 4px;
  border-left: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
}

.cal__allday-cell--over {
  box-shadow: inset 0 0 0 2px var(--accent);
}

.cal__allday-empty {
  align-self: center;
  color: var(--text-2);
  font-size: 12.5px;
  cursor: default;
}

.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 30px;
  padding: 4px 10px 4px 8px;
  border-left: 3px solid var(--c);
  border-radius: 6px;
  background: var(--surface);
  box-shadow: var(--shadow);
  cursor: grab;
}

.cal--week .pill {
  gap: 6px;
  min-height: 26px;
  padding: 3px 6px;
}

.pill:hover {
  box-shadow: var(--shadow-pop);
}

.pill--dragging {
  opacity: .4;
}

.pill--done .pill__title {
  color: var(--text-3);
  text-decoration: line-through;
}

.pill__check {
  width: 15px;
  height: 15px;
}

.pill__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cal--week .pill__title {
  font-size: 12.5px;
}

.pill__flag {
  flex: none;
  width: 13px;
  height: 13px;
  color: var(--p);
}

/* ---------- hour grid ---------- */

.cal__scroll {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.cal__grid {
  position: relative;
  margin-left: var(--gutter);
}

.cal__hour {
  position: absolute;
  left: 0;
  right: 0;
  height: 56px;
  border-top: 1px solid var(--line);
  pointer-events: none;
}

.cal__hour::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px dashed var(--line);
  opacity: .6;
}

.cal__hour:first-child {
  border-top-color: transparent;
}

.cal__hour--off {
  background: var(--hover);
}

.cal__label {
  position: absolute;
  top: -8px;
  left: -52px;
  color: var(--text-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.cal__hour:first-child .cal__label {
  top: 2px;
}

.cal__cols {
  position: absolute;
  inset: 0;
}

.cal__col {
  position: relative;
  cursor: copy;
}

.cal--week .cal__col {
  border-left: 1px solid var(--line);
}

.cal__col--today {
  background: color-mix(in srgb, var(--text) 3%, transparent);
}

.cal__now {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  border-top: 2px solid var(--danger);
  pointer-events: none;
}

.cal__now::before {
  content: '';
  position: absolute;
  top: -5px;
  left: -4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}

.cal__now-label {
  position: absolute;
  z-index: 3;
  left: -56px;
  translate: 0 -9px;
  padding: 0 3px;
  border-radius: 4px;
  background: var(--danger);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cal__ghost {
  position: absolute;
  z-index: 4;
  left: 0;
  right: 0;
  border-top: 2px dashed var(--accent);
  pointer-events: none;
}

.cal__ghost span {
  position: absolute;
  top: -10px;
  right: 4px;
  padding: 0 4px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* ---------- blocks ---------- */

.block {
  position: absolute;
  z-index: 2;
  overflow: hidden;
  border-left: 3px solid var(--c);
  border-radius: 6px;
  background: color-mix(in srgb, var(--c) 14%, var(--surface));
  color: var(--text);
  cursor: grab;
  transition: box-shadow .12s;
}

.block:hover {
  z-index: 3;
  box-shadow: var(--shadow);
}

.block--dragging {
  opacity: .4;
}

.block--done {
  border-left-color: var(--line-strong);
  background: var(--hover);
}

.block--done .block__title {
  color: var(--text-3);
  text-decoration: line-through;
}

.block__body {
  display: flex;
  gap: 8px;
  padding: 5px 8px;
}

.cal--week .block__body {
  gap: 5px;
  padding: 3px 5px;
}

.block__check {
  margin-top: 1px;
  width: 15px;
  height: 15px;
}

.cal--week .block__check {
  width: 13px;
  height: 13px;
}

.block__text {
  min-width: 0;
}

.block__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  text-overflow: ellipsis;
}

.cal--week .block__title {
  font-size: 12px;
}

.block__time {
  color: var(--text-2);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.block--short .block__body {
  align-items: center;
  padding-block: 1px;
}

.block--short .block__text {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.block--short .block__title {
  white-space: nowrap;
}

.cal--week .block--short .block__time {
  display: none;
}

.block__resize {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
  touch-action: none;
}

.block__resize::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 20px;
  height: 3px;
  margin-left: -10px;
  border-radius: 2px;
  background: var(--c);
  opacity: 0;
}

.block:hover .block__resize::after {
  opacity: .6;
}
</style>
