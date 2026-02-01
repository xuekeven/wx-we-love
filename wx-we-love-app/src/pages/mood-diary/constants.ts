export const MOODS = [
  { id: 'tired', name: '心累', emoji: '😩' },
  { id: 'angry', name: '生气', emoji: '😠' },
  { id: 'excited', name: '兴奋', emoji: '🤩' },
  { id: 'heartbeat', name: '心动', emoji: '💗' },
  { id: 'happy', name: '开心', emoji: '😊' },
  { id: 'sad', name: '伤心', emoji: '😢' },
  { id: 'calm', name: '平静', emoji: '😌' },
  { id: 'annoyed', name: '烦躁', emoji: '😤' },
] as const

export type MoodId = typeof MOODS[number]['id']
