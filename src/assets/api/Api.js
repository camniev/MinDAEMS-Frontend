// Shared by the applicant pages.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5026/api'

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'
const NO_ACCESS = "Your account doesn't have access to this."

// Pulls a readable message out of a failed response: the server's own
// { message }, ASP.NET's validation shape ({ title, errors: {...} }), or a
// plain-English line for the two auth failures, which usually have no body.
export const extractErrorMessage = async (response, fallback) => {
  if (response.status === 401) return SESSION_EXPIRED
  try {
    const data = await response.json()
    if (typeof data === 'string' && data.trim()) return data
    const firstFieldError = Object.values(data?.errors ?? {})[0]
    if (Array.isArray(firstFieldError) && firstFieldError.length) return firstFieldError[0]
    return data?.message || data?.title || fallback
  } catch {
    return response.status === 403 ? NO_ACCESS : fallback
  }
}

// `fetcher` is the authedFetch from useApplicantAuth.
export const sendJson = (fetcher, url, method, body) =>
  fetcher(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })