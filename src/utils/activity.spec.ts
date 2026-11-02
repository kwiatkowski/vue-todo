import { describe, expect, it } from 'vitest'
import { describeChange } from './activity'

describe('describeChange', () => {
  it('names the status and priority as the app does', () => {
    expect(describeChange({ field: 'status', from: 'todo', to: 'doing' })).toEqual({ label: 'Status', from: 'Do zrobienia', to: 'W toku' })
    expect(describeChange({ field: 'priority', from: 'none', to: 'high' })).toEqual({ label: 'Priorytet', from: 'Brak', to: 'Wysoki' })
  })

  it('shows a missing value as a dash, no project as the inbox', () => {
    expect(describeChange({ field: 'time', from: null, to: '09:30' })).toEqual({ label: 'Godzina', from: '—', to: '09:30' })
    expect(describeChange({ field: 'projectId', from: 'Dom', to: null })).toEqual({ label: 'Projekt', from: 'Dom', to: 'Do posortowania' })
  })

  it('formats days and durations', () => {
    expect(describeChange({ field: 'due', from: '2026-11-02', to: null }).from).toMatch(/2 lis 2026/)
    expect(describeChange({ field: 'duration', from: 30, to: 90 })).toEqual({ label: 'Czas trwania', from: '30 min', to: '1 h 30 min' })
  })

  it('says only that the notes changed', () => {
    expect(describeChange({ field: 'notes', from: null, to: null })).toEqual({ label: 'Notatki', from: null, to: 'zmienione' })
  })
})
