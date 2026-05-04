import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { UserProvider } from '@/components/UserContext'
import TermsGuard from '@/components/TermsGuard'

export const metadata: Metadata = {
  title: 'Pontaj HR',
  description: 'Portal angajati Krka Romania',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <UserProvider>
          <TermsGuard>
            {children}
          </TermsGuard>
          <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
        </UserProvider>
      </body>
    </html>
  )
}
