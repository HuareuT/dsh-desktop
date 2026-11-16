/**
 * Shared Travel Buddy session verification.
 *
 * Mechanism A gates (admin console, account menu, profile management, desktop
 * settings) each need the verify result; this helper issues ONE request per
 * page load and caches the promise on `window`, so every consumer shares it.
 * Fail-closed: any failure resolves `undefined`, which every caller treats as
 * "no access".
 */

export interface TravelSession {
  ok: boolean
  user?: { username: string; name?: string; role?: string; plan?: string }
  plugins?: string[]
}

declare global {
  interface Window { __travelVerify?: Promise<TravelSession | undefined> }
}

export const TRAVEL_AUTH_BASE = 'http://127.0.0.1:8790'

export function travelSharedVerify(): Promise<TravelSession | undefined> {
  const token = new URLSearchParams(window.location.search).get('travel_token')
  if (!token) return Promise.resolve(undefined)
  if (!window.__travelVerify) {
    window.__travelVerify = fetch(`${TRAVEL_AUTH_BASE}/api/verify?token=${encodeURIComponent(token)}`)
      .then(response => (response.ok ? (response.json() as Promise<TravelSession>) : undefined))
      .catch(() => undefined)
  }
  return window.__travelVerify
}

export function travelIsSuperAdmin(): Promise<boolean> {
  return travelSharedVerify().then(data => data?.user?.role === 'super_admin')
}
