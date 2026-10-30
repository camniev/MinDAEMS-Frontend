import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import { ApplicantSessionProvider } from 'src/applicant/ApplicantSession'

// Layout for everything under /applicant. Deliberately separate from
// DefaultLayout: applicants get their own small header/menu instead of the
// HR sidebar, and this is the single place the applicant session provider
// lives (so every applicant page shares one source of truth for the email).
const ApplicantLayout = () => (
  <ApplicantSessionProvider>
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
        </CContainer>
      </CHeader>
      <CContainer lg className="pb-5">
        <Outlet />
      </CContainer>
    </div>
  </ApplicantSessionProvider>
)

export default ApplicantLayout
