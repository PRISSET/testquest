import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Wallet Dashboard',
  description: 'Deposit / withdraw and PnL tracking dashboard'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
