<template>
  <div class="activity">
    <div class="tabs" role="tablist">
      <button
        v-for="item in TABS"
        :key="item.key"
        :aria-selected="tab === item.key"
        class="tabs__tab"
        role="tab"
        type="button"
        @click="tab = item.key"
      >
        <component :is="item.icon" /> {{ item.label }}
        <span v-if="item.key === 'comments' && comments.length > 0" class="tabs__count mono">{{ comments.length }}</span>
      </button>
    </div>

    <p v-if="!task" class="faint">Komentarze i historia pojawią się po dodaniu zadania.</p>
    <p v-else-if="loading && !activity" class="faint">Wczytuję…</p>
    <p v-else-if="!activity" class="faint">Nie udało się wczytać. <button class="link" type="button" @click="load">Spróbuj ponownie</button></p>

    <template v-else>
      <div v-show="tab === 'comments'" class="tab-panel" role="tabpanel">
        <!-- a new comment on top, the newest first under it; Ctrl+Enter adds it -->
        <div class="compose">
          <textarea
            v-model="draft"
            aria-label="Komentarz"
            class="input compose__field"
            maxlength="5000"
            placeholder="Napisz komentarz…"
            rows="5"
            @keydown.enter.ctrl.prevent.stop="addComment"
            @keydown.enter.meta.prevent.stop="addComment"
          />

          <div class="compose__actions">
            <span class="faint compose__hint">Ctrl+Enter</span>

            <button class="btn btn--accent btn--sm" :disabled="!draft.trim() || sending" type="button" @click="addComment">
              <MessageSquarePlus /> Dodaj komentarz
            </button>
          </div>
        </div>

        <p v-if="comments.length === 0" class="faint">Brak komentarzy.</p>

        <ul v-else class="feed">
          <li v-for="comment in newestFirst(comments)" :key="comment.id" class="feed__item">
            <div class="feed__head">
              <span class="feed__who">{{ comment.author ?? 'Ktoś' }}</span>
              <span class="faint">{{ formatMoment(comment.createdAt) }}</span>
              <span v-if="comment.editedAt" class="faint" :title="`Edytowany ${formatMoment(comment.editedAt)}`">· edytowany</span>
              <span style="flex: 1" />

              <template v-if="editing === comment.id" />

              <template v-else-if="removing === comment.id">
                <span class="feed__ask">Usunąć?</span>
                <button class="btn btn--danger btn--sm" type="button" @click="removeComment(comment.id)"><Trash2 /> Usuń</button>
                <button class="btn btn--sm" type="button" @click="removing = null">Nie</button>
              </template>

              <template v-else>
                <button
                  aria-label="Edytuj komentarz"
                  class="btn btn--icon btn--sm feed__tool"
                  title="Edytuj komentarz"
                  type="button"
                  @click="startEdit(comment)"
                >
                  <Pencil />
                </button>

                <button
                  aria-label="Usuń komentarz"
                  class="btn btn--icon btn--sm feed__tool"
                  title="Usuń komentarz"
                  type="button"
                  @click="removing = comment.id"
                >
                  <Trash2 />
                </button>
              </template>
            </div>

            <!-- editing in place: Ctrl+Enter saves, Esc drops the change (and leaves the dialog open) -->
            <div v-if="editing === comment.id" class="compose">
              <textarea
                ref="editField"
                v-model="editText"
                aria-label="Treść komentarza"
                class="input compose__field"
                maxlength="5000"
                rows="5"
                @keydown.enter.ctrl.prevent.stop="saveEdit"
                @keydown.enter.meta.prevent.stop="saveEdit"
                @keydown.esc.prevent.stop="editing = null"
              />

              <div class="compose__actions">
                <span class="faint compose__hint">Ctrl+Enter</span>

                <button class="btn btn--sm" type="button" @click="editing = null">
                  <X /> Anuluj
                </button>

                <button class="btn btn--accent btn--sm" :disabled="!editText.trim() || sending" type="button" @click="saveEdit">
                  <Check /> Zapisz
                </button>
              </div>
            </div>

            <p v-else class="feed__text">{{ comment.text }}</p>
          </li>
        </ul>
      </div>

      <div v-show="tab === 'history'" class="tab-panel" role="tabpanel">
        <ul class="feed feed--history">
          <li v-for="event in newestFirst(activity.history)" :key="event.id" class="feed__item">
            <div class="feed__head">
              <span class="feed__who">{{ EVENT_TITLES[event.type] }}</span>
              <span class="faint">{{ formatMoment(event.createdAt) }}<template v-if="event.author"> · {{ event.author }}</template></span>
            </div>

            <p v-if="event.text" class="feed__text feed__quote">{{ event.text }}</p>

            <ul v-if="event.type === 'changed'" class="changes">
              <li v-for="(change, index) in event.changes.map(describeChange)" :key="index">
                <span class="changes__label">{{ change.label }}:</span>
                <template v-if="change.from !== null"> <s class="changes__from">{{ change.from }}</s> → </template>
                <span class="changes__to">{{ change.to }}</span>
              </li>
            </ul>
          </li>

          <!-- tasks from before the history was kept: their creation from the task itself -->
          <li v-if="!activity.history.some(event => event.type === 'created')" class="feed__item">
            <div class="feed__head">
              <span class="feed__who">Utworzone</span>
              <span class="faint">{{ formatMoment(task.createdAt) }}</span>
            </div>

            <p v-if="activity.history.length === 0" class="faint feed__text">Zmiany są zapisywane od 2 listopada 2026.</p>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
  import type { Task, TaskActivity, TaskComment, TaskEvent } from '@/types'
  import type { Component } from 'vue'
  import { Check, History, MessageSquare, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-vue-next'
  import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { tasksApi } from '@/api/todo'
  import { useNotifyStore } from '@/stores/notify'
  import { describeChange, formatMoment } from '@/utils/activity'

  /** The task dialog's right column: comments and the history, in tabs – more tabs can join later. */
  const props = defineProps<{ task: Task | null }>()

  type Tab = 'comments' | 'history'

  const EVENT_TITLES: Record<TaskEvent['type'], string> = { created: 'Utworzone', changed: 'Zmiana', commented: 'Komentarz', commentEdited: 'Edycja komentarza' }

  const TABS: Array<{ key: Tab, label: string, icon: Component }> = [
    { key: 'comments', label: 'Komentarze', icon: MessageSquare },
    { key: 'history', label: 'Historia', icon: History },
  ]

  const notify = useNotifyStore()
  const tab = ref<Tab>('comments')
  const activity = ref<TaskActivity | null>(null)
  const loading = ref(false)
  const draft = ref('')
  const sending = ref(false)
  /** the comment asking "Usunąć?" */
  const removing = ref<number | null>(null)
  /** the comment being edited, and its text as typed */
  const editing = ref<number | null>(null)
  const editText = ref('')
  const editField = useTemplateRef<HTMLTextAreaElement[]>('editField')

  const comments = computed(() => activity.value?.comments ?? [])

  function newestFirst<T> (items: T[]): T[] {
    return items.toReversed()
  }

  async function load (): Promise<void> {
    const id = props.task?.id

    if (!id) {
      return
    }

    loading.value = true

    try {
      const result = await tasksApi.activity(id)

      // another task opened meanwhile
      if (props.task?.id === id) {
        activity.value = result
      }
    } catch (error) {
      notify.error(error)
    } finally {
      loading.value = false
    }
  }

  // each task opens on its comments, fresh from the server
  watch(() => props.task?.id, () => {
    activity.value = null
    draft.value = ''
    removing.value = null
    editing.value = null
    tab.value = 'comments'
    void load()
  }, { immediate: true })

  async function addComment (): Promise<void> {
    const text = draft.value.trim()

    if (!props.task || !text || sending.value) {
      return
    }

    sending.value = true

    try {
      const comment = await tasksApi.comment(props.task.id, text)
      activity.value?.comments.push(comment)
      draft.value = ''
      // the comment left a line in the history too
      void load()
    } catch (error) {
      notify.error(error)
    } finally {
      sending.value = false
    }
  }

  function startEdit (comment: TaskComment): void {
    removing.value = null
    editing.value = comment.id
    editText.value = comment.text

    // the field under the cursor's end
    void nextTick(() => {
      const field = editField.value?.[0]
      field?.focus()
      field?.setSelectionRange(field.value.length, field.value.length)
    })
  }

  async function saveEdit (): Promise<void> {
    const id = editing.value
    const text = editText.value.trim()

    if (!props.task || !activity.value || id === null || !text || sending.value) {
      return
    }

    sending.value = true

    try {
      const saved = await tasksApi.editComment(props.task.id, id, text)
      activity.value.comments = activity.value.comments.map(comment => comment.id === id ? saved : comment)
      editing.value = null
      // the edit left a line in the history
      void load()
    } catch (error) {
      notify.error(error)
    } finally {
      sending.value = false
    }
  }

  async function removeComment (id: number): Promise<void> {
    if (!props.task || !activity.value) {
      return
    }

    try {
      await tasksApi.removeComment(props.task.id, id)
      activity.value.comments = activity.value.comments.filter(comment => comment.id !== id)
    } catch (error) {
      notify.error(error)
    } finally {
      removing.value = null
    }
  }
</script>

<style scoped>
.activity {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
}

/* the tabs as in the project's dialog of the projects list */
.tabs {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}

.tabs__tab {
  display: inline-flex;
  flex: 1 0 auto;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-bottom: -1px;
  padding: 8px 9px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-2);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.tabs__tab svg {
  width: 15px;
  height: 15px;
}

.tabs__tab:hover {
  color: var(--text);
}

.tabs__tab[aria-selected='true'] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.tabs__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-size: 11px;
  font-weight: 600;
  line-height: 17px;
  text-align: center;
}

.tab-panel {
  display: grid;
  gap: 12px;
}

p {
  margin: 0;
  font-size: 13px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent-text);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.compose {
  display: grid;
  gap: 8px;
}

.compose__field {
  /* five lines – two more than a textarea's usual three */
  min-height: 112px;
  font-size: 13px;
}

.compose__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.compose__hint {
  font-size: 12px;
}

.feed {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feed__item {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
  font-size: 13px;
}

/* the history starts right under the tabs – no second line there */
.feed--history > .feed__item:first-child {
  padding-top: 0;
  border-top: 0;
}

.feed__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  font-size: 12px;
}

.feed__who {
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.feed__ask {
  color: var(--danger);
  font-weight: 500;
}

/* the pencil and the bin show on the comment pointed at (always on touch) */
.feed__tool {
  opacity: 0;
}

.feed__item:hover .feed__tool,
.feed__tool:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .feed__tool {
    opacity: 1;
  }
}

.feed__text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.feed__quote {
  padding-left: 8px;
  border-left: 2px solid var(--line-strong);
  color: var(--text-2);
}

.changes {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-wrap: anywhere;
}

.changes__label {
  margin-right: 4px;
  color: var(--text-2);
}

.changes__from {
  color: var(--text-3);
}
</style>
