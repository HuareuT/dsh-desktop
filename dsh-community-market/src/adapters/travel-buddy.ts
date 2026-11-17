import type { CatalogAdapter, CatalogFetchContext } from '../contracts/types.js'
import { standardHttpAdapter } from './standard-http.js'

/**
 * Travel Buddy private catalog adapter.
 *
 * Our backend speaks the standard catalog protocol (manifest.json + /v1/plugins),
 * so this adapter delegates to `standardHttpAdapter`. The only difference from a
 * user-added standard source is mechanical: built-in records carry no manifestUrl
 * by contract (validate.ts requires exactly one of manifestUrl/builtInProviderKey),
 * while the standard adapter needs one to fetch. We pin the manifest URL here and
 * inject it into the fetch context before delegating — mirroring how the upstream
 * partnership adapters keep their endpoints internal.
 */

export const TRAVEL_BUDDY_KEY = 'travel-buddy'
export const TRAVEL_BUDDY_MANIFEST_URL = 'https://work.tipsmuseum.com/manifest.json'
export const TRAVEL_BUDDY_ENDPOINT = TRAVEL_BUDDY_MANIFEST_URL
export const TRAVEL_BUDDY_PROVIDER_ID = 'dev.travelbuddy.market'
export const TRAVEL_BUDDY_ADAPTER_ID = 'market.travel-buddy-v1'

export const travelBuddyAdapter: CatalogAdapter = {
  adapterId: TRAVEL_BUDDY_ADAPTER_ID,
  async fetch(queryValue, context) {
    const pinnedContext: CatalogFetchContext = {
      ...context,
      source: { ...context.source, manifestUrl: TRAVEL_BUDDY_MANIFEST_URL },
    }
    return await standardHttpAdapter.fetch(queryValue, pinnedContext)
  },
}
