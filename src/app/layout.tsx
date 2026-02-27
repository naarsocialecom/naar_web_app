import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=lufga@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '608485085693451');
              fbq('track', 'PageView');
            `,
          }}
        />
        {/* End Meta Pixel Code */}
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
            <a href="https://naar.io" className="block h-8 w-auto" target="_blank" rel="noopener noreferrer">
              <img src="/logo.svg" alt="Naar" className="h-full w-auto" />
            </a>
          </div>
        </header>
        <main>
          <AuthProvider>{children}</AuthProvider>
        </main>
      </body>
    </html>
  );
}
