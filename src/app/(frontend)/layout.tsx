import React from 'react'
import './globals.css'

export const metadata = {
  description: 'Sistema de gestão de propostas — Niu / Innovagency',
  title: 'Niu — Propostas',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="pt">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
