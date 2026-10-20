<template>
  <DropMenu
    align="start"
    class="picker"
    :label="project ? `Projekt: ${project.name} – zmień` : 'Przypisz projekt'"
    trigger-class="menu__bare picker__trigger"
  >
    <template #trigger>
      <span class="picker__value" :class="{ 'picker__value--none': !project }">
        <span v-if="project" class="dot" :style="{ color: project.color }" />
        {{ project?.name ?? 'Bez projektu' }}
      </span>
    </template>

    <button
      :aria-checked="task.projectId === null"
      class="menu__item"
      :class="{ 'menu__item--current': task.projectId === null }"
      role="menuitemradio"
      type="button"
      @click="move(null)"
    >
      <Inbox /> Do posortowania (bez projektu)
      <Check v-if="task.projectId === null" class="menu__check" />
    </button>

    <template v-for="group in projects.grouped" :key="group.area?.id ?? 'none'">
      <div v-if="group.projects.length > 0" class="menu__label">{{ group.area?.name ?? 'Bez kategorii' }}</div>

      <button
        v-for="item in group.projects"
        :key="item.id"
        :aria-checked="item.id === task.projectId"
        class="menu__item"
        :class="{ 'menu__item--current': item.id === task.projectId }"
        role="menuitemradio"
        type="button"
        @click="move(item.id)"
      >
        <span class="dot" :style="{ color: item.color }" /> {{ item.name }}
        <Check v-if="item.id === task.projectId" class="menu__check" />
      </button>
    </template>
  </DropMenu>
</template>

<script lang="ts" setup>
  import type { Task } from '@/types'
  import { Check, Inbox } from 'lucide-vue-next'
  import { computed } from 'vue'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useNotifyStore } from '@/stores/notify'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'

  /** Quiet project name next to a task title; a click picks another project. */
  const props = defineProps<{ task: Task }>()

  const tasks = useTasksStore()
  const projects = useProjectsStore()
  const notify = useNotifyStore()

  const project = computed(() => projects.byId(props.task.projectId))

  /** The task may leave the list it's on (e.g. the inbox) – say where it went. */
  async function move (projectId: number | null): Promise<void> {
    if (projectId === props.task.projectId) {
      return
    }

    const { id, title } = props.task

    if (await tasks.update(id, { projectId })) {
      notify.show(`„${title}” → ${projects.byId(projectId)?.name ?? 'Do posortowania'}`)
    }
  }
</script>

<style scoped>
.picker {
  display: inline-flex;
  vertical-align: baseline;
}

.picker :deep(.picker__trigger) {
  display: inline-flex;
  border-radius: 5px;
}

.picker__value {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 5px;
  border-radius: 5px;
  color: var(--text-2);
  font-size: 12.5px;
  white-space: nowrap;
}

.picker__value .dot {
  width: 7px;
  height: 7px;
}

.picker__value--none {
  color: var(--text-3);
}

.picker :deep(.picker__trigger:hover) .picker__value,
.picker :deep(.picker__trigger[aria-expanded='true']) .picker__value {
  background: var(--hover);
  color: var(--text);
}
</style>
