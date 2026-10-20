import type { Status } from '@/types'
import type { Component } from 'vue'
import { Circle, CircleCheck, CircleDashed } from 'lucide-vue-next'

export const STATUS_ICONS: Record<Status, Component> = {
  todo: Circle,
  doing: CircleDashed,
  done: CircleCheck,
}
