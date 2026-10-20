/**
 * Runtime config. In production WordPress (wp-plugin-todo) injects `window.__TODO__` into index.html,
 * so the bundle itself holds no URLs, nonces or secrets. In `npm run dev` the defaults below apply.
 */

export interface AppConfig {
  restUrl: string
  nonce: string | null
  nonceUrl: string | null
  basePath: string
  user: { name: string, avatar: string } | null
  logoutUrl: string | null
  adminUrl: string | null
  version: string | null
}

declare global {
  interface Window {
    __TODO__?: Partial<AppConfig>
  }
}

const injected: Partial<AppConfig> = (typeof window === 'undefined' ? undefined : window.__TODO__) ?? {}

export const config: AppConfig = {
  restUrl: injected.restUrl ?? import.meta.env.VITE_REST_URL ?? '/wp-json/todo/v1/',
  nonce: injected.nonce ?? null,
  nonceUrl: injected.nonceUrl ?? null,
  basePath: injected.basePath ?? import.meta.env.BASE_URL,
  user: injected.user ?? null,
  logoutUrl: injected.logoutUrl ?? null,
  adminUrl: injected.adminUrl ?? null,
  version: injected.version ?? null,
}
