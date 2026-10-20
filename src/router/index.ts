import type { Layout, TaskView } from '@/types'
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { config } from '@/config'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** list and board routes of the same view are pairs: `inbox` ⇄ `inbox-board` */
    layout?: Layout
  }
}

const TaskListPage = () => import('@/pages/TaskListPage.vue')
const CalendarPage = () => import('@/pages/CalendarPage.vue')

/** A view that is only a list – no board for it (dates decide the order there). */
function list (path: string, name: string, title: string, view: TaskView): RouteRecordRaw {
  return { path, name, component: TaskListPage, props: { view, layout: 'list' }, meta: { title, layout: 'list' } }
}

function lastCalendarMode (): 'day' | 'week' {
  try {
    return localStorage.getItem('todo:calendar') === 'week' ? 'week' : 'day'
  } catch {
    return 'day'
  }
}

/** A view available as a list and as a board, e.g. /project/3 and /project/3/board. */
function views (path: string, name: string, title: string | undefined, view: (route: RouteLocationNormalized) => TaskView): RouteRecordRaw[] {
  return (['list', 'board'] as const).map(layout => ({
    path: layout === 'list' ? path : `${path}/board`,
    name: layout === 'list' ? name : `${name}-board`,
    component: TaskListPage,
    props: route => ({ view: view(route), layout }),
    meta: { title, layout },
  }))
}

const id = (route: RouteLocationNormalized) => Number(route.params.id)

const router = createRouter({
  history: createWebHistory(config.basePath),
  routes: [
    { path: '/', redirect: { name: 'today' } },
    list('/today', 'today', 'Dziś', { kind: 'today' }),
    list('/tomorrow', 'tomorrow', 'Jutro', { kind: 'tomorrow' }),
    list('/week', 'week', 'Ten tydzień', { kind: 'week' }),
    list('/next-week', 'next-week', 'Przyszły tydzień', { kind: 'next-week' }),
    // the calendar opens in the view used last
    { path: '/calendar', name: 'calendar', redirect: () => ({ name: `calendar-${lastCalendarMode()}` }) },
    {
      path: String.raw`/calendar/day/:date(\d{4}-\d{2}-\d{2})?`,
      name: 'calendar-day',
      component: CalendarPage,
      props: route => ({ mode: 'day', date: route.params.date || undefined }),
      meta: { title: 'Kalendarz' },
    },
    {
      path: String.raw`/calendar/week/:date(\d{4}-\d{2}-\d{2})?`,
      name: 'calendar-week',
      component: CalendarPage,
      props: route => ({ mode: 'week', date: route.params.date || undefined }),
      meta: { title: 'Kalendarz' },
    },
    // older links to the day view
    { path: String.raw`/day/:date(\d{4}-\d{2}-\d{2})`, redirect: to => ({ name: 'calendar-day', params: { date: to.params.date } }) },
    ...views('/inbox', 'inbox', 'Do posortowania', () => ({ kind: 'inbox' })),
    list('/upcoming', 'upcoming', 'Nadchodzące', { kind: 'upcoming' }),
    ...views('/all', 'all', 'Wszystkie', () => ({ kind: 'all' })),
    list('/done', 'done', 'Zakończone', { kind: 'done' }),
    ...views(String.raw`/area/:id(\d+)`, 'area', undefined, route => ({ kind: 'area', id: id(route) })),
    ...views(String.raw`/project/:id(\d+)`, 'project', undefined, route => ({ kind: 'project', id: id(route) })),
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { title: 'Nie znaleziono' },
    },
  ],
})

export default router
