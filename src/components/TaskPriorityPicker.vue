<template>
  <DropMenu
    align="start"
    class="priority"
    :label="`Priorytet: ${priorityTitle(task.priority)} – zmień`"
    trigger-class="menu__bare priority__trigger"
  >
    <template #trigger>
      <span class="chip flag" :class="`p-${task.priority}`">
        <Flag /> {{ priorityTitle(task.priority) }}
      </span>
    </template>

    <button
      v-for="item in PRIORITIES"
      :key="item.value"
      :aria-checked="item.value === task.priority"
      class="menu__item"
      :class="{ 'menu__item--current': item.value === task.priority }"
      role="menuitemradio"
      type="button"
      @click="choose(item.value)"
    >
      <Flag class="priority__flag" :class="`p-${item.value}`" /> {{ item.title }}
      <Check v-if="item.value === task.priority" class="menu__check" />
    </button>
  </DropMenu>
</template>

<script lang="ts" setup>
  import type { Priority, Task } from '@/types'
  import { Check, Flag } from 'lucide-vue-next'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { PRIORITIES, priorityTitle } from '@/utils/tasks'

  /** The priority chip of a list's row as a picker – a click opens the four priorities, as the status circle does. */
  const props = defineProps<{ task: Task }>()

  const tasks = useTasksStore()

  function choose (priority: Priority): void {
    if (priority !== props.task.priority) {
      void tasks.update(props.task.id, { priority })
    }
  }
</script>

<style scoped>
.priority {
  display: inline-flex;
}

.priority :deep(.priority__trigger) {
  display: inline-flex;
  border-radius: 5px;
}

.priority .chip {
  cursor: pointer;
}

.flag,
.priority__flag {
  color: var(--p);
}

.priority :deep(.priority__trigger:hover) .chip,
.priority :deep(.priority__trigger[aria-expanded='true']) .chip {
  background: var(--hover);
}
</style>
