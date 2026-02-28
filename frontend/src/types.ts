// Shared type definitions for the application

export type Parsed = {
  date: string
  weather: string
  occasion: string
  colorPreference: string
  comfortPreference: string
  thicknessPreference: string
}

export type Outfit = {
  index: number
  title: string
  description: string
  imageUrl: string
}

export type UserMessage = { role: 'user'; text: string }
export type AssistantMessage = { role: 'assistant'; parsed: Parsed | null; outfits: Outfit[]; error?: string }
