import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Pontaj HR',
  description: 'Portal angajați Krka Romania',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      </body>
    </html>
  )
}
