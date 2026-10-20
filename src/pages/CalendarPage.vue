<template>
  <div class="page calendar">
    <PageHeader :eyebrow="eyebrow" :subtitle="summary" :title="title">
      <div aria-label="Widok" class="seg">
        <button :aria-pressed="mode === 'day'" title="Dzień (D)" type="button" @click="switchMode('day')">
          <CalendarDays /> Dzień
        </button>

        <button :aria-pressed="mode === 'week'" title="Tydzień (W)" type="button" @click="switchMode('week')">
          <CalendarRange /> Tydzień
        </button>
      </div>

      <div class="nav">
        <button
          :aria-label="mode === 'day' ? 'Poprzedni dzień' : 'Poprzedni tydzień'"
          class="btn btn--icon"
          :title="`${mode === 'day' ? 'Poprzedni dzień' : 'Poprzedni tydzień'} (←)`"
          type="button"
          @click="go(-1)"
        >
          <ChevronLeft />
        </button>

        <button
          class="btn btn--outline btn--sm"
          :disabled="showsToday"
          title="Dziś (T)"
          type="button"
          @click="goTo(today())"
        >Dziś</button>

        <button
          :aria-label="mode === 'day' ? 'Następny dzień' : 'Następny tydzień'"
          class="btn btn--icon"
          :title="`${mode === 'day' ? 'Następny dzień' : 'Następny tydzień'} (→)`"
          type="button"
          @click="go(1)"
        >
          <ChevronRight />
        </button>

        <label class="picker btn btn--icon" title="Wybierz dzień">
          <CalendarSearch />

          <input
            aria-label="Wybierz dzień"
            class="picker__input"
            type="date"
            :value="day"
            @change="onPick"
          >
        </label>
      </div>
    </PageHeader>

    <div v-if="tasks.status === 'loading' || tasks.status === 'idle'" class="skeleton" style="height: 420px" />

    <div v-else-if="tasks.status === 'error'" class="alert">
      <div>
        <strong>Nie udało się wczytać zadań.</strong><br>
        {{ tasks.loadError }}
      </div>

      <button class="btn btn--sm btn--outline" type="button" @click="tasks.load()">Spróbuj ponownie</button>
    </div>

    <div v-else-if="mode === 'day'" class="calendar__day">
      <aside class="calendar__side">
        <TaskQuickAdd :defaults="{ due: day }" :placeholder="day === today() ? 'Dodaj na dziś – np. „Spotkanie 14:30”' : 'Dodaj na ten dzień'" />

        <section v-if="dayPlan.overdue.length > 0" class="bucket bucket--overdue">
          <h2 class="bucket__head">
            <AlertCircle /> Zaległe <span class="faint">{{ dayPlan.overdue.length }}</span>
            <button class="btn btn--sm bucket__action" type="button" @click="moveOverdue">Przenieś na dziś</button>
          </h2>

          <TaskRow v-for="task in dayPlan.overdue" :key="task.id" draggable :task="task" />
        </section>

        <section v-if="dayPlan.done.length > 0" class="bucket">
          <button :aria-expanded="showDone" class="btn btn--sm done-toggle" type="button" @click="showDone = !showDone">
            <ChevronRight class="chev" :class="{ 'chev--open': showDone }" />
            Ukończone <span class="faint">{{ dayPlan.done.length }}</span>
          </button>

          <template v-if="showDone">
            <TaskRow v-for="task in dayPlan.done" :key="task.id" :show-due="false" :task="task" />
          </template>
        </section>
      </aside>

      <CalendarGrid :key="day" class="calendar__grid" :columns="columns" />
    </div>

    <CalendarGrid
      v-else
      :key="days[0]"
      class="calendar__grid calendar__grid--week"
      :columns="columns"
      @open-day="openDay"
    />
  </div>
</template>

<script lang="ts" setup>
  import type { CalendarColumn } from '@/components/CalendarGrid.vue'
  import { AlertCircle, CalendarDays, CalendarRange, CalendarSearch, ChevronLeft, ChevronRight } from 'lucide-vue-next'
  import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
  import { useRouter } from 'vue-router'
  import CalendarGrid from '@/components/CalendarGrid.vue'
  import PageHeader from '@/components/PageHeader.vue'
  import TaskQuickAdd from '@/components/TaskQuickAdd.vue'
  import TaskRow from '@/components/TaskRow.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { addDays, formatDue, formatLongDay, formatWeekRange, isIsoDay, startOfWeek, today, weekDays } from '@/utils/date'
  import { DEFAULT_DURATION, formatDuration } from '@/utils/day'

  export type CalendarMode = 'day' | 'week'

  /** /calendar/day/[YYYY-MM-DD] and /calendar/week/[YYYY-MM-DD] – without a date it's today / this week. */
  const props = defineProps<{ mode: CalendarMode, date?: string }>()

  const MODE_KEY = 'todo:calendar'

  const router = useRouter()
  const tasks = useTasksStore()
  const ui = useUiStore()

  const showDone = ref(false)

  const day = computed(() => props.date && isIsoDay(props.date) ? props.date : today())
  const days = computed(() => props.mode === 'day' ? [day.value] : weekDays(day.value))
  const dayPlan = computed(() => tasks.dayPlan(day.value))

  const columns = computed<CalendarColumn[]>(() => days.value.map(item => {
    const plan = item === day.value ? dayPlan.value : tasks.dayPlan(item)

    // the week shows done untimed tasks in place too – the day view keeps them in its side list
    return { day: item, timed: plan.timed, allDay: props.mode === 'week' ? [...plan.untimed, ...plan.done] : plan.untimed }
  }))

  const showsToday = computed(() => days.value.includes(today()) && (props.mode === 'week' || day.value === today()))

  const title = computed(() => props.mode === 'day' ? formatLongDay(day.value) : formatWeekRange(day.value))

  const eyebrow = computed(() => {
    if (props.mode === 'week') {
      return showsToday.value ? 'Ten tydzień' : 'Tydzień'
    }

    const relative = formatDue(day.value)

    return ['Dziś', 'Jutro', 'Wczoraj'].includes(relative) ? relative : 'Dzień'
  })

  const summary = computed(() => {
    if (tasks.status !== 'ready') {
      return undefined
    }

    const shown = columns.value.flatMap(column => [...column.timed, ...column.allDay])
    const open = shown.filter(task => !task.done)
    const planned = open.filter(task => task.time).reduce((sum, task) => sum + (task.duration ?? DEFAULT_DURATION), 0)

    if (open.length === 0) {
      return shown.length > 0 ? 'Wszystko zrobione.' : 'Wolne – nic nie zaplanowano.'
    }

    return [`Otwarte: ${open.length}`, planned > 0 ? `zaplanowane: ${formatDuration(planned)}` : null].filter(Boolean).join(' · ')
  })

  watchEffect(() => {
    document.title = `${props.mode === 'day' && day.value === today() ? 'Dziś' : title.value} · Kalendarz · Todo`
  })

  /** The week's own address is its Monday – every day of it lands on the same URL. */
  function goTo (target: string, mode: CalendarMode = props.mode): void {
    const current = mode === 'day' ? target === today() : startOfWeek(target) === startOfWeek(today())
    const date = mode === 'day' ? target : startOfWeek(target)

    void router.push({ name: `calendar-${mode}`, params: current ? {} : { date } })
  }

  function go (delta: number): void {
    goTo(addDays(day.value, delta * (props.mode === 'day' ? 1 : 7)))
  }

  function switchMode (mode: CalendarMode): void {
    if (mode === props.mode) {
      return
    }

    // into the week of the shown day; out of the week onto today if it's this week, else its Monday
    const target = mode === 'week' ? day.value : (showsToday.value ? today() : day.value)
    goTo(target, mode)
  }

  function openDay (target: string): void {
    goTo(target, 'day')
  }

  function onPick (event: Event): void {
    const value = (event.target as HTMLInputElement).value

    if (isIsoDay(value)) {
      goTo(value)
    }
  }

  function moveOverdue (): void {
    for (const task of dayPlan.value.overdue) {
      void tasks.update(task.id, { due: day.value })
    }
  }

  /** ← → back and forth, T today, D / W day or week – unless typing or a dialog is open */
  function onKey (event: KeyboardEvent): void {
    const target = event.target as HTMLElement

    if (ui.task || ui.project || ui.area || ui.copying || event.metaKey || event.ctrlKey || event.altKey || target.closest('input, textarea, select, [contenteditable]')) {
      return
    }

    const actions: Record<string, () => void> = {
      arrowleft: () => go(-1),
      arrowright: () => go(1),
      t: () => goTo(today()),
      d: () => switchMode('day'),
      w: () => switchMode('week'),
    }

    actions[event.key.toLowerCase()]?.()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey)

    try {
      localStorage.setItem(MODE_KEY, props.mode)
    } catch {
      // the calendar just opens in the day view next time
    }
  })

  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* the grid fills the screen – no page scroll under it */
.calendar {
  padding-bottom: 24px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.picker {
  position: relative;
  overflow: hidden;
}

/* the native picker opens from an invisible input over the icon */
.picker__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.picker__input::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  cursor: pointer;
}

.calendar__day {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}

.calendar__side {
  display: grid;
  gap: 20px;
}

.calendar__grid {
  position: sticky;
  top: var(--edge);
  height: calc(100dvh - 160px);
  min-height: 420px;
}

.bucket__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 8px;
  border-bottom: 1px solid var(--line-strong);
  font-size: 13px;
  font-weight: 600;
}

.bucket__head svg {
  width: 15px;
  height: 15px;
  color: var(--text-3);
}

.bucket__head .faint {
  font-weight: 400;
}

.bucket--overdue .bucket__head svg {
  color: var(--danger);
}

.bucket__action {
  margin-left: auto;
  color: var(--text-2);
  font-weight: 500;
}

.done-toggle {
  color: var(--text-2);
}

.chev {
  transition: transform .15s;
}

.chev--open {
  transform: rotate(90deg);
}

@media (max-width: 1000px) {
  .calendar__day {
    grid-template-columns: minmax(0, 1fr);
  }

  .calendar__grid {
    position: static;
    height: 70dvh;
  }
}
</style>
