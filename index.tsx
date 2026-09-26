import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuctionProvider } from './contexts/AuctionContext';
import { HashRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuctionProvider>
        <App />
      </AuctionProvider>
    </HashRouter>
  </React.StrictMode>
);