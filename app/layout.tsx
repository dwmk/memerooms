import type { Metadata, Viewport } from 'next'
import { Creepster, Orbitron, Bangers } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const creepster = Creepster({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-creepster'
})

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron'
})

const bangers = Bangers({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bangers'
})

export const metadata: Metadata = {
  title: 'MemeRooms - Escape the Backrooms',
  description: 'A thrilling browser game where you escape procedurally generated backrooms while being chased by nextbots. Features bhop mechanics, three unique game modes, and custom entity support.',
  generator: 'v0.app',
  keywords: ['game', 'backrooms', 'nextbot', 'horror', 'browser game', 'three.js'],
  authors: [{ name: 'Dewan Mukto' }],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${creepster.variable} ${orbitron.variable} ${bangers.variable}`}>
      <body className="antialiased bg-background overflow-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
