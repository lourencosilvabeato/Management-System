import React from 'react'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata = {
  description: 'Sistema de gestão de propostas',
  title: 'Propostas',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="pt">
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
