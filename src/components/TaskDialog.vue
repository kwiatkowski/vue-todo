<template>
  <BaseDialog v-model="open" :title="editing ? 'Zadanie' : (source ? 'Duplikuj zadanie' : 'Nowe zadanie')" :width="560" @submit="save">
    <template v-if="form">
      <div class="lead">
        <input
          v-model="form.title"
          :aria-invalid="titleError ? 'true' : undefined"
          aria-label="Tytuł"
          autofocus
          class="input input--title"
          maxlength="200"
          placeholder="Co jest do zrobienia?"
          @input="titleError = false"
        >

        <span v-if="titleError" class="error-text">Zadanie musi mieć tytuł.</span>

        <NotesEditor v-model="form.notes" class="notes" :max-length="5000" placeholder="Notatki" />
      </div>

      <div class="props">
        <span class="props__label">Status</span>

        <div aria-label="Status" class="seg" role="radiogroup">
          <button
            v-for="item in STATUSES"
            :key="item.value"
            :aria-checked="form.status === item.value"
            role="radio"
            type="button"
            @click="form.status = item.value"
          >
            <component :is="STATUS_ICONS[item.value]" /> {{ item.title }}
          </button>
        </div>

        <label class="props__label" for="task-project">Projekt</label>

        <select id="task-project" v-model="form.projectId" class="input">
          <option :value="null">Do posortowania (bez projektu)</option>

          <optgroup v-for="group in projects.grouped" :key="group.area?.id ?? 'none'" :label="group.area?.name ?? 'Bez kategorii'">
            <option v-for="project in group.projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </optgroup>
        </select>

        <label class="props__label" for="task-from">Od</label>

        <div class="props__inline">
          <input id="task-from" v-model="fromModel" class="input mono" type="date">
          <button class="btn btn--outline btn--sm" :class="{ 'is-on': form.from === day }" type="button" @click="form.from = day">Dziś</button>
          <button class="btn btn--outline btn--sm" :class="{ 'is-on': form.from === tomorrow }" type="button" @click="form.from = tomorrow">Jutro</button>

          <button
            v-if="form.from"
            aria-label="Bez terminu"
            class="btn btn--icon btn--sm"
            title="Bez terminu"
            type="button"
            @click="form.from = null"
          >
            <X />
          </button>
        </div>

        <label class="props__label" for="task-to">Do</label>

        <div class="props__inline">
          <input
            id="task-to"
            v-model="toModel"
            class="input mono"
            :disabled="!form.from"
            :min="form.from ? addDays(form.from, 1) : undefined"
            :title="form.from ? 'Ostatni dzień – zadanie będzie widoczne każdego dnia od pierwszego' : 'Najpierw wybierz dzień'"
            type="date"
          >

          <input
            v-model.number="daysModel"
            aria-label="Liczba dni"
            class="input mono props__days"
            :disabled="!form.from"
            min="1"
            title="Liczba dni"
            type="number"
          >

          <span class="props__hint">{{ daysModel === 1 ? 'dzień' : 'dni' }}</span>

          <button
            v-if="form.to"
            aria-label="Jeden dzień"
            class="btn btn--icon btn--sm"
            title="Jeden dzień"
            type="button"
            @click="form.to = null"
          >
            <X />
          </button>
        </div>

        <label class="props__label" for="task-time">Godzina</label>

        <div class="props__inline">
          <input
            id="task-time"
            v-model="timeModel"
            class="input mono"
            :disabled="!form.from || !!form.to"
            step="300"
            :title="form.to ? 'Zadanie na kilka dni trwa całe dni' : (form.from ? undefined : 'Najpierw wybierz dzień')"
            type="time"
          >

          <select v-model="form.duration" aria-label="Czas trwania" class="input" :disabled="!form.time">
            <option :value="null">{{ formatDuration(DEFAULT_DURATION) }} (domyślnie)</option>
            <option v-for="item in durations" :key="item.value" :value="item.value">{{ item.title }}</option>
          </select>

          <button
            v-if="form.time"
            aria-label="Bez godziny"
            class="btn btn--icon btn--sm"
            title="Bez godziny"
            type="button"
            @click="form.time = null"
          >
            <X />
          </button>
        </div>

        <span class="props__label">Priorytet</span>

        <div aria-label="Priorytet" class="seg" role="radiogroup">
          <button
            v-for="item in PRIORITIES"
            :key="item.value"
            :aria-checked="form.priority === item.value"
            :class="`p-${item.value}`"
            role="radio"
            type="button"
            @click="form.priority = item.value"
          >
            <Flag class="flag" /> {{ item.title }}
          </button>
        </div>
      </div>
    </template>

    <template #actions>
      <button v-if="editing" class="btn btn--danger btn--sm" type="button" @click="removeTask">
        <Trash2 /> Usuń
      </button>

      <button
        v-if="editing"
        class="btn btn--sm"
        title="Duplikuj – z możliwością zmiany projektu"
        type="button"
        @click="duplicate"
      >
        <Copy /> Duplikuj
      </button>

      <span v-if="editing" class="stamp faint">{{ stamp }}</span>
      <span v-if="source" class="stamp faint">Kopia „{{ source.title }}” – możesz zmienić projekt</span>
      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>
      <button class="btn btn--primary btn--sm" :disabled="saving" type="submit">{{ editing ? 'Zapisz' : (source ? 'Duplikuj' : 'Dodaj') }}</button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import type { Priority, Status } from '@/types'
  import { Copy, Flag, Trash2, X } from 'lucide-vue-next'
  import { computed, defineAsyncComponent, ref, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { addDays, spanLength, today } from '@/utils/date'
  import { DEFAULT_DURATION, DURATIONS, formatDuration } from '@/utils/day'
  import { STATUS_ICONS } from '@/utils/icons'
  import { PRIORITIES, STATUSES } from '@/utils/tasks'

  // the editor is the heaviest part of the app – kept out of the start, fetched once the app is idle
  const loadNotesEditor = () => import('@/components/NotesEditor.vue')
  const NotesEditor = defineAsyncComponent(loadNotesEditor)
  setTimeout(() => void loadNotesEditor().catch(() => {}), 3000)

  interface Form {
    title: string
    notes: string
    status: Status
    projectId: number | null
    priority: Priority
    /** the day – the first one when the task spans several */
    from: string | null
    /** the last day of a task spanning several, after `from`; null = just the one day */
    to: string | null
    time: string | null
    duration: number | null
  }

  const ui = useUiStore()
  const tasks = useTasksStore()
  const projects = useProjectsStore()

  const form = ref<Form | null>(null)
  const saving = ref(false)
  const titleError = ref(false)

  const day = today()
  const tomorrow = addDays(day, 1)
  const durations = DURATIONS.filter(item => item.value !== DEFAULT_DURATION)

  const editing = computed(() => ui.task?.task ?? null)
  const source = computed(() => ui.task?.source ?? null)
  const notify = useNotifyStore()

  const open = computed({
    get: () => ui.task !== null,
    set: value => {
      if (!value) {
        ui.task = null
      }
    },
  })

  // native inputs give '' for empty
  const fromModel = computed({
    get: () => form.value?.from ?? '',
    set: value => form.value && (form.value.from = value || null),
  })

  const toModel = computed({
    get: () => form.value?.to ?? '',
    set: value => form.value && (form.value.to = value || null),
  })

  /** "Do" as a number of days – typing 3 sets the last day two days after the first */
  const daysModel = computed({
    get: () => form.value?.from && form.value.to ? spanLength(form.value.from, form.value.to) : 1,
    set: value => {
      if (form.value?.from && Number.isInteger(value) && value >= 1) {
        form.value.to = value > 1 ? addDays(form.value.from, value - 1) : null
      }
    },
  })

  const timeModel = computed({
    get: () => form.value?.time ?? '',
    set: value => form.value && (form.value.time = value || null),
  })

  const stamp = computed(() => {
    const task = editing.value

    if (!task) {
      return ''
    }

    const format = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

    return task.completedAt ? `Ukończone ${format(task.completedAt)}` : `Dodane ${format(task.createdAt)}`
  })

  // a fresh copy each time the dialog opens – edits only reach the store on save
  watch(() => ui.task, value => {
    if (!value) {
      return
    }

    const initial = value.task ?? value.defaults
    form.value = {
      title: initial.title ?? '',
      notes: initial.notes ?? '',
      status: initial.status ?? 'todo',
      projectId: initial.projectId ?? null,
      priority: initial.priority ?? 'none',
      from: initial.start ?? initial.due ?? null,
      to: initial.start ? (initial.due ?? null) : null,
      time: initial.time ?? null,
      duration: initial.duration ?? null,
    }
    titleError.value = false
  })

  // no time without a day, no duration without a time; the last day only after the first
  watch(() => form.value?.from, from => {
    if (form.value && !from) {
      form.value.time = null
    }

    if (form.value?.to && (!from || form.value.to <= from)) {
      form.value.to = null
    }
  })

  // several days are whole days
  watch(() => form.value?.to, to => {
    if (form.value && to) {
      form.value.time = null
    }
  })

  watch(() => form.value?.time, time => {
    if (form.value && !time) {
      form.value.duration = null
    }
  })

  async function save (): Promise<void> {
    if (!form.value) {
      return
    }

    const { from, to, ...fields } = form.value
    const data = { ...fields, title: fields.title.trim(), notes: fields.notes.trim(), start: to ? from : null, due: to ?? from }

    if (!data.title) {
      titleError.value = true

      return
    }

    if (editing.value) {
      saving.value = true
      const ok = await tasks.update(editing.value.id, { ...data, done: data.status === 'done' })
      saving.value = false

      if (ok) {
        open.value = false
      }
    } else {
      const from = source.value
      // a duplicate keeps its place right after the original
      void tasks.add({ ...data, position: ui.task?.defaults.position ?? null })
      open.value = false

      if (from) {
        const target = projects.byId(data.projectId)?.name ?? 'Do posortowania'
        notify.show(data.projectId === from.projectId ? `Zduplikowano „${data.title}”.` : `Zduplikowano „${data.title}” → ${target}`)
      }
    }
  }

  /** Duplicates the saved task – unsaved edits in the dialog stay out of it. */
  function duplicate (): void {
    if (editing.value) {
      ui.duplicateTask(editing.value)
    }
  }

  function removeTask (): void {
    if (editing.value) {
      void tasks.remove(editing.value.id)
    }

    open.value = false
  }
</script>

<style scoped>
.lead {
  display: grid;
  gap: 2px;
}

.notes {
  margin-inline: -10px;
}

.props {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 10px 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.props__label {
  font-size: 13px;
  color: var(--text-2);
}

.props__inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.props__inline .input {
  flex: 1;
  min-width: 0;
}

.props__inline .props__days {
  flex: 0 0 64px;
  text-align: right;
}

.props__hint {
  flex: none;
  color: var(--text-3);
  font-size: 12px;
  white-space: nowrap;
}

.props .seg {
  justify-self: start;
  flex-wrap: wrap;
}

.flag {
  color: var(--p);
}

.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-text);
}

.stamp {
  font-size: 12px;
}

@media (max-width: 520px) {
  .props {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }

  .props > :nth-child(even) {
    margin-bottom: 8px;
  }

  .stamp {
    display: none;
  }
}
</style>
