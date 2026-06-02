import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/components/UserContext'
import TermsGuard from '@/components/TermsGuard'
import { Toaster } from 'react-hot-toast'
import RaportProblema from '@/components/RaportProblema'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pontaj HR — Krka Romania',
  description: 'Sistem de pontaj si management HR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <script
          type="text/javascript"
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          async
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'ro',
                  includedLanguages: 'ro,en,sl',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            .goog-te-banner-frame, .skiptranslate { display: none !important; }
            body { top: 0 !important; }
            .goog-te-gadget { font-size: 0 !important; }
            .goog-te-gadget select { display: none !important; }
          `
        }} />
      </head>
      <body className={inter.className}>
        <div id="google_translate_element" style={{ display: 'none' }} />
        <UserProvider>
          <TermsGuard>
            {children}
          </TermsGuard>
          <RaportProblema />
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </UserProvider>
      </body>
    </html>
  )
}
