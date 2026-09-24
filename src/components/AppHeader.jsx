import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CButton,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CFormInput,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CInputGroup,
  CInputGroupText,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilContrast, cilMagnifyingGlass, cilMenu, cilMoon, cilPlus, cilSun } from '@coreui/icons'

import { AppHeaderDropdown } from './index'
import { useExam } from '../exam/ExamContext'
import { routes } from '../routes'

const THEMES = [
  ['light', 'Light', cilSun],
  ['dark', 'Dark', cilMoon],
  ['auto', 'Auto', cilContrast],
]

const AppHeader = () => {
  const headerRef = useRef()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { pathname } = useLocation()
  const { search, setSearch, openCreate } = useExam()
  const page = routes.find((r) => r.path === pathname) || routes[1]

  useEffect(() => {
    const onScroll = () =>
      headerRef.current?.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    document.addEventListener('scroll', onScroll)
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <div className="ms-2 me-auto">
          <h5 className="mb-0 lh-sm">{page.name}</h5>
          <div className="small text-body-secondary d-none d-sm-block">{page.subtitle}</div>
        </div>
        <CInputGroup size="sm" className="d-none d-md-flex w-auto me-3">
          <CInputGroupText>
            <CIcon icon={cilMagnifyingGlass} size="sm" />
          </CInputGroupText>
          <CFormInput
            placeholder="Search exams, subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
        </CInputGroup>
        <CButton color="primary" size="sm" onClick={openCreate}>
          <CIcon icon={cilPlus} className="me-1" />{' '}
          <span className="d-none d-sm-inline">Create Exam</span>
        </CButton>
        <CHeaderNav>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false}>
              <CIcon icon={THEMES.find(([k]) => k === colorMode)?.[2] || cilSun} size="lg" />
            </CDropdownToggle>
            <CDropdownMenu>
              {THEMES.map(([key, label, icon]) => (
                <CDropdownItem
                  key={key}
                  active={colorMode === key}
                  className="d-flex align-items-center"
                  as="button"
                  type="button"
                  onClick={() => setColorMode(key)}
                >
                  <CIcon className="me-2" icon={icon} size="lg" /> {label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
