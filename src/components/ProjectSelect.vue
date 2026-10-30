<template>
  <div class="pselect">
    <button
      :id="id"
      ref="trigger"
      :aria-controls="listId"
      :aria-expanded="open"
      aria-haspopup="listbox"
      class="input pselect__trigger"
      type="button"
      @click="toggle"
      @keydown.down.prevent="show"
      @keydown.up.prevent="show"
    >
      <span v-if="current" class="dot" :style="{ color: current.color }" />
      <Inbox v-else class="pselect__inbox" />
      <span class="pselect__name">{{ current?.name ?? 'Do posortowania (bez projektu)' }}</span>
      <span v-if="area" class="pselect__area">{{ area.name }}</span>
      <ChevronDown class="pselect__chevron" />
    </button>

    <!-- a popover sits in the top layer above the dialog, so the dialog's scrolling body never clips it -->
    <div
      :id="listId"
      ref="panel"
      class="pselect__panel"
      popover="manual"
      role="listbox"
      :style="position"
      @keydown="onKeydown"
    >
      <button
        :aria-selected="model === null"
        class="pselect__option"
        :class="{ 'pselect__option--current': model === null }"
        role="option"
        type="button"
        @click="pick(null)"
      >
        <Inbox class="pselect__inbox" /> Do posortowania (bez projektu)
        <Check v-if="model === null" class="pselect__check" />
      </button>

      <template v-for="group in projects.grouped" :key="group.area?.id ?? 'none'">
        <div v-if="group.projects.length > 0" class="pselect__group">
          <component :is="group.area ? areaIcon(group.area) : FolderOpen" /> {{ group.area?.name ?? 'Bez kategorii' }}
        </div>

        <button
          v-for="item in group.projects"
          :key="item.id"
          :aria-selected="item.id === model"
          class="pselect__option"
          :class="{ 'pselect__option--current': item.id === model }"
          role="option"
          type="button"
          @click="pick(item.id)"
        >
          <span class="dot" :style="{ color: item.color }" /> {{ item.name }}
          <Check v-if="item.id === model" class="pselect__check" />
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { Check, ChevronDown, FolderOpen, Inbox } from 'lucide-vue-next'
  import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef } from 'vue'
  import { useAreasStore } from '@/stores/areas'
  import { useProjectsStore } from '@/stores/projects'
  import { areaIcon } from '@/utils/areaIcons'

  /**
   * The task dialog's project field: the project's colour and category on the field, and a list grouped
   * by category that opens under it at the field's width. Arrows move, Enter picks, Esc closes just the list.
   */
  defineProps<{ id?: string }>()
  const model = defineModel<number | null>({ required: true })

  const projects = useProjectsStore()
  const areas = useAreasStore()
  const listId = useId()

  const current = computed(() => projects.byId(model.value))
  const area = computed(() => areas.items.find(item => item.id === current.value?.areaId))

  const open = ref(false)
  const position = ref<Record<string, string>>({})
  const trigger = useTemplateRef<HTMLButtonElement>('trigger')
  const panel = useTemplateRef<HTMLDivElement>('panel')

  function toggle (): void {
    if (open.value) {
      hide()
    } else {
      void show()
    }
  }

  async function show (): Promise<void> {
    if (open.value || !panel.value) {
      return
    }

    open.value = true
    panel.value.showPopover()
    place()
    await nextTick()
    options().find(option => option.getAttribute('aria-selected') === 'true')?.focus()
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
  }

  /** Under the field at its width, kept within the dialog it's in; above the field when there is no room below. */
  function place (): void {
    const anchor = trigger.value?.getBoundingClientRect()

    if (!anchor) {
      return
    }

    const frame = trigger.value?.closest('dialog')?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }
    const below = frame.bottom - anchor.bottom - 12
    const above = anchor.top - frame.top - 12
    const up = below < 240 && above > below
    const room = Math.min(360, up ? above : below)

    position.value = {
      left: `${anchor.left}px`,
      width: `${anchor.width}px`,
      maxHeight: `${room}px`,
      ...(up ? { bottom: `${window.innerHeight - anchor.top + 4}px` } : { top: `${anchor.bottom + 4}px` }),
    }
  }

  function hide (refocus = false): void {
    if (!open.value) {
      return
    }

    open.value = false
    panel.value?.hidePopover()
    document.removeEventListener('pointerdown', outside, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)

    if (refocus) {
      trigger.value?.focus()
    }
  }

  function onResize (): void {
    hide()
  }

  function pick (id: number | null): void {
    model.value = id
    hide(true)
  }

  function options (): HTMLButtonElement[] {
    return [...(panel.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
  }

  function onKeydown (event: KeyboardEvent): void {
    const list = options()
    const index = list.indexOf(document.activeElement as HTMLButtonElement)

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        list[(index + step + list.length) % list.length]?.focus()
        break
      }
      case 'Home':
      case 'End': {
        event.preventDefault()
        list.at(event.key === 'Home' ? 0 : -1)?.focus()
        break
      }
      case 'Escape': {
        // only the list closes – the dialog stays
        event.preventDefault()
        event.stopPropagation()
        hide(true)
        break
      }
      case 'Tab': {
        hide()
        break
      }
    }
  }

  function outside (event: PointerEvent): void {
    const target = event.target as Node

    if (!panel.value?.contains(target) && !trigger.value?.contains(target)) {
      hide()
    }
  }

  // the list scrolling is fine; the dialog or the page scrolling moves the field away
  function onScroll (event: Event): void {
    if (!panel.value?.contains(event.target as Node)) {
      hide()
    }
  }

  onBeforeUnmount(() => hide())
</script>

<style scoped>
.pselect__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.pselect__trigger[aria-expanded='true'] {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.pselect__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pselect__area {
  flex: none;
  color: var(--text-3);
  font-size: 12px;
}

.pselect__inbox {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--text-3);
}

/* the same grey chevron as the native selects */
.pselect__chevron {
  flex: none;
  width: 16px;
  height: 16px;
  margin-left: auto;
  color: #918d82;
  transition: transform .12s;
}

.pselect__trigger[aria-expanded='true'] .pselect__chevron {
  transform: rotate(180deg);
}

.pselect__panel {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-pop);
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
}

.pselect__panel:popover-open {
  animation: pselect-in .1s ease-out;
}

@keyframes pselect-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
}

.pselect__group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 4px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pselect__group svg {
  width: 13px;
  height: 13px;
}

.pselect__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.pselect__option:hover,
.pselect__option:focus-visible {
  background: var(--hover);
  outline: none;
}

.pselect__option--current {
  background: var(--accent-soft);
  color: var(--accent-text);
  font-weight: 500;
}

.pselect__option--current:hover,
.pselect__option--current:focus-visible {
  background: var(--accent-soft);
}

.pselect__check {
  width: 15px;
  height: 15px;
  margin-left: auto;
}
</style>
