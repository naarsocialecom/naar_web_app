import './globals.css';
import Link from 'next/link';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=lufga@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="bg-[rgb(63,240,255)] py-1 px-6 text-xs font-medium text-black overflow-hidden whitespace-nowrap">
          <div className="inline-flex animate-[marquee_12s_linear_infinite]">
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
            <span className="mx-6">• Install App • INR 200 OFF</span>
          </div>
        </nav>
        <header className="fixed top-6 left-0 right-0 z-10 bg-transparent">
          <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-center mt-6">
            <Link href="/" className="block h-8 w-auto">
              <img src="/logo.svg" alt="Naar" className="h-full w-auto" />
            </Link>
          </div>
        </header>
        <main>
          <AuthProvider>{children}</AuthProvider>
        </main>
      </body>
    </html>
  );
}
