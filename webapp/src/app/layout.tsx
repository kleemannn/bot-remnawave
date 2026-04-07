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
              function setLoaderText(title, subtitle, debugLines) {
                try {
                  var titleEl = document.getElementById('miniapp-loader-title');
                  var subtitleEl = document.getElementById('miniapp-loader-subtitle');
                  var debugEl = document.getElementById('miniapp-loader-debug');

                  if (titleEl && title) {
                    titleEl.textContent = title;
                  }

                  if (subtitleEl && subtitle) {
                    subtitleEl.textContent = subtitle;
                  }

                  if (debugEl && debugLines && debugLines.length) {
                    debugEl.classList.remove('hidden');
                    debugEl.innerHTML = debugLines
                      .map(function (line) {
                        return '<p>' + String(line)
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;') + '</p>';
                      })
                      .join('');
                  }
                } catch (_) {}
              }

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

              function probe() {
                try {
                  var webApp = window.Telegram && window.Telegram.WebApp;
                  var initData = webApp && typeof webApp.initData === 'string' ? webApp.initData : '';
                  setLoaderText(
                    'Открываем панель…',
                    'Подключаем Telegram и загружаем ваши данные.',
                    [
                      'inline script: ok',
                      'document.readyState: ' + document.readyState,
                      'Telegram SDK: ' + (webApp ? 'есть' : 'нет'),
                      'initData length: ' + initData.length,
                      'location: ' + window.location.pathname + window.location.search,
                    ],
                  );

                  if (!window.__miniappAuthProbeStarted && initData) {
                    window.__miniappAuthProbeStarted = true;
                    fetch('/webapp/auth', {
                      method: 'POST',
                      headers: {
                        'content-type': 'application/json'
                      },
                      body: JSON.stringify({ initData: initData })
                    })
                      .then(function (response) {
                        setLoaderText(
                          'Проверяем авторизацию…',
                          'Mini App получил ответ от сервера.',
                          [
                            'inline script: ok',
                            'Telegram SDK: ' + (webApp ? 'есть' : 'нет'),
                            'initData length: ' + initData.length,
                            'auth status: ' + response.status,
                          ],
                        );
                      })
                      .catch(function (error) {
                        setLoaderText(
                          'Ошибка запроса авторизации',
                          'Не удалось обратиться к /webapp/auth.',
                          [
                            'inline script: ok',
                            'Telegram SDK: ' + (webApp ? 'есть' : 'нет'),
                            'initData length: ' + initData.length,
                            'auth error: ' + (error && error.message ? error.message : 'unknown'),
                          ],
                        );
                      });
                  }
                } catch (error) {
                  showDebug('probe error\\n' + (error && error.message ? error.message : String(error)));
                }
              }

              document.addEventListener('DOMContentLoaded', function () {
                probe();
                setTimeout(probe, 500);
                setTimeout(probe, 1500);
                setTimeout(probe, 3000);
              });
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
