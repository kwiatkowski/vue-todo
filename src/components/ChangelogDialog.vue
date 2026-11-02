<template>
  <BaseDialog v-model="open" title="Co nowego" :width="560">
    <section v-if="day" class="day">
      <header class="day__head">
        <h3 class="day__title">{{ formatChangelogDay(day.version) }}</h3>
        <span class="faint mono">{{ day.version }}</span>
        <span v-if="index === 0" class="chip chip--accent">najnowsze</span>
      </header>

      <ul class="day__items">
        <li v-for="(item, key) in day.items" :key="key">
          <template v-for="(part, at) in inlineParts(item)" :key="at">
            <strong v-if="part.kind === 'strong'">{{ part.text }}</strong>
            <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ul>
    </section>

    <template #actions>
      <!-- one day at a time – earlier and later days from the footer -->
      <button class="btn btn--sm" :disabled="index >= changelog.length - 1" type="button" @click="index++">
        <ChevronLeft /> Wcześniej
      </button>

      <button class="btn btn--sm" :disabled="index === 0" type="button" @click="index--">
        Później <ChevronRight />
      </button>

      <span style="flex: 1" />

      <button class="btn btn--accent btn--sm" type="button" @click="open = false">
        <Check /> Zamknij
      </button>
    </template>
  </BaseDialog>
</template>

<script lang="ts" setup>
  import { Check, ChevronLeft, ChevronRight } from 'lucide-vue-next'
  import { computed, onMounted, ref, watch } from 'vue'
  import BaseDialog from '@/components/ui/BaseDialog.vue'
  import { useUiStore } from '@/stores/ui'
  import { changelog, formatChangelogDay, inlineParts } from '@/utils/changelog'

  /**
   * "Co nowego" – the day's summary from CHANGELOG.md. Opens by itself once after a new day's version (remembered in
   * this browser), and any time from the version on the top bar or the account menu.
   */
  const SEEN_KEY = 'todo:changelog-seen'

  const ui = useUiStore()
  const index = ref(0)
  const day = computed(() => changelog[index.value] ?? null)

  const open = computed({
    get: () => ui.changelog,
    set: value => {
      ui.changelog = value
    },
  })

  // always opens on the newest day; closing it marks that day as seen
  watch(open, value => {
    if (value) {
      index.value = 0
    } else if (changelog[0]) {
      try {
        localStorage.setItem(SEEN_KEY, changelog[0].version)
      } catch {
        // no storage (a private window) – it shows again next time, nothing worse
      }
    }
  })

  onMounted(() => {
    const newest = changelog[0]?.version

    if (!newest) {
      return
    }

    let seen: string | null = null

    try {
      seen = localStorage.getItem(SEEN_KEY)
    } catch {
      return
    }

    if (seen !== newest) {
      ui.changelog = true
    }
  })
</script>

<style scoped>
.day {
  display: grid;
  gap: 12px;
}

.day__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.day__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.day__head .chip {
  align-self: center;
}

.day__items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.5;
}

.day__items li::marker {
  color: var(--accent);
}

.day__items strong {
  font-weight: 600;
}

.day__items code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--hover);
  font-family: var(--mono);
  font-size: .9em;
}
</style>
