import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

const AuthContext = createContext()

const getRefreshDelay = (token) => {
  const { exp } = jwtDecode(token)
  if (typeof exp !== 'number') return 4 * 60 * 1000

  return Math.max(exp * 1000 - Date.now() - 60 * 1000, 5 * 1000)
}

const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef(null)
  // The refresh currently running, if any. Everyone who asks meanwhile gets the same one
  // (and its result) instead of starting a second request or getting nothing back.
  const refreshPromise = useRef(null)
  // Always the latest token, for code that runs outside a render (timers, event handlers).
  const authTokenRef = useRef(null)

  const setUserFromToken = (token) => {
    const decodedToken = jwtDecode(token)
    const nextUser = {
      id: decodedToken.nameid,
      username: decodedToken.unique_name,
      fullname: decodedToken.given_name,
      email: decodedToken.email,
      role: decodedToken.role,
      mustChangePasswordOnFirstLogin: decodedToken.mustChangePasswordOnFirstLogin === 'true',
    }
    setUser(nextUser)
    return nextUser
  }

  // Resolves to the new access token, or null if there is no session / it couldn't be renewed.
  const refreshAccessToken = useCallback(() => {
    if (refreshPromise.current) return refreshPromise.current

    refreshPromise.current = (async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/Auth/refresh-token`,
          {},
          { withCredentials: true },
        )
        const newAccessToken = response.data.accessToken
        authTokenRef.current = newAccessToken
        setAuthToken(newAccessToken)
        setUserFromToken(newAccessToken)
        return newAccessToken
      } catch (error) {
        console.error('Failed to refresh access token: ', error)
        const status = error.response?.status
        if (status === 401 || status === 403) {
          // The server says this session is over (no or invalid cookie, expired, deactivated).
          authTokenRef.current = null
          setAuthToken(null)
          setUser(null)
        } else {
          // Network drop, 5xx, 429…: that says nothing about the session, so keep it and retry.
          // (Before, every 4xx — including 408/429 — signed the person out.)
          clearTimeout(refreshTimer.current)
          refreshTimer.current = setTimeout(refreshAccessToken, 15 * 1000)
        }
        return null
      } finally {
        refreshPromise.current = null
        setLoading(false)
      }
    })()

    return refreshPromise.current
  }, [])

  // A valid access token for a request that is about to be made: renews it first if it has
  // expired or is about to. Use this (and refreshAccessToken() after a 401) in authedFetch.
  const getAccessToken = useCallback(async () => {
    const token = authTokenRef.current
    if (!token) return null
    try {
      const { exp } = jwtDecode(token)
      if (typeof exp === 'number' && exp * 1000 - Date.now() > 30 * 1000) return token
    } catch {
      // unreadable token: fall through and renew it
    }
    return (await refreshAccessToken()) ?? null
  }, [refreshAccessToken])

  useEffect(() => {
    refreshAccessToken()
    return () => clearTimeout(refreshTimer.current)
  }, [refreshAccessToken])

  useEffect(() => {
    if (!authToken) return undefined

    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(refreshAccessToken, getRefreshDelay(authToken))
    return () => clearTimeout(refreshTimer.current)
  }, [authToken, refreshAccessToken])

  // Timers don't run while a laptop sleeps and are throttled in background tabs, so a token can
  // expire without the scheduled refresh ever firing. Check again whenever the person comes
  // back to the tab or the network returns.
  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState === 'hidden') return
      const token = authTokenRef.current
      if (!token) return
      try {
        const { exp } = jwtDecode(token)
        if (typeof exp !== 'number' || exp * 1000 - Date.now() < 2 * 60 * 1000) refreshAccessToken()
      } catch {
        refreshAccessToken()
      }
    }
    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)
    window.addEventListener('online', refreshIfStale)
    return () => {
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('focus', refreshIfStale)
      window.removeEventListener('online', refreshIfStale)
    }
  }, [refreshAccessToken])

  // useEffect(() => {
  //   console.log(user)
  // }, [user])

  const login = async (username, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/Auth/Login`,
        { username, password },
        { withCredentials: true },
      )
      const accessToken = response.data.accessToken
      authTokenRef.current = accessToken
      setAuthToken(accessToken)
      // Returned so the caller can send each role to its own home page.
      return setUserFromToken(accessToken)
    } catch (error) {
      throw error
    }
  }

  // const loginWithGoogle = async (code) => {
  //   try {
  //     //console.log('code from login.js: ', code)
  //     const response = await axios.post(
  //       `${import.meta.env.VITE_API_BASE_URL}Auth/google-login`,
  //       { googleCode: code },
  //       { withCredentials: true },
  //     )
  //     const newAccessToken = response.data.accessToken
  //     setAuthToken(newAccessToken)
  //     setUserFromToken(newAccessToken)
  //   } catch (error) {
  //     console.error('Google login failed: ', error.response.data)
  //     throw error
  //   }
  // }

  const logout = async () => {
    //console.log('Auth token for logging out: ' + authToken)
    try {
      // withCredentials: the server revokes the session using the refresh cookie, and the
      // browser only sends it (and honours the cookie deletion in the reply) with this set.
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/Auth/Logout`,
        {},
        { withCredentials: true },
      )
    } catch (error) {
      console.error('Logout failed: ', error)
    } finally {
      clearTimeout(refreshTimer.current)
      authTokenRef.current = null
      setAuthToken(null)
      setUser(null)
    }
  }

  const hasRole = (role) => {
    return user?.role === role
  }

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role)
  }

  return (
    <AuthContext.Provider
      value={{
        authToken,
        user,
        login,
        logout,
        loading,
        hasRole,
        hasAnyRole,
        refreshAccessToken,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export { AuthContext, AuthProvider }