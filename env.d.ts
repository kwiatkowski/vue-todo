/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** REST base for `npm run dev` without WordPress serving the shell, default /wp-json/todo/v1/ */
  readonly VITE_REST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
