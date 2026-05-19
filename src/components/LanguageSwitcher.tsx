'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

const LIMBI = [
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
]

export default function LanguageSwitcher() {
  const [current, setCurrent] = useState('ro')
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Detecteaza limba curenta din cookie Google Translate
    const cookie = document.cookie
    const match = cookie.match(/googtrans=\/ro\/([a-z]+)/)
    if (match) setCurrent(match[1])
    else setCurrent('ro')
  }, [])

  const switchLanguage = (code: string) => {
    setCurrent(code)
    setOpen(false)

    if (code === 'ro') {
      // Sterge cookie-ul Google Translate pentru a reveni la romana
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname
      window.location.reload()
      return
    }

    // Seteaza cookie Google Translate
    document.cookie = `googtrans=/ro/${code}; path=/`
    document.cookie = `googtrans=/ro/${code}; path=/; domain=${window.location.hostname}`
    window.location.reload()
  }

  if (!mounted) return null

  const currentLimba = LIMBI.find(l => l.code === current) || LIMBI[0]

  return (
    <div className="relative px-2 mb-1">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all',
          open ? 'bg-blue-800' : 'hover:bg-blue-800/50'
        )}
      >
        <span className="text-lg leading-none">{currentLimba.flag}</span>
        <span className="text-sm text-blue-200 font-medium flex-1 text-left">{currentLimba.label}</span>
        <ChevronDown
          size={14}
          className={cn('text-blue-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-blue-800 rounded-xl overflow-hidden shadow-xl border border-blue-700/50 z-50">
          {LIMBI.map(limba => (
            <button
              key={limba.code}
              onClick={() => switchLanguage(limba.code)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all',
                current === limba.code
                  ? 'bg-blue-500 text-white'
                  : 'text-blue-200 hover:bg-blue-700'
              )}
            >
              <span className="text-lg leading-none">{limba.flag}</span>
              <span className="font-medium">{limba.label}</span>
              {current === limba.code && (
                <span className="ml-auto text-xs bg-white/20 px-1.5 py-0.5 rounded-full">activ</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
