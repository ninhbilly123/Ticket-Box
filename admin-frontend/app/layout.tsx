import './globals.css';

export const metadata = {
  title: 'TicketBox Admin',
  description: 'TicketBox organizer and admin dashboard',
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

