import React, { useContext } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CButton,
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import { AuthContext } from 'src/context/AuthContext'

// Layout for everything under /applicant (the route itself is wrapped in
// <ProtectedRoute allowedRoles={[ROLES.APPLICANT]}> in App.jsx). Deliberately
// separate from DefaultLayout: applicants get their own small header/menu
// instead of the HR sidebar.
const ApplicantLayout = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-vh-100 bg-body-tertiary">
      <CHeader position="sticky" className="mb-4 p-0">
        <CContainer className="border-bottom px-4" fluid>
          <CHeaderBrand as="span" className="fw-bold">
            MinDA Examination Management System
          </CHeaderBrand>
          <CHeaderNav className="me-auto ms-4">
            <CNavItem>
              <CNavLink as={NavLink} to="/applicant/schedules">
                My Exam Schedules
              </CNavLink>
            </CNavItem>
          </CHeaderNav>
          <div className="d-flex align-items-center gap-3">
            <span className="small text-body-secondary d-none d-sm-inline">
              {user?.fullname || user?.username}
            </span>
            <CButton color="secondary" variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </CButton>
          </div>
        </CContainer>
      </CHeader>
      <CContainer lg className="pb-5">
        <Outlet />
      </CContainer>
    </div>
  )
}

export default ApplicantLayout
