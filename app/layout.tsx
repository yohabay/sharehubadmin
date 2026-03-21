import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShareHub Admin Panel',
  description: 'Admin panel for ShareHub mobile app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  )
}
