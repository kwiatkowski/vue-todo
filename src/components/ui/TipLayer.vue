<template>
  <!-- a new target – a new Teleport (keyed), not one moved between <body> and a dialog -->
  <Teleport :key="layerKey" :to="layer">
    <div
      v-if="shownTip.anchor"
      ref="tip"
      class="tip"
      :class="{ 'tip--below': below }"
      role="tooltip"
      :style="position"
    >{{ shownTip.text }}</div>
  </Teleport>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { shownTip } from '@/directives/tip'
  import { layerKeyOf, placeTip, tipLayer } from '@/utils/tip'

  /** v-tip's tooltip – one for the whole app, placed by utils/tip */
  const tip = useTemplateRef<HTMLElement>('tip')
  const below = ref(false)
  const position = ref<Record<string, string>>({ visibility: 'hidden' })

  /** <body>, or the open <dialog> the anchor is in – a modal dialog covers everything in <body> */
  const layer = ref<string | HTMLElement>('body')
  const layerKey = computed(() => layerKeyOf(layer.value))

  function hide (): void {
    shownTip.anchor = null
  }

  function onKey (event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      hide()
    }
  }

  function listen (on: boolean): void {
    const method = on ? 'addEventListener' : 'removeEventListener'

    window[method]('scroll', hide, { capture: true })
    // leaving the tab fires no mouseleave – close it then
    window[method]('blur', hide)
    window[method]('keydown', onKey as EventListener)
  }

  watch(() => [shownTip.anchor, shownTip.text] as const, async ([anchor]) => {
    listen(false)

    if (!anchor) {
      return
    }

    layer.value = tipLayer(anchor)
    // measured first while invisible, then placed
    position.value = { visibility: 'hidden', left: '0px', top: '0px' }
    listen(true)

    await nextTick()

    const size = tip.value?.getBoundingClientRect()

    if (size && shownTip.anchor === anchor) {
      ;({ below: below.value, position: position.value } = placeTip(anchor.getBoundingClientRect(), size))
    }
  })
</script>
