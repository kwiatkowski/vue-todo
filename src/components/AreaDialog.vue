<template>
  <BaseDialog v-model="open" :title="area ? 'Edytuj kategorię' : 'Nowa kategoria'" :width="440" @submit="save">
    <label class="field">
      <span>Nazwa</span>

      <input
        v-model="name"
        :aria-invalid="nameError ? 'true' : undefined"
        autofocus
        class="input"
        maxlength="100"
        placeholder="np. Praca, Dom, Hobby"
        @input="nameError = false"
      >

      <span v-if="nameError" class="error-text">Podaj nazwę kategorii.</span>
    </label>

    <div class="field">
      <span>Ikona</span>

      <div aria-label="Ikona" class="icons" role="radiogroup">
        <button
          v-for="item in AREA_ICONS"
          :key="item.key"
          :aria-checked="icon === item.key"
          :aria-label="item.label"
          class="icons__item"
          role="radio"
          :title="item.label"
          type="button"
          @click="icon = icon === item.key ? null : item.key"
        >
          <component :is="item.icon" />
        </button>
      </div>

      <span class="hint muted">
        <template v-if="icon">Wybrana: {{ AREA_ICONS.find(item => item.key === icon)?.label }} – kliknij ponownie, żeby wrócić do automatycznej.</template>
        <template v-else>Bez wyboru ikona dobiera się do nazwy (np. Praca, Dom).</template>
      </span>
    </div>

    <p class="muted hint">Kategoria grupuje projekty w menu i ma własną listę oraz tablicę.</p>

    <div v-if="confirmDelete" class="alert">
      <div>Usunąć kategorię „{{ area?.name }}”? Projekty zostaną, tylko bez kategorii.</div>
    </div>

    <template #actions>
      <template v-if="area">
        <button v-if="!confirmDelete" class="btn btn--danger btn--sm" type="button" @click="confirmDelete = true">Usuń</button>

        <button v-if="!confirmDelete" class="btn btn--sm" type="button" @click="copyArea">
          <Copy /> Kopiuj
        </button>

        <button
          v-else
          class="btn btn--danger-solid btn--sm"
          :disabled="busy"
          type="button"
          @click="removeArea"
        >Tak, usuń</button>
      </template>

      <span style="flex: 1" />
      <button class="btn btn--sm" type="button" @click="open = false">Anuluj</button>
      <button class="btn btn--primary btn--sm" :disabled="busy" type="submit">{{ area ? 'Zapisz' : 'Utwórz' }}</button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Copy } from 'lucide-vue-next'
  import { computed, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useAreasStore } from '@/stores/areas'
  import { useUiStore } from '@/stores/ui'
  import { AREA_ICONS } from '@/utils/areaIcons'

  const ui = useUiStore()
  const areas = useAreasStore()
  const router = useRouter()

  const name = ref('')
  const icon = ref<string | null>(null)
  const busy = ref(false)
  const nameError = ref(false)
  const confirmDelete = ref(false)

  const area = computed(() => ui.area?.area ?? null)

  const open = computed({
    get: () => ui.area !== null,
    set: value => {
      if (!value) {
        ui.area = null
      }
    },
  })

  watch(() => ui.area, value => {
    if (value) {
      name.value = value.area?.name ?? ''
      icon.value = value.area?.icon ?? null
      nameError.value = false
      confirmDelete.value = false
    }
  })

  async function save (): Promise<void> {
    if (!name.value.trim()) {
      nameError.value = true

      return
    }

    busy.value = true

    if (area.value) {
      if (await areas.update(area.value.id, { name: name.value.trim(), icon: icon.value })) {
        open.value = false
      }
    } else {
      const created = await areas.add({ name: name.value.trim(), icon: icon.value })

      if (created) {
        open.value = false
        await router.push({ name: 'area', params: { id: created.id } })
      }
    }

    busy.value = false
  }

  function copyArea (): void {
    if (area.value) {
      const source = area.value
      open.value = false
      ui.copyArea(source)
    }
  }

  async function removeArea (): Promise<void> {
    if (!area.value) {
      return
    }

    busy.value = true

    if (await areas.remove(area.value.id)) {
      open.value = false
      await router.push({ name: 'all' })
    }

    busy.value = false
  }
</script>

<style scoped>
.hint {
  font-size: 13px;
}

.icons {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.icons__item {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.icons__item svg {
  width: 17px;
  height: 17px;
}

.icons__item:hover {
  background: var(--hover);
  color: var(--text);
}

.icons__item[aria-checked='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-text);
}

@media (max-width: 420px) {
  .icons {
    grid-template-columns: repeat(8, 1fr);
  }
}
</style>
