import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { CSpinner } from '@coreui/react'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext)
  // const location = useLocation()

  if (loading) {
    return <CSpinner color="primary" variant="grow" />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

//   if (location.pathname === '/password-update' && !user.mustChangePasswordOnFirstLogin) {
//     return <Navigate to="/" />
//   }

//   if (user.mustChangePasswordOnFirstLogin) {
//     return <PasswordUpdate />
//   }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
}

ProtectedRoute.defaultProps = {
  allowedRoles: undefined,
}
export default ProtectedRoute
