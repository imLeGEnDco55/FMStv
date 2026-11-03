export interface Clip { name: string; duration: number; buffer: AudioBuffer; musicalDuration?: number }
export interface Cassette { id: string; title: string; intro: Clip; verses: Clip[]; breaks: Clip[]; outros: Clip[]; cover?: string; blockDuration: number; bpm: number; warnings: string[]; demo: boolean }
