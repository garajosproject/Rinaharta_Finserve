import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Providers from '@/app/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinServe OS',
  description: 'Fintech operations dashboard for leads, documents, notes, and issues.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
