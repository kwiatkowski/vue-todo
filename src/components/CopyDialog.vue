<template>
  <BaseDialog v-model="open" :title="isArea ? 'Kopiuj kategorię' : 'Kopiuj projekt'" :width="420" @submit="copy">
    <template v-if="source">
      <p v-if="isArea">
        Powstanie kopia kategorii <strong>„{{ source.item.name }}”</strong> zaraz pod oryginałem, z
        {{ projectCount === 1 ? 'kopią 1 projektu' : `kopiami ${projectCount} projektów` }} – te same nazwy, kolory i kolejność.
      </p>

      <template v-else>
        <label class="field">
          <span>Nazwa kopii</span>

          <input
            ref="nameInput"
            v-model="name"
            :aria-invalid="nameError ? 'true' : undefined"
            class="input"
            maxlength="100"
            @input="nameError = false"
          >

          <span v-if="nameError" class="error-text">Podaj nazwę projektu.</span>
        </label>

        <p class="muted">
          Kopia „{{ source.item.name }}” stanie zaraz pod oryginałem, w tej samej kategorii – z jego ustawieniami (kolor).
        </p>
      </template>

      <label class="check-field" :class="{ 'check-field--off': openTasks === 0 }">
        <input v-model="withTasks" :disabled="openTasks === 0" type="checkbox">

        <span>
          Skopiuj też otwarte zadania <span class="faint">({{ openTasks }})</span>
          <span class="muted check-field__hint">z terminami, statusem i priorytetem; ukończone zostają w oryginale</span>
        </span>
      </label>
    </template>

    <template #actions>
      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>

      <button class="btn btn--primary btn--sm" :disabled="busy" type="submit">
        <Copy /> Kopiuj
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Copy } from 'lucide-vue-next'
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useAreasStore } from '@/stores/areas'
  import { useProjectsStore } from '@/stores/projects'
  import { useTasksStore } from '@/stores/tasks'
  import { useUiStore } from '@/stores/ui'

  /** Confirms copying a category (with its projects) or a project – optionally with their open tasks. */
  const ui = useUiStore()
  const areas = useAreasStore()
  const projects = useProjectsStore()
  const tasks = useTasksStore()
  const router = useRouter()

  const withTasks = ref(false)
  const busy = ref(false)
  const name = ref('')
  const nameError = ref(false)
  const nameInput = useTemplateRef<HTMLInputElement>('nameInput')

  const source = computed(() => ui.copying)
  const isArea = computed(() => source.value?.kind === 'area')

  const open = computed({
    get: () => ui.copying !== null,
    set: value => {
      if (!value) {
        ui.copying = null
      }
    },
  })

  /** the projects whose open tasks would be copied */
  const projectIds = computed(() => {
    const value = source.value

    if (!value) {
      return new Set<number>()
    }

    return value.kind === 'area' ? projects.idsInArea(value.item.id) : new Set([value.item.id])
  })

  const projectCount = computed(() => projectIds.value.size)
  const openTasks = computed(() => tasks.open.filter(task => task.projectId !== null && projectIds.value.has(task.projectId)).length)

  // a project copy needs a name – suggested, and selected so typing replaces it
  watch(source, async value => {
    if (value) {
      withTasks.value = false
      name.value = value.kind === 'project' ? `${value.item.name} (kopia)` : ''
      nameError.value = false
      await nextTick()
      nameInput.value?.focus()
      nameInput.value?.select()
    }
  })

  async function copy (): Promise<void> {
    const value = source.value

    if (!value) {
      return
    }

    if (value.kind === 'project' && !name.value.trim()) {
      nameError.value = true

      return
    }

    busy.value = true
    const created = value.kind === 'area'
      ? await areas.copy(value.item.id, withTasks.value)
      : await projects.copy(value.item.id, withTasks.value, name.value.trim())
    busy.value = false

    if (created) {
      open.value = false
      await router.push({ name: value.kind, params: { id: created.id } })
    }
  }
</script>

<style scoped>
.check-field {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: pointer;
}

.check-field input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.check-field--off {
  opacity: .55;
  cursor: default;
}

.check-field__hint {
  display: block;
  font-size: 12.5px;
}
</style>
