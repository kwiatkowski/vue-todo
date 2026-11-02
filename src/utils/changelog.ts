import source from '../../CHANGELOG.md?raw'

/** One day of changes – the day's version (RRRR.MM.DD) and what changed, each item as written (Markdown inline). */
export interface ChangelogDay {
  version: string
  items: string[]
}

/** The `## RRRR.MM.DD` sections of CHANGELOG.md, newest first as written; an item's next lines join it. */
export function parseChangelog (markdown: string): ChangelogDay[] {
  const days: ChangelogDay[] = []

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(\d{4}\.\d{2}\.\d{2})\s*$/)

    if (heading) {
      days.push({ version: heading[1] as string, items: [] })
      continue
    }

    const day = days.at(-1)

    if (!day) {
      continue
    }

    const item = line.match(/^[-*] (.*)$/)

    if (item?.[1]?.trim()) {
      day.items.push((item[1] as string).trim())
    } else if (line.trim() && day.items.length > 0) {
      day.items[day.items.length - 1] += ` ${line.trim()}`
    }
  }

  return days.filter(day => day.items.length > 0)
}

export const changelog: ChangelogDay[] = parseChangelog(source)

/** The bits of inline Markdown the items use – **bold** and `code` – as safe parts to render. */
export function inlineParts (text: string): Array<{ text: string, kind: 'text' | 'strong' | 'code' }> {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { text: part.slice(2, -2), kind: 'strong' as const }
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return { text: part.slice(1, -1), kind: 'code' as const }
    }

    return { text: part, kind: 'text' as const }
  })
}

/** "2026.11.02" → "2 listopada 2026" */
export function formatChangelogDay (version: string): string {
  const [year = 0, month = 1, day = 1] = version.split('.').map(Number)

  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}
