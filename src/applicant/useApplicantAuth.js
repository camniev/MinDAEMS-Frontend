import { useCallback, useContext, useEffect, useRef } from 'react'
import { AuthContext } from 'src/context/AuthContext'

// The applicant pages' view of the signed-in user.
//
// `authedFetch` is a fetch() that adds the user's access token. Three details
// matter:
//  - It always sends a VALID token. AuthContext swaps in a fresh access token every
//    14 minutes, but timers don't run while a laptop sleeps or a tab is in the
//    background, so the token in hand can already have expired. getAccessToken()
//    renews it first when it has expired or is about to.
//  - If the server still answers 401 (the token expired in flight, or another tab
//    refreshed first), it renews once and retries the request. A 401 means the request
//    was not processed, so retrying a save or a submit can't apply it twice. If the
//    session really is over, the 401 is returned and AuthContext signs the person out.
//  - Its identity never changes. If it did, every effect/callback that depends
//    on it would re-run on each token refresh — for the exam page that would
//    mean re-calling Start and overwriting unsaved answers with the server's
//    copy, in the middle of an exam. So the context values are read from a ref at
//    call time instead of being listed as dependencies.
export const useApplicantAuth = () => {
  const { user, authToken, logout, getAccessToken, refreshAccessToken } = useContext(AuthContext)

  const latest = useRef({ authToken, getAccessToken, refreshAccessToken })
  useEffect(() => {
    latest.current = { authToken, getAccessToken, refreshAccessToken }
  })

  const authedFetch = useCallback(async (url, init = {}) => {
    const send = (token) =>
      fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      })

    const current = latest.current
    const token = (await current.getAccessToken()) ?? current.authToken
    let response = await send(token)

    if (response.status === 401) {
      const fresh = await latest.current.refreshAccessToken()
      if (fresh) response = await send(fresh)
    }
    return response
  }, [])

  return { user, authedFetch, logout }
}