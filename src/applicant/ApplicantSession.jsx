import React, { createContext, useContext, useState } from 'react'
import PropTypes from 'prop-types'

// NOT real authentication — this is a lightweight "who are you" identifier,
// consistent with the rest of the app's current lack of auth (even the HR
// side has none yet). Anyone who knows an applicant's email can see that
// applicant's schedule through this. Fine for "view my upcoming exams";
// revisit before this gates anything more sensitive (actually taking an
// exam, seeing a final score).
const STORAGE_KEY = 'minda-es:applicant-email'

// TEMPORARY — same idea as the hardcoded USER_ID in Schedules.jsx. Skips the
// identity gate so the schedules-listing facility itself can be exercised
// before real login/auth exists. Remove this fallback (and the "Switch
// email" button stops being needed for testing) once that's built.
const TEMP_APPLICANT_EMAIL = 'cameron.nieve@minda.gov.ph'

const ApplicantSessionContext = createContext(null)
export const useApplicantSession = () => {
  const ctx = useContext(ApplicantSessionContext)
  if (!ctx) {
    throw new Error('useApplicantSession must be used inside an <ApplicantSessionProvider>.')
  }
  return ctx
}

const readStoredEmail = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || TEMP_APPLICANT_EMAIL
  } catch {
    // localStorage can be unavailable (private browsing, etc.) — falls back
    // to the temp email directly rather than failing identification.
    return TEMP_APPLICANT_EMAIL
  }
}

export const ApplicantSessionProvider = ({ children }) => {
  const [email, setEmailState] = useState(readStoredEmail)

  const setEmail = (value) => {
    setEmailState(value)
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // see readStoredEmail — non-fatal if storage isn't available
    }
  }

  const value = { email, setEmail, isIdentified: Boolean(email) }
  return <ApplicantSessionContext.Provider value={value}>{children}</ApplicantSessionContext.Provider>
}

ApplicantSessionProvider.propTypes = { children: PropTypes.node }
