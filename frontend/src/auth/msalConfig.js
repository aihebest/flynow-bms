/**
 * msalConfig.js — Microsoft Authentication Library (MSAL) configuration.
 *
 * Staff sign in with their Microsoft 365 (Entra ID) credentials.
 * MSAL acquires an access token which is sent to the backend API
 * as  Authorization: Bearer <token>  on every request.
 */
export const msalConfig = {
  auth: {
    clientId:    import.meta.env.VITE_AZURE_CLIENT_ID,
    authority:   `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.hostname === 'localhost'
      ? `http://localhost:${window.location.port || 5173}`
      : 'https://www.nowtravelbms.com',
  },
  cache: {
    cacheLocation: 'sessionStorage', // Safer than localStorage for multi-tab use
    storeAuthStateInCookie: false,
  },
};

/**
 * The scope the frontend requests.
 * This must match the scope exposed by the backend App Registration.
 * Format: api://<backend-client-id>/<scope-name>
 */
export const loginRequest = {
  scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/BMS.Access`],
};
