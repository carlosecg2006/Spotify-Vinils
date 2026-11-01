// Login com Spotify via Authorization Code + PKCE (só front-end, sem segredo).
import { load, save } from '../store.js';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'user-library-modify',
  'user-follow-read',
  'user-follow-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'ugc-image-upload',
].join(' ');

export function redirectUri() {
  const { origin, pathname } = window.location;
  return origin + pathname.replace(/index\.html$/, '');
}

export function getClientId() {
  return load('clientId', '') || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
}

export function setClientId(id) {
  save('clientId', id.trim());
}

function randomString(len = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256b64url(plain) {
  const data = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function beginLogin(clientId) {
  const verifier = randomString(64);
  const stateParam = randomString(16);
  sessionStorage.setItem('sv:pkce', JSON.stringify({ verifier, state: stateParam, clientId }));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await sha256b64url(verifier),
    state: stateParam,
  });
  window.location.assign(`${AUTH_URL}?${params}`);
}

function storeToken(json, clientId) {
  const token = {
    access: json.access_token,
    refresh: json.refresh_token || load('token', {})?.refresh,
    expires: Date.now() + (json.expires_in - 60) * 1000,
    clientId,
  };
  save('token', token);
  return token;
}

/** Se a URL voltou do Spotify com ?code=, troca pelo token. */
export async function handleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return null;
  const pkce = JSON.parse(sessionStorage.getItem('sv:pkce') || 'null');
  window.history.replaceState({}, '', redirectUri());
  if (error) throw new Error(`Spotify recusou o login: ${error}`);
  if (!pkce || pkce.state !== params.get('state')) throw new Error('Estado do login inválido. Tente de novo.');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: pkce.clientId,
      code_verifier: pkce.verifier,
    }),
  });
  if (!res.ok) throw new Error('Não consegui trocar o código pelo token (' + res.status + ').');
  sessionStorage.removeItem('sv:pkce');
  return storeToken(await res.json(), pkce.clientId);
}

let refreshing = null;

export async function getAccessToken() {
  const token = load('token', null);
  if (!token) return null;
  if (Date.now() < token.expires) return token.access;
  if (!token.refresh) return null;
  refreshing ??= (async () => {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh, client_id: token.clientId }),
    });
    refreshing = null;
    if (!res.ok) { logout(); return null; }
    return storeToken(await res.json(), token.clientId).access;
  })();
  return refreshing;
}

export function hasSession() {
  return !!load('token', null);
}

export function logout() {
  localStorage.removeItem('sv:token');
}
