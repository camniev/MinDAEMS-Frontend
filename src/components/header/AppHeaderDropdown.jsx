import { React, useContext } from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilSettings, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import avatar from './../../assets/images/avatars/default-prof-pic.jpg'
import { AuthContext } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const AppHeaderDropdown = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleViewProfile = () => {
    if (user?.id) {
      navigate(`/user-management/edit-user/${user?.id}`)
    } else {
      console.error('User ID not found.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.log('Error logging out.')
    }
  }
  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatar} size="md" />
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {user?.fullname || user?.username}
          <div className="small fw-normal text-body-secondary">{user?.role}</div>
        </CDropdownHeader>
        <CDropdownItem href="#" onClick={handleViewProfile}>
          <CIcon icon={cilUser} className="me-2" />
          Profile
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem href="#" onClick={handleLogout}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Log out
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}
  

export default AppHeaderDropdown
