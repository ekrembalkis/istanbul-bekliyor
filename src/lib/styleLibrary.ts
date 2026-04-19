// Hybrid style library: localStorage + optional Supabase sync

import { supabase } from './supabase'
import type { PersonalityDNA } from './xquik'
import type { StyleFingerprint } from './styleFingerprint'

export interface StyleLibraryEntry {
  username: string
  category: string        // "siyasi", "mizah", "ciddi", "kampanya", "diger"
  notes: string
  isPinned: boolean
  lastUsedAt: string
  generatedCount: number
  topics: string[]        // frequently used topics
  personalityDNA?: PersonalityDNA
  styleSummary?: string
  fingerprint?: StyleFingerprint
  tweetsSinceSummary?: number
  tweetsSinceDNA?: number
  extractedTweetCount?: number
  dataQuality?: 'high' | 'medium' | 'low'
  topicCoverage?: Record<string, number>
  // Cached display data from last successful lookupUser — persists avatar
  // across sessions and transient Xquik failures. Avoids "E fallback" bug.
  profilePicture?: string
  displayName?: string
  profileFetchedAt?: string
}

const LIBRARY_KEY = 'ib_style_library'

// ── localStorage Layer ──

function getLocalLibrary(): StyleLibraryEntry[] {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]') } catch { return [] }
}

function setLocalLibrary(entries: StyleLibraryEntry[]) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries))
}

// ── Public API ──

export function getLibrary(): StyleLibraryEntry[] {
  return getLocalLibrary()
}

export function getEntry(username: string): StyleLibraryEntry | undefined {
  return getLocalLibrary().find(e => e.username === username)
}

export function saveEntry(entry: Partial<StyleLibraryEntry> & { username: string }) {
  const lib = getLocalLibrary()
  const idx = lib.findIndex(e => e.username === entry.username)

  const defaults: StyleLibraryEntry = {
    username: entry.username,
    category: 'diger',
    notes: '',
    isPinned: false,
    lastUsedAt: new Date().toISOString(),
    generatedCount: 0,
    topics: [],
  }
  const full: StyleLibraryEntry = {
    ...defaults,
    ...(idx >= 0 ? lib[idx] : {}),
    ...entry,
  }

  if (idx >= 0) {
    lib[idx] = full
  } else {
    lib.push(full)
  }
  setLocalLibrary(lib)
  syncToSupabase(full)
}

export function deleteEntry(username: string) {
  const lib = getLocalLibrary().filter(e => e.username !== username)
  setLocalLibrary(lib)
  deleteFromSupabase(username)
}

export function incrementGenerated(username: string) {
  const lib = getLocalLibrary()
  const entry = lib.find(e => e.username === username)
  if (entry) {
    entry.generatedCount++
    entry.lastUsedAt = new Date().toISOString()
    setLocalLibrary(lib)
    syncToSupabase(entry)
  }
}

export function addTopic(username: string, topic: string) {
  const lib = getLocalLibrary()
  const entry = lib.find(e => e.username === username)
  if (entry) {
    if (!entry.topics.includes(topic)) {
      entry.topics = [topic, ...entry.topics].slice(0, 10)
      setLocalLibrary(lib)
    }
  }
}

export function togglePin(username: string): boolean {
  const lib = getLocalLibrary()
  const entry = lib.find(e => e.username === username)
  if (entry) {
    entry.isPinned = !entry.isPinned
    setLocalLibrary(lib)
    syncToSupabase(entry)
    return entry.isPinned
  }
  return false
}

export function getPinnedStyles(): StyleLibraryEntry[] {
  return getLocalLibrary().filter(e => e.isPinned)
}

export const CATEGORIES = [
  { value: 'siyasi', label: 'Siyasi' },
  { value: 'mizah', label: 'Mizah' },
  { value: 'ciddi', label: 'Ciddi' },
  { value: 'kampanya', label: 'Kampanya' },
  { value: 'diger', label: 'Diger' },
] as const

// ── Supabase Sync (optional, fire-and-forget) ──

async function syncToSupabase(entry: StyleLibraryEntry) {
  if (!supabase) return
  try {
    await supabase.from('style_library').upsert({
      username: entry.username,
      category: entry.category,
      notes: entry.notes,
      is_pinned: entry.isPinned,
      last_used_at: entry.lastUsedAt,
      generated_count: entry.generatedCount,
      topics: entry.topics,
      personality_dna: entry.personalityDNA || null,
      style_summary: entry.styleSummary || null,
      fingerprint: entry.fingerprint || null,
      tweets_since_summary: entry.tweetsSinceSummary ?? 0,
      tweets_since_dna: entry.tweetsSinceDNA ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'username' })
  } catch { /* supabase optional */ }
}

async function deleteFromSupabase(username: string) {
  if (!supabase) return
  try {
    await supabase.from('style_library').delete().eq('username', username)
  } catch { /* supabase optional */ }
}

/** One-time sync from Supabase to localStorage (call on app mount) */
export async function syncFromSupabase() {
  if (!supabase) return
  try {
    const { data } = await supabase.from('style_library').select('*')
    if (data && data.length > 0) {
      const local = getLocalLibrary()
      for (const row of data) {
        const existing = local.find(e => e.username === row.username)
        // Supabase wins if newer
        if (!existing || new Date(row.updated_at) > new Date(existing.lastUsedAt)) {
          const idx = local.findIndex(e => e.username === row.username)
          const entry: StyleLibraryEntry = {
            username: row.username,
            category: row.category || 'diger',
            notes: row.notes || '',
            isPinned: row.is_pinned ?? false,
            lastUsedAt: row.last_used_at || row.updated_at,
            generatedCount: row.generated_count ?? 0,
            topics: row.topics || [],
            personalityDNA: row.personality_dna || undefined,
            styleSummary: row.style_summary || undefined,
            fingerprint: row.fingerprint || undefined,
            tweetsSinceSummary: row.tweets_since_summary ?? 0,
            tweetsSinceDNA: row.tweets_since_dna ?? 0,
          }
          if (idx >= 0) local[idx] = entry
          else local.push(entry)
        }
      }
      setLocalLibrary(local)
    }
  } catch { /* supabase optional */ }
}
