import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { msalConfig } from './auth/msalConfig';
import './index.css';

// Export MSAL instance so api/index.js can use it for silent token refresh
export const msalInstance = new PublicClientApplication(msalConfig);

await msalInstance.initialize();

// Handle redirect response after returning from Microsoft login
await msalInstance.handleRedirectPromise();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          }}
        />
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>
);
