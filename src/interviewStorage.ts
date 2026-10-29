import { useEffect, useState } from 'react'

export const INTERVIEW_PREFIX = 'ml-quest-interview-v1:'

export function readInterviewValue(key: string, fallback = '') {
  try { return localStorage.getItem(INTERVIEW_PREFIX + key) ?? fallback } catch { return fallback }
}

/** One key per artifact avoids overwriting unrelated work from another tab. */
export function useInterviewValue(key: string, fallback = '') {
  const [value, setValue] = useState(() => readInterviewValue(key, fallback))
  const [unsaved, setUnsaved] = useState(false)
  useEffect(() => {
    setValue(readInterviewValue(key, fallback))
    setUnsaved(false)
    const sync = (event: StorageEvent) => {
      if (event.key === INTERVIEW_PREFIX + key || event.key === null) setValue(readInterviewValue(key, fallback))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key, fallback])
  const save = (next: string) => {
    setValue(next)
    try { localStorage.setItem(INTERVIEW_PREFIX + key, next); setUnsaved(false) }
    catch { setUnsaved(true) }
  }
  return [value, save, unsaved] as const
}

export function downloadInterviewNotebook() {
  const artifacts: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(INTERVIEW_PREFIX)) artifacts[key.slice(INTERVIEW_PREFIX.length)] = localStorage.getItem(key) ?? ''
    }
  } catch { return false }
  const url = URL.createObjectURL(new Blob([JSON.stringify({ course: 'ML Quest interview refresher', version: 1, exportedAt: new Date().toISOString(), artifacts }, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'ml-quest-interview-notebook.json'; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
