import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TicketBox - Đặt vé concert dễ dàng',
  description: 'Platform đặt vé concert trực tuyến số 1 tại Việt Nam. Tìm, đặt và mua vé concert yêu thích của bạn.',
  generator: 'v0.app',
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
  colorScheme: 'light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6C47FF' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <TooltipProvider>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </TooltipProvider>
      </body>
    </html>
  )
}
