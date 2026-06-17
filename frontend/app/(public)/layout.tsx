import '../globals.css';

export const metadata = {
  title: 'TicketBox Portal',
  description: 'Cổng thông tin và soát vé TicketBox',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
