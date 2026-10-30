<template>
  <div class="notes" :class="{ 'notes--focus': focused }">
    <div v-if="editor" aria-label="Formatowanie" class="notes__bar" role="toolbar">
      <button
        v-for="tool in TOOLS"
        :key="tool.name"
        :aria-label="tool.title"
        :aria-pressed="editor.isActive(tool.name)"
        class="notes__tool"
        :title="tool.title"
        type="button"
        @click="tool.run(editor)"
        @mousedown.prevent
      >
        <component :is="tool.icon" />
      </button>
    </div>

    <EditorContent class="notes__body" :editor="editor" />
  </div>
</template>

<script lang="ts" setup>
  import type { Editor } from '@tiptap/vue-3'
  import type { Component } from 'vue'
  import { TaskItem, TaskList } from '@tiptap/extension-list'
  import { CharacterCount, Placeholder } from '@tiptap/extensions'
  import { Markdown } from '@tiptap/markdown'
  import StarterKit from '@tiptap/starter-kit'
  import { EditorContent, useEditor } from '@tiptap/vue-3'
  import { Bold, Code, Italic, List, ListChecks, ListOrdered, Strikethrough } from 'lucide-vue-next'
  import { ref, watch } from 'vue'

  /**
   * The task's notes with simple formatting – bold, italic, strikethrough, code and lists (checklists too).
   * Stored as Markdown, so plain-text notes stay as they were and the API still gives readable text.
   * Markdown shortcuts work as you type: "- ", "1. ", "[ ] ", **bold**, ~~strike~~.
   */

  const props = defineProps<{ placeholder?: string, maxLength?: number }>()
  const model = defineModel<string>({ required: true })

  interface Tool {
    name: string
    title: string
    icon: Component
    run: (editor: Editor) => void
  }

  const TOOLS: Tool[] = [
    { name: 'bold', title: 'Pogrubienie (Ctrl+B)', icon: Bold, run: editor => editor.chain().focus().toggleBold().run() },
    { name: 'italic', title: 'Kursywa (Ctrl+I)', icon: Italic, run: editor => editor.chain().focus().toggleItalic().run() },
    { name: 'strike', title: 'Przekreślenie (Ctrl+Shift+S)', icon: Strikethrough, run: editor => editor.chain().focus().toggleStrike().run() },
    { name: 'code', title: 'Kod (Ctrl+E)', icon: Code, run: editor => editor.chain().focus().toggleCode().run() },
    { name: 'bulletList', title: 'Lista punktowana', icon: List, run: editor => editor.chain().focus().toggleBulletList().run() },
    { name: 'orderedList', title: 'Lista numerowana', icon: ListOrdered, run: editor => editor.chain().focus().toggleOrderedList().run() },
    { name: 'taskList', title: 'Lista do odhaczenia', icon: ListChecks, run: editor => editor.chain().focus().toggleTaskList().run() },
  ]

  const focused = ref(false)

  const editor = useEditor({
    content: model.value,
    contentType: 'markdown',
    extensions: [
      // only what Markdown can hold – no headings, quotes or underline in a task's notes
      StarterKit.configure({ heading: false, blockquote: false, horizontalRule: false, underline: false, link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true, a11y: { checkboxLabel: (node, checked) => `${checked ? 'Odhaczone' : 'Do odhaczenia'}: ${node.textContent || 'pusta pozycja'}` } }),
      Markdown,
      Placeholder.configure({ placeholder: props.placeholder ?? '' }),
      CharacterCount.configure({ limit: props.maxLength ?? null }),
    ],
    onUpdate: ({ editor: current }) => {
      model.value = current.isEmpty ? '' : current.getMarkdown()
    },
    onFocus: () => (focused.value = true),
    onBlur: () => (focused.value = false),
  })

  // another task opened in the same dialog – swap the content without echoing it back
  watch(model, value => {
    const current = editor.value

    if (current && value !== (current.isEmpty ? '' : current.getMarkdown())) {
      current.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
    }
  })
</script>

<style scoped>
.notes {
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--panel);
  transition: border-color .12s, box-shadow .12s;
}

.notes:hover {
  border-color: var(--text-3);
}

.notes--focus,
.notes--focus:hover {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.notes__bar {
  display: flex;
  gap: 2px;
  padding: 4px;
  border-bottom: 1px solid var(--line);
}

.notes__tool {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
}

.notes__tool svg {
  width: 15px;
  height: 15px;
}

.notes__tool:hover {
  background: var(--hover);
  color: var(--text);
}

.notes__tool[aria-pressed='true'] {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.notes__body {
  padding: 6px 10px;
  line-height: 1.4;
  color: var(--text-2);
}

.notes__body :deep(.tiptap) {
  /*
   * room for five lines, grows up to fifteen, then scrolls itself – and on a short screen stops
   * where the rest of the task dialog (about 570px) still fits, so only one thing scrolls
   */
  min-height: 5lh;
  max-height: max(5lh, min(15lh, 100dvh - 570px));
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong) transparent;
  outline: none;
  overflow-wrap: anywhere;
}

.notes__body :deep(.tiptap > * + *) {
  margin-top: 3px;
}

.notes__body :deep(p) {
  margin: 0;
}

.notes__body :deep(ul),
.notes__body :deep(ol) {
  margin: 0;
  padding-left: 22px;
}

.notes__body :deep(li > p) {
  margin: 0;
}

.notes__body :deep(strong) {
  color: var(--text);
  font-weight: 600;
}

.notes__body :deep(s) {
  color: var(--text-3);
}

.notes__body :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--hover);
  font-family: var(--mono);
  font-size: .9em;
}

.notes__body :deep(a) {
  color: var(--accent-text);
}

/* checklist: the box in place of the bullet, a done item struck through */
.notes__body :deep(ul[data-type='taskList']) {
  padding-left: 2px;
  list-style: none;
}

.notes__body :deep(ul[data-type='taskList'] > li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.notes__body :deep(ul[data-type='taskList'] > li > label) {
  flex: none;
  margin-top: 2px;
}

.notes__body :deep(ul[data-type='taskList'] > li > label input) {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.notes__body :deep(ul[data-type='taskList'] > li > div) {
  flex: 1;
  min-width: 0;
}

.notes__body :deep(li[data-checked='true'] > div) {
  color: var(--text-3);
  text-decoration: line-through;
}

.notes__body :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: var(--text-3);
  pointer-events: none;
}
</style>
