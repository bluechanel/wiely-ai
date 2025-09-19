import './globals.css'
import '@llamaindex/chat-ui/styles/markdown.css'
import '@llamaindex/chat-ui/styles/pdf.css'
import '@llamaindex/chat-ui/styles/editor.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AuthContext from './context/AuthContext'
import { ThemeProvider } from 'next-themes'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wiley AI',
  description: 'A Chat AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthContext>
            {children}
          </AuthContext>
        </ThemeProvider>
      </body>
    </html>
  )
}
