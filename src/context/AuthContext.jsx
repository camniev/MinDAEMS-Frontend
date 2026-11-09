import React, { createContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { jwtDecode } from 'jwt-decode'
import axios from 'axios'

const AuthContext = createContext()

const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const refreshAccessToken = async () => {
      try {
        // const hasRefreshToken = document.cookie.includes('refreshToken=')
        // if (!hasRefreshToken) {
        //   setLoading(false)
        //   return
        // }
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
        setAuthToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    // Attempt to refresh access token on load
    refreshAccessToken()

    const interval = setInterval(refreshAccessToken, 14 * 60 * 1000) // Refresh access token every 14 minutes
    return () => clearInterval(interval)
  }, [])

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
