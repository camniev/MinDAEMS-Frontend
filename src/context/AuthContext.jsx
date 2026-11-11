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
  const refreshInProgress = useRef(false)

  const setUserFromToken = (token) => {
    const decodedToken = jwtDecode(token)
    const nextUser = {
      id: decodedToken.nameid,
      username: decodedToken.unique_name,
      fullname: decodedToken.given_name,
      role: decodedToken.role,
      mustChangePasswordOnFirstLogin: decodedToken.mustChangePasswordOnFirstLogin === 'true',
    }
    setUser(nextUser)
    return nextUser
  }

  const refreshAccessToken = useCallback(async () => {
    if (refreshInProgress.current) return

    refreshInProgress.current = true
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/Auth/refresh-token`,
        {},
        { withCredentials: true },
      )
      const newAccessToken = response.data.accessToken
      setAuthToken(newAccessToken)
      setUserFromToken(newAccessToken)
    } catch (error) {
      console.error('Failed to refresh access token: ', error)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        setAuthToken(null)
        setUser(null)
      } else {
        refreshTimer.current = setTimeout(refreshAccessToken, 30 * 1000)
      }
    } finally {
      refreshInProgress.current = false
      setLoading(false)
    }
  }, [])

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
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/Auth/Logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      )
    } catch (error) {
      console.error('Logout failed: ', error)
    } finally {
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
    <AuthContext.Provider value={{ authToken, user, login, logout, loading, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export { AuthContext, AuthProvider }
