<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="dialog"
    :style="{ '--width': `${width}px` }"
    @cancel.prevent="open = false"
    @click="onBackdrop"
  >
    <form v-if="open" class="dialog__card" novalidate @submit.prevent="emit('submit')">
      <header class="dialog__head">
        <h2 :id="titleId" class="dialog__title">{{ title }}</h2>

        <button aria-label="Zamknij" class="btn btn--icon btn--sm" type="button" @click="open = false">
          <X />
        </button>
      </header>

      <div class="dialog__body">
        <slot />
      </div>

      <footer v-if="$slots.actions" class="dialog__actions">
        <slot name="actions" />
      </footer>
    </form>
  </dialog>
</template>

<script lang="ts" setup>
  import { X } from 'lucide-vue-next'
  import { onMounted, useId, useTemplateRef, watch } from 'vue'

  /** Native <dialog>: focus trap, Esc and the top layer for free. */
  const open = defineModel<boolean>({ default: false })

  withDefaults(defineProps<{ title: string, width?: number }>(), { width: 480 })

  const emit = defineEmits<{ submit: [] }>()

  const dialog = useTemplateRef<HTMLDialogElement>('dialog')
  const titleId = useId()

  function sync (value: boolean): void {
    if (value && !dialog.value?.open) {
      dialog.value?.showModal()
    } else if (!value && dialog.value?.open) {
      dialog.value.close()
    }
  }

  watch(open, sync, { flush: 'post' })
  onMounted(() => sync(open.value))

  function onBackdrop (event: MouseEvent): void {
    // a click on the dialog element itself (not the card) is a click on the backdrop
    if (event.target === dialog.value) {
      open.value = false
    }
  }
</script>

<style scoped>
.dialog {
  width: min(var(--width), calc(100vw - 24px));
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-pop);
}

.dialog[open] {
  animation: pop .14s ease-out;
}

.dialog::backdrop {
  background: rgb(20 19 17 / 36%);
  backdrop-filter: blur(2px);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(6px) scale(.985);
  }
}

.dialog__card {
  display: flex;
  flex-direction: column;
  max-height: inherit;
}

.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 0 20px;
}

.dialog__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
}

.dialog__body {
  display: grid;
  gap: 16px;
  padding: 8px 20px 20px;
  overflow-y: auto;
}

.dialog__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}
</style>
