<template>
  <div class="menu" @click.stop>
    <button
      ref="trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-label="label"
      :class="triggerClass"
      :title="label"
      type="button"
      @click="toggle"
    >
      <slot name="trigger"><Ellipsis /></slot>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        class="menu__panel"
        role="menu"
        :style="position"
        @click="open = false"
        @keydown.esc="close"
      >
        <slot />
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
  import { Ellipsis } from 'lucide-vue-next'
  import { nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'

  /**
   * A "…" button with a small menu; items are `<button class="menu__item">` in the default slot.
   * The `trigger` slot and `triggerClass` turn the button into something else, e.g. a chip.
   */
  const props = withDefaults(defineProps<{
    label?: string
    triggerClass?: string
    /** which edge of the trigger the panel lines up with */
    align?: 'start' | 'end'
  }>(), { label: 'Więcej', triggerClass: 'btn btn--icon btn--sm', align: 'end' })

  const open = ref(false)
  const position = ref<Record<string, string>>({})
  const trigger = useTemplateRef<HTMLButtonElement>('trigger')
  const panel = useTemplateRef<HTMLDivElement>('panel')

  async function toggle (): Promise<void> {
    if (open.value) {
      close()

      return
    }

    open.value = true
    await nextTick()
    place()
    panel.value?.querySelector<HTMLElement>('button')?.focus()
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
  }

  /** Under the trigger, aligned to its edge; flipped above when there is no room below. */
  function place (): void {
    const anchor = trigger.value?.getBoundingClientRect()
    const height = panel.value?.offsetHeight ?? 0

    if (!anchor) {
      return
    }

    const below = anchor.bottom + 4 + height < window.innerHeight
    const top = `${below ? anchor.bottom + 4 : anchor.top - 4 - height}px`

    position.value = props.align === 'start'
      ? { top, left: `${Math.max(anchor.left - 6, 8)}px` }
      : { top, right: `${Math.max(window.innerWidth - anchor.right, 8)}px` }
  }

  function close (): void {
    open.value = false
    document.removeEventListener('pointerdown', outside, true)
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', close)
  }

  function outside (event: PointerEvent): void {
    const target = event.target as Node

    if (!panel.value?.contains(target) && !trigger.value?.contains(target)) {
      close()
    }
  }

  onBeforeUnmount(close)
</script>

<style>
/* a trigger without looks of its own – the slot draws it */
.menu__bare {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.menu__panel {
  position: fixed;
  z-index: 50;
  min-width: 190px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-pop);
  animation: menu-in .1s ease-out;
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.menu__item svg {
  width: 15px;
  height: 15px;
  color: var(--text-2);
}

.menu__item:hover,
.menu__item:focus-visible {
  background: var(--hover);
  outline: none;
}

.menu__item:disabled {
  opacity: .4;
  cursor: default;
}

.menu__item:disabled:hover {
  background: transparent;
}

.menu__item--danger,
.menu__item--danger svg {
  color: var(--danger);
}

.menu__item--current {
  font-weight: 500;
}

.menu__check {
  margin-left: auto;
}

.menu__label {
  padding: 8px 10px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--text-3);
}

.menu__panel {
  max-height: min(420px, 70vh);
  overflow-y: auto;
}

.menu__sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--line);
}
</style>
