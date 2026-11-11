import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import MUIDatatable from 'mui-datatables'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons'

import avatar from './../../../assets/images/avatars/default-prof-pic.jpg'

const getMuiTheme = () =>
  createTheme({
    typography: {
      fontFamily: 'Segoe UI',
    },
    components: {
      MuiTable: {
        styleOverrides: {
          border: '1px solid #E5EAEE',
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            padding: '8px 10px',
            color: '#8c95a8',
          },
          body: {
            padding: '15px 10px',
            color: '#303640',
          },
          footer: {
            height: '40px',
            margin: 'auto',
          },
        },
      },
    },
  })

const UserAccounts = () => {
  const [usersList, setUsersList] = useState([])
  const [activeNav, setActiveNav] = useState(1)
  const navigate = useNavigate()

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/User/GetAllUsers`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Network response was not OK.')
      }

      const data = await response.json()
      setUsersList(data)
    } catch (error) {
      console.error('Error fetching users data')
    }
  }

  useEffect(() => {
    fetchAllUsers()
  }, [])

  const handleAddUser = () => {
    navigate(`/user-management/view-user`)
  }

  const handleViewUser = (userId) => {
    navigate(`/user-management/edit-user/${userId}`)
  }

  // MUI datatable columns setup
  const columns = [
    {
      name: 'empName',
      label: 'EMPLOYEE',
      options: {
        filter: false,
        sort: false,
        setCellProps: () => ({ style: { width: '30%' } }),
        customBodyRender: (value, tableMeta) => {
          const userId = tableMeta.rowData[5]
          const position = tableMeta.rowData[6]
          const profilePic = tableMeta.rowData[7]
          return (
            <div className="emp-details-section">
              <img src={avatar} />
              <div className="muidt-multiple-lines-vertical">
                <p className="fw-bold">{value}</p>
                <p className="fw-bold muted-text">{position}</p>
              </div>
            </div>
          )
        },
      },
    },
    {
      name: 'userName',
      label: 'USERNAME',
      options: {
        filter: false,
        sort: false,
        setCellProps: () => ({ style: { width: '15%' } }),
        customBodyRender: (value) => <p className="fw-bold">{value}</p>,
      },
    },
    {
      name: 'userType',
      label: 'USER TYPE',
      options: {
        filter: true,
        sort: false,
        setCellProps: () => ({ style: { width: '15%' } }),
        customBodyRender: (value) => <p className="fw-bold">{value}</p>,
      },
    },
    {
      name: 'empEmail',
      label: 'EMAIL',
      options: {
        filter: false,
        sort: false,
        setCellProps: () => ({ style: { width: '20%' } }),
        customBodyRender: (value) => <p className="fw-bold">{value}</p>,
      },
    },
    {
      name: 'userStatus',
      label: 'STATUS',
      options: {
        filter: true,
        sort: false,
        setCellProps: () => ({ style: { width: '10%' } }),
        customBodyRender: (value) => (
          <p
            className={`d-inline-block px-2 ${value === true ? 'active-banner' : 'inactive-banner'}`}
          >
            {value === true ? 'Active' : 'Inactive'}
          </p>
        ),
      },
    },
    {
      name: 'userId',
      label: 'ACTION',
      options: {
        filter: false,
        sort: false,
        setCellProps: () => ({ style: { width: '10%' } }),
        customBodyRender: (value) => {
          return (
            <div>
              <CButton
                color="info"
                className="me-2 btn-datatable"
                onClick={() => handleViewUser(value)}
              >
                <FontAwesomeIcon icon={faEye} />
              </CButton>
            </div>
          )
        },
      },
    },
    {
      name: 'empPosition',
      label: 'Position',
      options: {
        display: false,
        filter: false,
        sort: false,
      },
    },
    {
      name: 'userProfilePic',
      label: 'Profile Picture',
      options: {
        display: false,
        filter: false,
        sort: false,
      },
    },
  ]

  // MUI Datatable options
  const options = {
    filterType: 'dropdown',
    elevation: 0,
  }

  if (!usersList) return <CSpinner color="dark" />

  return (
    <CRow className="user-accounts-list-component">
      <CCol xs={12}>
        <CRow className="mb-2 p-3">
          <CCol sm={5}>
            <h4 className="card-title mb-0">User Accounts</h4>
            <div className="small text-body-secondary">
              Create and manage user accounts for the MinDA Disbursements Module
            </div>
          </CCol>
          <CCol sm={7}>
            <CButton className="float-end btn-info-new" onClick={handleAddUser}>
              {/* <CIcon icon={cilPlus} className="me-2" /> */}
              <FontAwesomeIcon icon={faPlus} />
              &nbsp;Add User
            </CButton>
          </CCol>
        </CRow>
        <CCard className="mb-4 p-3">
          <CCardBody>
            <CRow>
              <CCol sm={12} className="lib-dt">
                <CNav variant="tabs" role="tablist">
                  <CNavItem>
                    <CNavLink active={activeNav === 1} onClick={() => setActiveNav(1)}>
                      <FontAwesomeIcon icon={faUsers} /> Users List
                    </CNavLink>
                  </CNavItem>
                </CNav>
                <CTabContent>
                  <CTabPane
                    role="tabpanel"
                    aria-labelledby="users-list-tab"
                    visible={activeNav === 1}
                  >
                    <ThemeProvider theme={getMuiTheme()}>
                      <MUIDatatable
                        title={''}
                        data={usersList.map((user) => ({
                          userId: user.userId,
                          userName: user.userName,
                          userProfilePic: user.profilePic,
                          empName: user.employee.empName,
                          empPosition: user.employee.position,
                          userType: user.userType.utDesc,
                          empEmail: user.employee.emailAddress,
                          userStatus: user.isActive,
                        }))}
                        columns={columns}
                        options={options}
                        className="p-3"
                      />
                    </ThemeProvider>
                  </CTabPane>
                </CTabContent>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default UserAccounts
