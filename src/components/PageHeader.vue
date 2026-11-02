<template>
  <!-- the title goes up to the top bar; here the line under it and the page's actions – nothing at all when neither -->
  <header class="head">
    <div class="head__titles">
      <p v-if="subtitle" class="head__sub">{{ subtitle }}</p>
    </div>

    <div class="head__actions">
      <slot />
    </div>
  </header>
</template>

<script lang="ts" setup>
  import type { Component } from 'vue'
  import { markRaw, onBeforeUnmount, watchEffect } from 'vue'
  import { useUiStore } from '@/stores/ui'

  const props = defineProps<{
    title: string
    eyebrow?: string
    subtitle?: string
    /** project colour */
    color?: string
    /** category icon */
    icon?: Component
  }>()

  const ui = useUiStore()

  // the title, the day (eyebrow) and the project's colour or category's icon – on the top bar
  watchEffect(() => {
    ui.page = { title: props.title, eyebrow: props.eyebrow, color: props.color, icon: props.icon ? markRaw(props.icon) : undefined }
  })

  onBeforeUnmount(() => {
    ui.page = null
  })
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: var(--edge) 0 16px;
}

/* nothing under the title and no actions (the plan): only the space above what follows */
.head:not(:has(.head__sub)):has(.head__actions:empty) {
  padding-bottom: 0;
}

/* actions wrap under the title when there's no room beside it */
.head__titles {
  flex: 1 1 260px;
  min-width: 0;
}

.head__sub {
  margin: 0;
  color: var(--text-2);
}

.head__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 900px) {
  .head {
    align-items: center;
  }

  .head__title {
    font-size: 22px;
  }
}
</style>
