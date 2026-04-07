import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

export const metadata: Metadata = {
  title: 'Dealer Panel',
  description: 'Telegram Mini App для дилеров Remnawave',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <Script id="miniapp-debug-overlay" strategy="beforeInteractive">
          {`
            (function () {
              function showDebug(message) {
                try {
                  var existing = document.getElementById('__miniapp_debug_overlay__');
                  if (existing) {
                    existing.textContent = message;
                    return;
                  }

                  var el = document.createElement('div');
                  el.id = '__miniapp_debug_overlay__';
                  el.style.position = 'fixed';
                  el.style.left = '12px';
                  el.style.right = '12px';
                  el.style.bottom = '12px';
                  el.style.zIndex = '999999';
                  el.style.padding = '12px';
                  el.style.borderRadius = '16px';
                  el.style.background = 'rgba(0,0,0,0.82)';
                  el.style.color = '#fff';
                  el.style.fontSize = '12px';
                  el.style.lineHeight = '1.45';
                  el.style.whiteSpace = 'pre-wrap';
                  el.style.wordBreak = 'break-word';
                  el.textContent = message;
                  document.addEventListener('DOMContentLoaded', function () {
                    document.body.appendChild(el);
                  });
                  setTimeout(function () {
                    if (!el.parentNode && document.body) {
                      document.body.appendChild(el);
                    }
                  }, 0);
                } catch (_) {}
              }

              window.addEventListener('error', function (event) {
                showDebug('window.error\\n' + (event.message || 'unknown error'));
              });

              window.addEventListener('unhandledrejection', function (event) {
                var reason = event.reason;
                var message =
                  reason && reason.message
                    ? reason.message
                    : typeof reason === 'string'
                      ? reason
                      : 'unknown rejection';
                showDebug('unhandledrejection\\n' + message);
              });

              window.__miniappDebug = {
                show: showDebug,
              };
            })();
          `}
        </Script>
        <AppErrorBoundary>
          <Providers>{children}</Providers>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
