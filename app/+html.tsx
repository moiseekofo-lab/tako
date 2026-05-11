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
    overflow-x: hidden;
    overflow-y: scroll;
    scrollbar-width: auto !important;
    scrollbar-color: rgba(6, 31, 104, 0.42) transparent !important;
  }

  * {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    scrollbar-width: auto !important;
    scrollbar-color: rgba(6, 31, 104, 0.42) transparent !important;
  }

  *::-webkit-scrollbar {
    width: 7px !important;
    height: 7px !important;
    display: block !important;
  }

  *::-webkit-scrollbar-track {
    background: transparent !important;
  }

  *::-webkit-scrollbar-thumb {
    background: rgba(6, 31, 104, 0.42) !important;
    border: 2px solid transparent;
    background-clip: padding-box;
    border-radius: 999px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(6, 31, 104, 0.72) !important;
  }

  input,
  textarea,
  select,
  button {
    font: inherit;
  }
`;
