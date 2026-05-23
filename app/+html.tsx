import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#061F68" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TaKo" />
        <meta name="application-name" content="TaKo" />
        <meta
          name="description"
          content="TaKo, paiement transport en RDC par QR, NFC et mobile money."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alkatra:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
  html,
  body,
  #root {
    width: 100%;
    height: 100%;
    min-height: 100%;
    margin: 0;
    background: #F5F8FF;
    color: #202836;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overscroll-behavior-y: none;
    touch-action: manipulation;
  }

  body {
    overflow: hidden;
  }

  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }

  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    scrollbar-width: thin !important;
    scrollbar-color: rgba(120, 130, 150, 0.34) transparent !important;
  }

  *::-webkit-scrollbar {
    width: 5px !important;
    height: 5px !important;
    display: block !important;
  }

  *::-webkit-scrollbar-track {
    background: transparent !important;
  }

  *::-webkit-scrollbar-thumb {
    background: rgba(120, 130, 150, 0.34) !important;
    border: 0;
    border-radius: 999px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(120, 130, 150, 0.52) !important;
  }

  *::-webkit-scrollbar-button {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }

  input,
  textarea,
  select,
  button {
    font: inherit;
  }
`;

