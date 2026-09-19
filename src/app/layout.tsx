import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Grelhas de Avaliação',
  description: 'Gestão de avaliação de turmas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
