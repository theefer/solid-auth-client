// @flow
import { authenticatedFetch } from './auth-fetch'
import type { session } from './session'
import { getSession, saveSession, clearSession } from './session'
import type { Storage } from './storage'
import { memStorage, defaultStorage } from './storage'
import { currentUrl } from './util'
import * as WebIdTls from './webid-tls'
import * as WebIdOidc from './webid-oidc'

export type authResponse =
  { session: ?session
  , fetch: fetch
  }

export type loginOptions = {
  redirectUri: ?string,
  storage: Storage
}

const defaultLoginOptions = (): loginOptions => {
  const url = currentUrl()
  return {
    redirectUri: url ? url.split('#')[0] : null,
    storage: defaultStorage()
  }
}

export const login = (idp: string, options: loginOptions): Promise<authResponse> => {
  options = { ...defaultLoginOptions(), ...options }
  return WebIdTls.login(idp)
    .then(session => session ? saveSession(options.storage, session) : null)
    .then(session => session
      ? { session, fetch: authenticatedFetch(session) }
      : WebIdOidc.login(idp, options)
    )
}

export const currentUser = (idp: string, options: { storage: Storage } = { storage: defaultStorage() }): Promise<authResponse> => {
  const session = getSession(options.storage, idp)
  if (session) {
    return Promise.resolve({ session, fetch: authenticatedFetch(session) })
  }
  return WebIdTls.login(idp)
    .then(session => session || WebIdOidc.currentUser(idp, options))
    .then(session => session ? saveSession(options.storage, session) : session)
    .then(session => ({ session, fetch: authenticatedFetch(session) }))
}

export const logout = (idp: string, options: { storage: Storage } = { storage: defaultStorage() }): Promise<void> =>
  Promise.resolve(getSession(options.storage, idp))
    .then(session => session && session.idToken && session.accessToken
      ? WebIdOidc.logout(idp, options)
      : null
    )
    .then(() => clearSession(options.storage, idp))
