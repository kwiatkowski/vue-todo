<template>
  <BaseDialog v-model="open" :title="project ? 'Edytuj projekt' : 'Nowy projekt'" :width="440" @submit="save">
    <label class="field">
      <span>Nazwa</span>

      <input
        v-model="name"
        :aria-invalid="nameError ? 'true' : undefined"
        autofocus
        class="input"
        maxlength="100"
        placeholder="np. Strona firmy"
        @input="nameError = false"
      >

      <span v-if="nameError" class="error-text">Podaj nazwę projektu.</span>
    </label>

    <label class="field">
      <span>Kategoria</span>

      <select v-model="areaId" class="input">
        <option :value="null">Bez kategorii</option>
        <option v-for="area in areas.sorted" :key="area.id" :value="area.id">{{ area.name }}</option>
      </select>
    </label>

    <div class="field">
      <span>Kolor</span>

      <div aria-label="Kolor" class="swatches" role="radiogroup">
        <button
          v-for="swatch in PROJECT_COLORS"
          :key="swatch"
          :aria-checked="swatch === color"
          :aria-label="swatch"
          class="swatch"
          role="radio"
          :style="{ background: swatch }"
          type="button"
          @click="color = swatch"
        >
          <Check v-if="swatch === color" :stroke-width="3" />
        </button>
      </div>
    </div>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć projekt „{{ project?.name }}”? Jego zadania trafią do „Do posortowania”.</div>
    </div>

    <template #actions>
      <template v-if="project">
        <button v-if="!confirmDelete" class="btn btn--danger btn--sm" type="button" @click="confirmDelete = true">Usuń</button>

        <button v-if="!confirmDelete" class="btn btn--sm" type="button" @click="copyProject">
          <Copy /> Kopiuj
        </button>

        <button
          v-else
          class="btn btn--danger-solid btn--sm"
          :disabled="busy"
          type="button"
          @click="removeProject"
        >Tak, usuń</button>
      </template>

      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" type="submit">{{ project ? 'Zapisz' : 'Utwórz' }}</button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Check, Copy } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useAreasStore } from '@/stores/areas'
  import { PROJECT_COLORS, useProjectsStore } from '@/stores/projects'
  import { useUiStore } from '@/stores/ui'

  const ui = useUiStore()
  const projects = useProjectsStore()
  const areas = useAreasStore()
  const router = useRouter()

  const name = ref('')
  const color = ref<string>(PROJECT_COLORS[0]!)
  const areaId = ref<number | null>(null)
  const busy = ref(false)
  const nameError = ref(false)
  const confirmDelete = ref(false)

  const project = computed(() => ui.project?.project ?? null)

  const open = computed({
    get: () => ui.project !== null,
    set: value => {
      if (!value) {
        ui.project = null
      }
    },
  })

  watch(() => ui.project, value => {
    if (value) {
      name.value = value.project?.name ?? ''
      color.value = value.project?.color ?? PROJECT_COLORS[projects.items.length % PROJECT_COLORS.length]!
      areaId.value = value.areaId
      nameError.value = false
      confirmDelete.value = false
    }
  })

  async function save (): Promise<void> {
    const data = { name: name.value.trim(), color: color.value, areaId: areaId.value }

    if (!data.name) {
      nameError.value = true

      return
    }

    busy.value = true

    if (project.value) {
      if (await projects.update(project.value.id, data)) {
        open.value = false
      }
    } else {
      const created = await projects.add(data)

      if (created) {
        open.value = false
        await router.push({ name: 'project', params: { id: created.id } })
      }
    }

    busy.value = false
  }

  function copyProject (): void {
    if (project.value) {
      const source = project.value
      open.value = false
      ui.copyProject(source)
    }
  }

  async function removeProject (): Promise<void> {
    if (!project.value) {
      return
    }

    busy.value = true

    if (await projects.remove(project.value.id)) {
      open.value = false
      await router.push({ name: 'inbox' })
    }

    busy.value = false
  }
</script>

<style scoped>
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.swatch {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: transform .1s;
}

.swatch:hover {
  transform: scale(1.08);
}

.swatch[aria-checked='true'] {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text);
}

.swatch svg {
  width: 14px;
  height: 14px;
}
</style>
