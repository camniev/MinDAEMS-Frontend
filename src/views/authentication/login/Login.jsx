import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
//import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from 'src/context/AuthContext'
import { useToast } from 'src/context/ToastContext'
import { homePathForRole } from 'src/constants/roles'
//import { useGoogleLogin } from '@react-oauth/google'

const Login = () => {
  const [username, setUsername] = useState(null)
  const [password, setPassword] = useState(null)
  const { login } = useContext(AuthContext)
  const notify = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const loggedInUser = await login(username, password)
      notify('Login successful.', 'success')
      navigate(homePathForRole(loggedInUser.role))
    } catch (error) {
      // error.response is undefined when the server can't be reached at all.
      const reason = error.response?.data?.message ?? 'Unable to reach the server. Please try again.'
      notify('Login failed: ' + reason, 'error')
    }
  }

  // const handleGoogleLogin = useGoogleLogin({
  //   onSuccess: async (response) => {
  //     try {
  //       const googleCode = response.code
  //       await loginWithGoogle(googleCode)
  //       navigate('/')
  //     } catch (error) {
  //       console.error('Google login failed', error)
  //     }
  //   },
  //   onError: (errorResponse) => {
  //     console.error('Google login failed: ', errorResponse)
  //   },
  //   scope: 'openid profile email',
  //   flow: 'auth-code',
  // })

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup className="mindaam-login-card-group">
              <div className="left-pane text-white bg-primary py-5">
                <CCardBody className="text-center">
                  <div>
                    <div className="minda-logo"></div>
                    <h3 className="fw-bold mt-4">MinDA Examination Management System</h3>
                  </div>
                </CCardBody>
              </div>
              <CCard className="right-pane p-5">
                <CCardBody>
                  <CForm onSubmit={handleSubmit}>
                    <h2 className="fw-bold">Login</h2>
                    <p className="text-body-secondary muted-text mt-4 fw-bold">
                      Welcome! Please login using your account details.
                    </p>
                    <CInputGroup className="mb-3 mt-2">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        type="text"
                        name="username"
                        placeholder="Username"
                        autoComplete="username"
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </CInputGroup>
                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        name="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </CInputGroup>
                    <CRow>
                      <CCol xs={12}>
                        <CButton type="submit" color="btn btn-info-new mt-2" className="px-4">
                          <FontAwesomeIcon icon={faRightToBracket} /> Login
                        </CButton>
                      </CCol>
                    </CRow>
                    {/* <CRow>
                      <CCol xs={12}>
                        <div className="strike">
                          <span>or</span>
                        </div>
                      </CCol>
                    </CRow> */}
                    {/* <CRow>
                      <CCol xs={12}>
                        <CButton
                          onClick={handleGoogleLogin}
                          color="btn btn-info-rev-new mt-2"
                          className="px-4"
                        >
                          <FontAwesomeIcon icon={faGoogle} /> Sign in with Google
                        </CButton>
                      </CCol>
                    </CRow> */}
                  </CForm>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
