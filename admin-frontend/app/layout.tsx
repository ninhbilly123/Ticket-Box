import './globals.css';

export const metadata = {
  title: 'TicketBox - Cổng quản trị',
  description: 'Cổng quản trị và vận hành TicketBox',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
