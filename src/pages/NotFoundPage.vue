<template>
  <div class="page">
    <PageHeader title="Nie znaleziono" />

    <div class="empty">
      <SearchX />
      <strong>404</strong>
      <span>Ta strona nie istnieje albo projekt został usunięty.</span>
      <RouterLink class="btn btn--outline btn--sm" style="margin-top: 8px" :to="{ name: 'plan' }">Przejdź do planu</RouterLink>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { SearchX } from 'lucide-vue-next'
  import PageHeader from '@/components/PageHeader.vue'
  import { setPageTitle } from '@/composables/tabBadge'

  setPageTitle('Nie znaleziono · Todo')
</script>
