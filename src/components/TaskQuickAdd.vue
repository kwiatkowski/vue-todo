<template>
  <form class="quick" :class="{ 'quick--compact': compact }" @submit.prevent="submit">
    <Plus class="quick__icon" />

    <input
      v-model="text"
      aria-label="Nowe zadanie"
      autocomplete="off"
      class="quick__input"
      enterkeyhint="done"
      maxlength="200"
      :placeholder="placeholder"
      @keydown.esc="text = ''"
    >

    <div v-if="text.trim() && hints.length > 0" class="quick__hints">
      <span v-for="hint in hints" :key="hint" class="chip chip--accent mono">{{ hint }}</span>
    </div>

    <button v-if="text.trim() && !compact" class="btn btn--primary btn--sm" type="submit">Dodaj</button>
  </form>
</template>

<script lang="ts" setup>
  import type { TaskInput } from '@/types'
  import { Plus } from 'lucide-vue-next'
  import { computed, ref } from 'vue'
  import { useTasksStore } from '@/stores/tasks'
  import { formatDue, today } from '@/utils/date'
  import { parseQuickAdd } from '@/utils/parse'
  import { priorityTitle } from '@/utils/tasks'

  /** Defaults for the new task, e.g. the project of the open list, the day of the day view or a board column. */
  const props = withDefaults(defineProps<{
    defaults?: TaskInput
    placeholder?: string
    compact?: boolean
  }>(), { defaults: () => ({}), placeholder: 'Dodaj zadanie – np. „Zadzwonić jutro 18:00 !!”' })

  const tasks = useTasksStore()
  const text = ref('')

  const parsed = computed(() => parseQuickAdd(text.value))

  const hints = computed(() => {
    const { due, time, priority } = parsed.value
    const list: string[] = []

    if (due && due !== props.defaults.due) {
      list.push(formatDue(due))
    }

    if (time) {
      list.push(time)
    }

    if (priority) {
      list.push(`! ${priorityTitle(priority)}`)
    }

    return list
  })

  function submit (): void {
    const input = parsed.value

    if (!input.title) {
      return
    }

    // a bare time lands on the day of the view, or today
    const due = input.due ?? props.defaults.due ?? (input.time ? today() : undefined)

    void tasks.add({ ...props.defaults, ...input, due })
    text.value = ''
  }
</script>

<style scoped>
.quick {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 4px 6px 4px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition: border-color .12s, box-shadow .12s;
}

.quick:focus-within {
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}

.quick__icon {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--text-3);
}

.quick:focus-within .quick__icon {
  color: var(--accent);
}

.quick__input {
  flex: 1;
  min-width: 0;
  height: 34px;
  border: 0;
  background: transparent;
  outline: none;
}

.quick__input::placeholder {
  color: var(--text-3);
}

.quick__hints {
  display: flex;
  gap: 4px;
}

.quick--compact {
  min-height: 36px;
  padding: 0 8px;
  border-style: dashed;
  border-radius: var(--radius);
  background: transparent;
}

.quick--compact:focus-within {
  border-style: solid;
  background: var(--surface);
}

.quick--compact .quick__input {
  height: 32px;
  font-size: 13px;
}

.quick--compact .quick__icon {
  width: 16px;
  height: 16px;
}
</style>
