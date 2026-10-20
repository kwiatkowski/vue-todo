<template>
  <DropMenu
    v-if="menu"
    align="start"
    class="check-menu"
    :label="`Status: ${statusTitle} – zmień`"
    trigger-class="menu__bare"
  >
    <template #trigger>
      <span class="check" :class="classes">
        <Check :stroke-width="3" />
      </span>
    </template>

    <button
      v-for="item in STATUSES"
      :key="item.value"
      :aria-checked="item.value === task.status"
      class="menu__item"
      :class="{ 'menu__item--current': item.value === task.status }"
      role="menuitemradio"
      type="button"
      @click="tasks.setStatus(task.id, item.value)"
    >
      <component :is="STATUS_ICONS[item.value]" /> {{ item.title }}
      <Check v-if="item.value === task.status" class="menu__check" />
    </button>
  </DropMenu>

  <button
    v-else
    :aria-checked="task.done"
    :aria-label="task.done ? 'Oznacz jako nieukończone' : 'Oznacz jako ukończone'"
    class="check"
    :class="classes"
    role="checkbox"
    type="button"
    @click.stop="tasks.toggle(task.id)"
  >
    <Check :stroke-width="3" />
  </button>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { Check } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { STATUS_ICONS } from '@/utils/icons'
  import { STATUSES } from '@/utils/tasks'

  /**
   * Round checkbox: ring in the priority colour, half-filled while "W toku", solid when done.
   * With `menu` a click opens the status picker instead of ticking it off.
   */
  const props = defineProps<{ task: Task, menu?: boolean }>()

  const tasks = useTasksStore()

  const classes = computed(() => [`p-${props.task.priority}`, { 'check--done': props.task.done, 'check--doing': props.task.status === 'doing' }])
  const statusTitle = computed(() => STATUSES.find(item => item.value === props.task.status)?.title ?? '')
</script>

<style scoped>
.check {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1.5px solid var(--p);
  border-radius: 50%;
  background: transparent;
  color: transparent;
  cursor: pointer;
  transition: background-color .15s, color .15s;
}

/* bigger touch target without a bigger circle */
.check::after {
  content: '';
  position: absolute;
  inset: -10px;
}

.check svg {
  width: 11px;
  height: 11px;
}

.check:hover,
.check-menu :deep(.menu__bare:hover) .check {
  color: var(--p);
}

.check-menu :deep(.menu__bare[aria-expanded='true']) .check {
  box-shadow: 0 0 0 3px var(--hover);
}

.check--doing {
  background: linear-gradient(90deg, var(--p) 50%, transparent 50%);
  background-clip: content-box;
  padding: 2px;
}

.check--doing:hover {
  color: transparent;
}

.check--done {
  background: var(--p);
  color: var(--surface);
  animation: tick .25s ease-out;
}

.check--done:hover {
  color: var(--surface);
}

@keyframes tick {
  50% {
    transform: scale(1.18);
  }
}
</style>
