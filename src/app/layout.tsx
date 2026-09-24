import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Smart Grain Procurement System',
  description: 'Efficient grain procurement slot booking and real-time queue management for farmers — SIH Problem Statement 26032',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-gray-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
