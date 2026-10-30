<template>
  <AppTopbar />

  <div class="shell" :class="{ 'shell--open': ui.sidebar }">
    <AppSidebar class="shell__side" />
    <div class="shell__scrim" @click="ui.sidebar = false" />

    <main class="shell__main">
      <RouterView />
    </main>

    <TaskDialog />
    <ProjectDialog />
    <AreaDialog />
    <CopyDialog />
    <RemoveTaskDialog />
    <ToastHost />
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import AppSidebar from '@/components/AppSidebar.vue'
  import AppTopbar from '@/components/AppTopbar.vue'
  import AreaDialog from '@/components/AreaDialog.vue'
  import CopyDialog from '@/components/CopyDialog.vue'
  import ProjectDialog from '@/components/ProjectDialog.vue'
  import RemoveTaskDialog from '@/components/RemoveTaskDialog.vue'
  import TaskDialog from '@/components/TaskDialog.vue'
  import ToastHost from '@/components/ui/ToastHost.vue'
  import { useTabBadge } from '@/composables/tabBadge'
  import { useAreasStore } from '@/stores/areas'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'

  const route = useRoute()
  const ui = useUiStore()
  const tasks = useTasksStore()
  const projects = useProjectsStore()
  const areas = useAreasStore()

  // the browser tab counts what's due today (overdue included) – once the tasks are in
  useTabBadge(() => ({
    count: tasks.status === 'ready' ? tasks.counts.today : 0,
    overdue: tasks.counts.overdue > 0,
  }))

  // the mobile sidebar closes once you pick something
  watch(() => route.fullPath, () => {
    ui.sidebar = false
  })

  onMounted(() => {
    void tasks.load()

    // without them the app still works, just flat – the task list shows a load error if the API is down
    Promise.all([projects.load(), areas.load()]).catch(() => {})
  })
</script>

<style>
.shell {
  display: grid;
  grid-template-columns: var(--sidebar) minmax(0, 1fr);
  min-height: calc(100dvh - var(--topbar));
}

/* under the top bar, the rest of the screen's height */
.shell__side {
  position: sticky;
  top: var(--topbar);
  height: calc(100dvh - var(--topbar));
}

.shell__scrim {
  display: none;
}

.shell__main {
  min-width: 0;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .shell__side {
    position: fixed;
    z-index: 40;
    inset: 0 auto 0 0;
    width: min(var(--sidebar), 86vw);
    transform: translateX(-100%);
    transition: transform .2s ease;
  }

  .shell--open .shell__side {
    transform: none;
    box-shadow: var(--shadow-pop);
  }

  .shell__scrim {
    position: fixed;
    z-index: 39;
    inset: 0;
    display: block;
    background: rgb(20 19 17 / 36%);
    opacity: 0;
    pointer-events: none;
    transition: opacity .2s;
  }

  .shell--open .shell__scrim {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
