<template>
  <!-- the same bar as the list of projects – one family of apps: the brand and the version on the left, actions and the account on the right -->
  <header class="top">
    <!-- as wide as the sidebar – the page's title starts where the list does -->
    <div class="top__start">
      <button aria-label="Menu" class="btn btn--icon btn--sm top__menu" type="button" @click="ui.sidebar = true">
        <Menu />
      </button>

      <RouterLink class="top__brand" :to="{ name: 'plan' }">
        <span aria-hidden="true" class="top__logo"><Check :stroke-width="3" /></span>
        <span class="top__site">Todo</span>
      </RouterLink>

      <!-- the plugin's version (RRRR.MM.DD[.N]) – which build of the app this is; a click shows what's new -->
      <button
        v-if="config.version"
        class="top__version mono"
        title="Co nowego"
        type="button"
        @click="ui.changelog = true"
      >
        {{ config.version }}
      </button>
    </div>

    <!-- the page's title, its day or category after it -->
    <h1 v-if="ui.page" class="top__title">
      <span v-if="ui.page.color" class="top__dot" :style="{ background: ui.page.color }" />
      <component :is="ui.page.icon" v-else-if="ui.page.icon" class="top__icon" />
      <span class="top__page">{{ ui.page.title }}</span>
      <span v-if="ui.page.eyebrow" class="top__eyebrow">{{ ui.page.eyebrow }}</span>
    </h1>

    <span class="top__space" />

    <button
      aria-label="Nowe zadanie"
      class="btn btn--sm btn--accent"
      title="Nowe zadanie"
      type="button"
      @click="ui.newTask()"
    >
      <Plus /> <span class="top__label">Nowe zadanie</span>
    </button>

    <button
      :aria-label="dark ? 'Jasny motyw' : 'Ciemny motyw'"
      class="btn btn--icon btn--sm"
      :title="dark ? 'Jasny motyw' : 'Ciemny motyw'"
      type="button"
      @click="toggleTheme"
    >
      <Sun v-if="dark" />
      <Moon v-else />
    </button>

    <!-- the photo opens the account's menu: the other app, WordPress and logging out -->
    <DropMenu
      v-if="config.user"
      :label="`Konto: ${config.user.name}`"
      trigger-class="menu__bare top__me"
    >
      <template #trigger>
        <img
          alt=""
          class="top__avatar"
          height="24"
          :src="config.user.avatar"
          width="24"
        >

        <ChevronDown class="top__caret" />
      </template>

      <div class="user-menu__head">
        <strong>{{ config.user.name }}</strong>
        <span class="faint">zalogowany w WordPressie</span>
      </div>

      <a v-if="config.projectsUrl" class="menu__item" :href="config.projectsUrl" role="menuitem">
        <Layers /> Lista projektów
      </a>

      <a v-if="config.adminUrl" class="menu__item" :href="config.adminUrl" role="menuitem">
        <LayoutDashboard /> Panel WordPressa
      </a>

      <button class="menu__item" role="menuitem" type="button" @click="ui.changelog = true">
        <Sparkles /> Co nowego
      </button>

      <div class="menu__sep" />

      <a v-if="config.logoutUrl" class="menu__item" :href="config.logoutUrl" role="menuitem">
        <LogOut /> Wyloguj
      </a>
    </DropMenu>
  </header>
</template>

<script lang="ts" setup>
  import { Check, ChevronDown, Layers, LayoutDashboard, LogOut, Menu, Moon, Plus, Sparkles, Sun } from 'lucide-vue-next'
  import DropMenu from '@/components/ui/DropMenu.vue'
  import { useTheme } from '@/composables/theme'
  import { config } from '@/config'
  import { useUiStore } from '@/stores/ui'

  const ui = useUiStore()
  const { dark, toggleTheme } = useTheme()
</script>

<style scoped>
.top {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--topbar);
  padding: 0 var(--edge);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(8px);
}

.top__start {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  /* the bar's padding plus this plus the gap = the sidebar's width plus the list's padding */
  width: calc(var(--sidebar) - 6px);
  min-width: 0;
}

.top__menu {
  display: none;
  margin-left: -6px;
}

.top__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -.01em;
  white-space: nowrap;
}

.top__page {
  overflow: hidden;
  text-overflow: ellipsis;
}

.top__page::first-letter {
  text-transform: uppercase;
}

.top__eyebrow {
  overflow: hidden;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  text-overflow: ellipsis;
}

.top__dot {
  flex: none;
  align-self: center;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.top__icon {
  flex: none;
  align-self: center;
  width: 16px;
  height: 16px;
  color: var(--text-2);
}

.top__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

.top__logo {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-ink);
}

.top__logo svg {
  width: 15px;
  height: 15px;
}

.top__site {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top__version {
  margin-left: -2px;
  padding: 2px 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-3);
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}

.top__version:hover {
  background: var(--hover);
  color: var(--text);
}

.top__space {
  flex: 1;
}

.top__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/* the photo and a small arrow – one button for the account's menu */
.top :deep(.top__me) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  padding: 2px 4px 2px 2px;
  border-radius: 999px;
  color: var(--text-3);
}

.top :deep(.top__me:hover),
.top :deep(.top__me[aria-expanded='true']) {
  background: var(--hover);
  color: var(--text);
}

.top__caret {
  width: 14px;
  height: 14px;
}

@media (max-width: 900px) {
  .top__menu {
    display: inline-flex;
  }

  /* no sidebar beside the list – the title right after the brand */
  .top__start {
    width: auto;
    margin-right: 6px;
  }
}

@media (max-width: 560px) {
  .top__label,
  .top__version,
  .top__eyebrow {
    display: none;
  }
}
</style>

<!-- the account's menu is rendered in <body> – out of the scoped styles -->
<style>
.user-menu__head {
  display: grid;
  gap: 1px;
  min-width: 210px;
  margin-bottom: 4px;
  padding: 6px 10px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}

.user-menu__head .faint {
  font-size: 12px;
}
</style>
