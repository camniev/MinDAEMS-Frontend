import { useCallback, useContext, useEffect, useRef } from 'react'
import { AuthContext } from 'src/context/AuthContext'

// A fetch() that signs the request with the logged-in user's access token. Same behaviour as
// useApplicantAuth's authedFetch, for staff screens (Checking & Grading, printing, checker
// assignment): it sends a VALID token (renewed first if it has expired), retries ONCE after a 401,
// and keeps the same identity forever so effects that depend on it don't re-run on every refresh.
//
// Put it at src/context/useAuthedFetch.js.
export const useAuthedFetch = () => {
  const { authToken, getAccessToken, refreshAccessToken } = useContext(AuthContext)

  const latest = useRef({ authToken, getAccessToken, refreshAccessToken })
  useEffect(() => {
    latest.current = { authToken, getAccessToken, refreshAccessToken }
  })

  const authedFetch = useCallback(async (url, init = {}) => {
    const send = (token) =>
      fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })

    const current = latest.current
    let response = await send((await current.getAccessToken()) ?? current.authToken)

    if (response.status === 401) {
      const fresh = await latest.current.refreshAccessToken()
      if (fresh) response = await send(fresh)
    }
    return response
  }, [])

  return { authedFetch }
}