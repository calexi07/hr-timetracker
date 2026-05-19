'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const LIMBI = [
  { code: 'ro', label: 'RO', flag: '🇷🇴' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'sl', label: 'SL', flag: '🇸🇮' },
]

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState('ro')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const cookie = document.cookie
    const match = cookie.match(/googtrans=\/ro\/([a-z]+)/)
    if (match) setCurrent(match[1])
    else setCurrent('ro')
  }, [])

  const switchLanguage = (code: string) => {
    if (code === current) return
    setCurrent(code)

    if (code === 'ro') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname
      window.location.reload()
      return
    }

    document.cookie = `googtrans=/ro/${code}; path=/`
    document.cookie = `googtrans=/ro/${code}; path=/; domain=${window.location.hostname}`
    window.location.reload()
  }

  if (!mounted) return null

  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      {LIMBI.map((limba, i) => (
        <button
          key={limba.code}
          onClick={() => switchLanguage(limba.code)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center',
            current === limba.code
              ? 'bg-blue-500 text-white'
              : 'text-blue-300 hover:bg-blue-800 hover:text-white'
          )}
          title={limba.label}
        >
          <span className="text-base leading-none">{limba.flag}</span>
          <span>{limba.label}</span>
        </button>
      ))}
    </div>
  )
}
