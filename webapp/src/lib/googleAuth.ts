const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke(token: string, callback: () => void): void;
        };
      };
    };
  }
}

let accessToken: string | null = null;
let tokenExpiry = 0;

function waitForGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (tries > 100) {
        clearInterval(timer);
        reject(new Error('Google Identity Services failed to load'));
      }
    }, 100);
  });
}

export function isGoogleSyncConfigured(): boolean {
  return !!CLIENT_ID;
}

export function hasValidToken(): boolean {
  return !!accessToken && Date.now() < tokenExpiry;
}

export async function requestAccessToken(interactive: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  if (hasValidToken()) return accessToken!;

  await waitForGis();

  const tokenPromise = new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'No access token returned'));
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + 55 * 60 * 1000;
        resolve(accessToken);
      },
    });
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
  });

  if (interactive) return tokenPromise;

  const timeout = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Silent token request timed out (not signed in)')), 8000)
  );
  return Promise.race([tokenPromise, timeout]);
}

export function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenExpiry = 0;
}
