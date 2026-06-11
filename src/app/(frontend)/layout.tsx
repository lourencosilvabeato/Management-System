import React from 'react'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata = {
  description: 'Sistema de gestão de propostas — Niu / Innovagency',
  title: 'Niu — Propostas',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="pt" className="dark">
      <body>
        <QueryProvider>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  )
}
