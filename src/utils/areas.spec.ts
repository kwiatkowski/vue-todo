import type { Area } from '@/types'
import { describe, expect, it } from 'vitest'
import { AREA_ICONS, areaIcon } from './areaIcons'
import { compareByPosition, moveItem } from './areas'

const area = (id: number, name: string, position: number | null): Area => ({ id, name, position, icon: null })

describe('compareByPosition', () => {
  it('follows the position, unplaced last by name', () => {
    const list = [area(1, 'Dom', null), area(2, 'Praca', 1), area(3, 'Hobby', 0), area(4, 'Auto', null)]

    expect(list.toSorted(compareByPosition).map(item => item.name)).toEqual(['Hobby', 'Praca', 'Auto', 'Dom'])
  })
})

describe('moveItem', () => {
  it('moves up, down and clamps', () => {
    expect(moveItem([1, 2, 3], 3, 0)).toEqual([3, 1, 2])
    expect(moveItem([1, 2, 3], 1, 2)).toEqual([2, 3, 1])
    expect(moveItem([1, 2, 3], 1, 99)).toEqual([2, 3, 1])
    expect(moveItem([1, 2, 3], 7, 0)).toEqual([1, 2, 3])
  })
})

describe('areaIcon', () => {
  it('takes the chosen icon, else guesses from the name', () => {
    expect(AREA_ICONS).toHaveLength(50)
    expect(new Set(AREA_ICONS.map(item => item.key)).size).toBe(50)
    expect(areaIcon({ name: 'Cokolwiek', icon: 'rocket' })).toBe(AREA_ICONS.find(item => item.key === 'rocket')!.icon)
    expect(areaIcon({ name: 'Praca', icon: null })).toBe(AREA_ICONS.find(item => item.key === 'briefcase')!.icon)
    expect(areaIcon({ name: 'Dom', icon: 'nieznana' })).toBe(AREA_ICONS.find(item => item.key === 'house')!.icon)
    expect(areaIcon({ name: 'Hobby', icon: null })).toBe(AREA_ICONS.find(item => item.key === 'folder')!.icon)
  })
})
