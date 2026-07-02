import '../globals.css';
import CustomerHeader from '../../components/CustomerHeader';
import { AuthProvider } from '../../lib/auth-context';

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
      <body>
        <AuthProvider>
          <CustomerHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
