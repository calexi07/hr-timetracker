import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { UserProvider } from '@/components/UserContext'

export const metadata: Metadata = {
  title: 'Pontaj HR',
  description: 'Portal angajati Krka Romania',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <UserProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
        </UserProvider>
      </body>
    </html>
  )
}
