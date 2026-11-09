import React, { useContext } from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { CButton, CSpinner } from '@coreui/react'
import { homePathForRole } from '../constants/roles'

// Shown only when a signed-in user's role isn't allowed here AND there's
// nowhere better to send them (their own home is where they already are).
const AccessDenied = ({ onSignOut }) => (
  <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center p-4">
    <h4>You don&apos;t have access to this page</h4>
    <p className="text-body-secondary">
      Your account&apos;s role isn&apos;t allowed here. If you think this is a mistake, please
      contact the administrator.
    </p>
    <CButton color="primary" variant="outline" onClick={onSignOut}>
      Sign out
    </CButton>
  </div>
)

AccessDenied.propTypes = { onSignOut: PropTypes.func }

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useContext(AuthContext)
  const location = useLocation()

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
    // Send them to the part of the app that IS theirs. Sending everyone to "/"
    // would bounce an applicant into the HR shell, which would send them
    // straight back here — an endless redirect.
    const home = homePathForRole(user.role)
    if (home !== location.pathname) return <Navigate to={home} replace />
    return <AccessDenied onSignOut={logout} />
  }

  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
}

ProtectedRoute.defaultProps = {
  allowedRoles: undefined,
}
export default ProtectedRoute
