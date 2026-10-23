<template>
  <DropMenu>
    <button class="menu__item" role="menuitem" type="button" @click="ui.editTask(task)">
      <Pencil /> Edytuj
    </button>

    <button class="menu__item" role="menuitem" type="button" @click="ui.duplicateTask(task)">
      <Copy /> Duplikuj…
    </button>

    <button
      v-if="!task.done && (task.due !== day || task.start)"
      class="menu__item"
      role="menuitem"
      type="button"
      @click="tasks.update(task.id, { start: null, due: day })"
    >
      <Sun /> Na dziś
    </button>

    <button
      v-if="!task.done && (task.due !== tomorrow || task.start)"
      class="menu__item"
      role="menuitem"
      type="button"
      @click="tasks.update(task.id, { start: null, due: tomorrow })"
    >
      <Sunrise /> Na jutro
    </button>

    <div class="menu__sep" />

    <button
      v-for="item in moves"
      :key="item.value"
      class="menu__item"
      role="menuitem"
      type="button"
      @click="tasks.setStatus(task.id, item.value)"
    >
      <component :is="STATUS_ICONS[item.value]" /> {{ item.title }}
    </button>

    <div class="menu__sep" />

    <button class="menu__item menu__item--danger" role="menuitem" type="button" @click="ui.removeTask(task)">
      <Trash2 /> Usuń
    </button>
  </DropMenu>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { Copy, Pencil, Sun, Sunrise, Trash2 } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'
  import { addDays, today } from '@/utils/date'
  import { STATUS_ICONS } from '@/utils/icons'
  import { STATUSES } from '@/utils/tasks'

  /** Task actions – also the touch-friendly way to move a card between columns. */
  const props = defineProps<{ task: Task }>()

  const tasks = useTasksStore()
  const ui = useUiStore()

  const day = today()
  const tomorrow = addDays(day, 1)
  const moves = computed(() => STATUSES.filter(item => item.value !== props.task.status))
</script>
