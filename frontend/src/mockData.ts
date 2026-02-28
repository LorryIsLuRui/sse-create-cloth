// This file contains mock results for rapid UI development.
// When `useMock` is enabled in App.tsx, the application will bypass
// network requests and use these static values instead.

import { Parsed, Outfit } from './types'

export const mockParsed: Parsed = {
  date: '明天',
  weather: '阴冷,15度',
  occasion: '面试',
  colorPreference: '深色',
  comfortPreference: '',
  thicknessPreference: '轻薄',
}

export const mockOutfits: Outfit[] = [
  {
    index: 0,
    title: '商务休闲',
    description: '黑色羊毛衬衫、灰色裤子、黑色皮鞋',
    imageUrl: 'https://picsum.photos/seed/outfit1/400/400',
  },
  {
    index: 1,
    title: '深色 formal',
    description: 'navy蓝色西装、白色衬衫、黑色皮鞋',
    imageUrl: 'https://picsum.photos/seed/outfit2/400/400',
  },
  {
    index: 2,
    title: '休闲商务',
    description: '棕色薄羊毛衬衫、灰色裤子、黑色皮鞋',
    imageUrl: 'https://picsum.photos/seed/outfit3/400/400',
  },
  {
    index: 3,
    title: '休闲商务',
    description: '棕色薄羊毛衬衫、灰色裤子、黑色皮鞋',
    imageUrl: 'https://picsum.photos/seed/outfit4/400/400',
  },
]
