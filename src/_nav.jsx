import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilChartPie, cilNotes, cilPeople, cilPlus, cilMediaPlay } from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

/** Sidebar navigation for ExamSphere (built at render time so it can show live counts / open modals). */
const buildNav = ({ upcoming, openCreate, openPreview }) => [
  { component: CNavTitle, name: 'Core Management' },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Exam Schedules',
    to: '/schedules',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    badge: { color: 'primary', text: String(upcoming) },
  },
  {
    component: CNavItem,
    name: 'Question Builder',
    to: '/builder',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Examinees Directory',
    to: '/examinees',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  { component: CNavTitle, name: 'Quick Tools' },
  {
    component: CNavItem,
    name: 'New Schedule',
    onClick: openCreate,
    icon: <CIcon icon={cilPlus} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Student Exam Preview',
    onClick: () => openPreview(),
    icon: <CIcon icon={cilMediaPlay} customClassName="nav-icon" />,
  },
]

export default buildNav
