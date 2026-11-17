/**
 * Travel Buddy session role check for the market client (fork addition).
 *
 * Same shared per-page-load verify cache as the plugin copies
 * (window.__travelVerify). Fail-closed: any failure resolves `undefined`,
 * which callers treat as "no access".
 */

export interface TravelSession {
  ok: boolean
  user?: { username: string; name?: string; role?: string; plan?: string }
  plugins?: string[]
}

const TRAVEL_AUTH_BASE = 'https://work.tipsmuseum.com'

type TravelWindow = Window & { __travelVerify?: Promise<TravelSession | undefined> }

export function travelSharedVerify(): Promise<TravelSession | undefined> {
  const token = new URLSearchParams(window.location.search).get('travel_token')
  if (!token) return Promise.resolve(undefined)
  const w = window as TravelWindow
  if (!w.__travelVerify) {
    w.__travelVerify = fetch(`${TRAVEL_AUTH_BASE}/api/verify?token=${encodeURIComponent(token)}`)
      .then(response => (response.ok ? (response.json() as Promise<TravelSession>) : undefined))
      .catch(() => undefined)
  }
  return w.__travelVerify
}
