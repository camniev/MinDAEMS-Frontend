/**
 * AppSidebar Component
 *
 * Collapsible navigation sidebar with branding, menu items, and toggle controls.
 *
 * Features:
 * - Redux-controlled visibility state
 * - Unfoldable/narrow mode for more screen space
 * - Brand logo with full and narrow variants
 * - Close button for mobile devices
 * - Footer with toggle button
 * - Dark color scheme
 * - Fixed positioning
 *
 * @component
 * @example
 * return (
 *   <AppSidebar />
 * )
 */

import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import { cilEducation } from '@coreui/icons'
import { CAvatar } from '@coreui/react'
import { useExam } from '../exam/ExamContext'
import buildNav from '../_nav'
import avatar from 'src/assets/images/avatars/8.jpg'

/**
 * AppSidebar functional component
 *
 * Manages sidebar state with Redux:
 * - sidebarShow: Controls sidebar visibility
 * - sidebarUnfoldable: Controls narrow/wide mode
 *
 * Renders navigation from _nav.js configuration file.
 * Memoized to prevent unnecessary re-renders.
 *
 * @returns {React.ReactElement} Sidebar with navigation
 */
const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { exams, openCreate, openPreview } = useExam()
  const navigation = buildNav({
    upcoming: exams.filter((e) => e.status === 'Upcoming').length,
    openCreate,
    openPreview,
  })

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <span className="sidebar-brand-full d-flex align-items-center gap-2">
            <CIcon icon={cilEducation} height={28} className="text-primary" />
            <span className="text-start lh-1">
              <span className="d-block fw-bold fs-5">ExamSphere</span>
              <small className="text-primary text-uppercase" style={{ fontSize: 10 }}>
                Admin Portal
              </small>
            </span>
          </span>
          <CIcon customClassName="sidebar-brand-narrow" icon={cilEducation} height={28} />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      <div className="border-top p-3 d-flex align-items-center gap-2 sidebar-brand-full">
        <CAvatar src={avatar} size="md" />
        <div className="text-truncate">
          <div className="small fw-semibold text-white">Dr. Sarah Jenkins</div>
          <div className="small text-body-secondary">Head of Examinations</div>
        </div>
      </div>
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
