<template>
  <BaseDialog v-model="open" title="Usuń zadanie" :width="420" @submit="remove">
    <p v-if="task">
      Usunąć zadanie <strong>„{{ task.title }}”</strong>? Trafi do kosza w WordPressie – stamtąd można je jeszcze przywrócić.
    </p>

    <template #actions>
      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false"><X /> Anuluj</button>

      <button ref="confirm" class="btn btn--danger-solid btn--sm" type="submit">
        <Trash2 /> Usuń
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Trash2, X } from 'lucide-vue-next'
  import { computed, nextTick, useTemplateRef, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'

  /** Asks before a task goes to the trash – from its dialog and from the "…" menu on a list. */
  const ui = useUiStore()
  const tasks = useTasksStore()

  const task = computed(() => ui.removing)
  const confirm = useTemplateRef<HTMLButtonElement>('confirm')

  const open = computed({
    get: () => ui.removing !== null,
    set: value => {
      if (!value) {
        ui.removing = null
      }
    },
  })

  // the delete button takes the focus – Enter confirms, Esc cancels
  watch(open, async value => {
    if (value) {
      await nextTick()
      confirm.value?.focus()
    }
  })

  function remove (): void {
    const target = task.value

    if (!target) {
      return
    }

    // the task's own dialog closes with it – there is nothing left to edit
    if (ui.task?.task?.id === target.id) {
      ui.task = null
    }

    ui.removing = null
    void tasks.remove(target.id)
  }
</script>
