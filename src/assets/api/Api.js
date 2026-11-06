// Shared by the applicant pages that write data. (The older pages keep their
// own copies of these helpers; fold them in whenever you next touch them.)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5026/api'

// Pulls a readable message out of a failed response, including ASP.NET's
// validation-problem shape ({ title, errors: { Field: [..] } }) and the
// { message } objects the applicant endpoints return.
export const extractErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json()
    if (typeof data === 'string' && data.trim()) return data
    const firstFieldError = Object.values(data?.errors ?? {})[0]
    if (Array.isArray(firstFieldError) && firstFieldError.length) return firstFieldError[0]
    return data?.message || data?.title || fallback
  } catch {
    return fallback
  }
}

export const sendJson = (url, method, body) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })