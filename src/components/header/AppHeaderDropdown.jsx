import React from 'react'
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

import avatar from './../../assets/images/avatars/8.jpg'

const AppHeaderDropdown = () => (
  <CDropdown variant="nav-item">
    <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
      <CAvatar src={avatar} size="md" />
    </CDropdownToggle>
    <CDropdownMenu className="pt-0" placement="bottom-end">
      <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
        Dr. Sarah Jenkins
        <div className="small fw-normal text-body-secondary">Head of Examinations</div>
      </CDropdownHeader>
      <CDropdownItem href="#">
        <CIcon icon={cilUser} className="me-2" />
        Profile
      </CDropdownItem>
      <CDropdownItem href="#">
        <CIcon icon={cilSettings} className="me-2" />
        Settings
      </CDropdownItem>
      <CDropdownDivider />
      <CDropdownItem href="#">
        <CIcon icon={cilAccountLogout} className="me-2" />
        Log out
      </CDropdownItem>
    </CDropdownMenu>
  </CDropdown>
)

export default AppHeaderDropdown
