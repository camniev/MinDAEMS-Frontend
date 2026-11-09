import { useCallback, useContext, useEffect, useRef } from 'react'
import { AuthContext } from 'src/context/AuthContext'

// The applicant pages' view of the signed-in user.
//
// `authedFetch` is a fetch() that adds the user's access token. Two details
// matter:
//  - It always sends the NEWEST token. AuthContext swaps in a fresh access
//    token every 14 minutes, and an exam can run longer than that.
//  - Its identity never changes. If it did, every effect/callback that depends
//    on it would re-run on each token refresh — for the exam page that would
//    mean re-calling Start and overwriting unsaved answers with the server's
//    copy, in the middle of an exam.
export const useApplicantAuth = () => {
  const { user, authToken, logout } = useContext(AuthContext)

  const tokenRef = useRef(authToken)
  useEffect(() => {
    tokenRef.current = authToken
  }, [authToken])

  const authedFetch = useCallback(
    (url, init = {}) =>
      fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${tokenRef.current}` },
      }),
    [],
  )

  return { user, authedFetch, logout }
}