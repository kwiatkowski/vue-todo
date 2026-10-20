<template>
  <header class="head">
    <button aria-label="Menu" class="btn btn--icon head__menu" type="button" @click="ui.sidebar = true">
      <Menu />
    </button>

    <div class="head__titles">
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>

      <h1 class="head__title">
        <span v-if="color" class="head__dot" :style="{ background: color }" />
        <component :is="icon" v-else-if="icon" class="head__icon" />
        {{ title }}
        <slot name="title-append" />
      </h1>

      <p v-if="subtitle" class="head__sub">{{ subtitle }}</p>
    </div>

    <div class="head__actions">
      <slot />
    </div>
  </header>
</template>

<script lang="ts" setup>
  import type { Component } from 'vue'
  import { Menu } from 'lucide-vue-next'
  import { useUiStore } from '@/stores/ui'

  defineProps<{
    title: string
    eyebrow?: string
    subtitle?: string
    /** project colour */
    color?: string
    /** category icon */
    icon?: Component
  }>()

  const ui = useUiStore()
</script>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 36px 0 20px;
}

.head__menu {
  display: none;
  align-self: center;
  margin-left: -8px;
}

/* actions wrap under the title when there's no room beside it */
.head__titles {
  flex: 1 1 260px;
  min-width: 0;
}

.head__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -.025em;
}

.head__title::first-letter {
  text-transform: uppercase;
}

.head__icon {
  flex: none;
  width: 22px;
  height: 22px;
  color: var(--text-2);
}

.head__dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.head__sub {
  margin-top: 4px;
  color: var(--text-2);
}

.head__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 900px) {
  .head {
    padding-top: 16px;
  }

  .head {
    align-items: center;
  }

  .head__menu {
    display: inline-flex;
  }

  .head__title {
    font-size: 22px;
  }
}
</style>
