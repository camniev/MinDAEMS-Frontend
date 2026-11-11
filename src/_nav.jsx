/**
 * Sidebar Navigation Configuration
 *
 * Defines the structure and content of the sidebar navigation menu.
 * Supports multiple navigation component types from CoreUI React:
 * - CNavItem: Single navigation link
 * - CNavGroup: Collapsible group of links
 * - CNavTitle: Section title/divider
 *
 * Role-based visibility
 * ----------------------
 * Each CNavItem/CNavGroup may include a `roles` array. If present, the item
 * is only shown when the current user's role is included in that array.
 * If `roles` is omitted, the item is visible to everyone (no restriction).
 *
 * CNavTitle entries don't need `roles` — getNav() automatically hides a
 * title if every item under it (until the next title) gets filtered out.
 *
 * Use getNav(userRole) to get the filtered menu to render, rather than
 * importing `_nav` directly.
 *
 * @module _nav
 */

import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilCalendar,
  cilChartPie,
  cilCursor,
  cilDescription,
  cilDrop,
  cilExternalLink,
  cilFile,
  cilMediaPlay,
  cilNotes,
  cilPencil,
  cilPeople,
  cilPlus,
  cilPuzzle,
  cilSpeedometer,
  cilStar,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBook,
  faBuilding,
  faBuildingColumns,
  faFileAlt,
  faFileInvoice,
  faFileLines,
  faList,
  faListCheck,
  faMagnifyingGlass,
  faMoneyCheck,
  faSquareCheck,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'

/**
 * All known roles, for reference.
 */
export const ROLES = {
  ADMIN: 'Administrator',
  PROCTOR: 'Proctor',
  CHECKER: 'Checker',
  APPLICANT: 'Applicant',
}

/**
 * Navigation menu structure array
 *
 * @type {Array<Object>}
 * @property {React.ComponentType} component - CoreUI nav component (CNavItem, CNavGroup, CNavTitle)
 * @property {string} name - Display text for the nav item
 * @property {string} [to] - Internal route path (for CNavItem with routing)
 * @property {string} [href] - External URL (for CNavItem with external links)
 * @property {React.ReactNode} [icon] - Icon element to display
 * @property {Array<string>} [roles] - Roles allowed to see this item. Omit for "everyone".
 * @property {Object} [badge] - Optional badge configuration
 * @property {string} badge.color - Badge color (info, danger, success, etc.)
 * @property {string} badge.text - Badge text content
 * @property {Array<Object>} [items] - Child items for CNavGroup
 */
const buildNav = ({ upcoming, openCreate, openPreview }) => [
  { component: CNavTitle, name: 'Core Management' },
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavItem,
    name: 'Exam Schedules',
    to: '/schedules',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    badge: { color: 'primary', text: String(upcoming) },
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavItem,
    name: 'Question Builder',
    to: '/builder',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavItem,
    name: 'Applicants Directory',
    to: '/applicants',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavItem,
    name: 'My Exam Schedules',
    to: '/applicant/schedules',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  { component: CNavTitle, name: 'Quick Tools' },
  {
    component: CNavItem,
    name: 'New Schedule',
    onClick: openCreate,
    icon: <CIcon icon={cilPlus} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavItem,
    name: 'Applicant Exam Preview',
    onClick: () => openPreview(),
    icon: <CIcon icon={cilMediaPlay} customClassName="nav-icon" />,
    roles: [ROLES.ADMIN, ROLES.PROCTOR],
  },
  {
    component: CNavTitle,
    name: 'User Management',
  },
  {
    component: CNavItem,
    name: 'User Accounts',
    to: '/user-management/user-accounts-list',
    icon: <FontAwesomeIcon icon={faUsers} className="me-2" />,
    roles: [ROLES.ADMIN],
  },
]


/**
 * Returns true if the given item should be visible for userRole.
 * Items with no `roles` key are visible to everyone.
 */
const isVisible = (item, userRole) => !item.roles || item.roles.includes(userRole)

/**
 * Recursively filters a nav item list for a given role.
 * - CNavItem: kept only if isVisible().
 * - CNavGroup: kept only if isVisible() AND it has at least one visible child
 *   after filtering (its `items` are replaced with the filtered list).
 * - CNavTitle: kept only if at least one non-title item follows it before
 *   the next title (so empty sections don't show a dangling header).
 */
export const getNav = (userRole, navItems = _nav) => {
  // First pass: filter items/groups by role (groups filtered recursively).
  const roleFiltered = navItems.reduce((acc, item) => {
    if (item.component === CNavTitle) {
      acc.push(item)
      return acc
    }

    if (!isVisible(item, userRole)) {
      return acc
    }

    if (item.component === CNavGroup && Array.isArray(item.items)) {
      const filteredChildren = getNav(userRole, item.items)
      if (filteredChildren.length === 0) {
        return acc // hide group entirely if nothing left inside it
      }
      acc.push({ ...item, items: filteredChildren })
      return acc
    }

    acc.push(item)
    return acc
  }, [])

  // Second pass: drop any CNavTitle that isn't followed by a real item
  // before either the next CNavTitle or the end of the list.
  return roleFiltered.filter((item, index) => {
    if (item.component !== CNavTitle) return true

    const next = roleFiltered[index + 1]
    return !!next && next.component !== CNavTitle
  })
}

export default buildNav
