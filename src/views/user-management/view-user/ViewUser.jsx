import React, { useState, useRef, useEffect, useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CRow,
  CSpinner,
} from '@coreui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faAddressCard,
  faArrowLeft,
  faBriefcase,
  faBuilding,
  faCamera,
  faCircleCheck,
  faEnvelope,
  faEye,
  faEyeSlash,
  faKey,
  faLocationPin,
  faLock,
  faSave,
  faSignature,
  faThumbsDown,
  faThumbsUp,
  faUser,
  faUsersViewfinder,
} from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from 'src/context/AuthContext'
import { useToast } from 'src/context/ToastContext'
import UserStatus from '../user-status/UserStatus'

import avatar from './../../../assets/images/avatars/default-prof-pic.jpg'

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
})

const formatRegularDates = (date) => {
  return dateFormatter.format(new Date(date))
}

const checkPasswordStrength = (password) => {
  let strength = 0
  if (password.length >= 8) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[a-z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^A-Za-z0-9]/.test(password)) strength += 1
  return strength
}

const getStrengthLabel = (strength) => {
  switch (strength) {
    case 5:
      return 'Very strong'
    case 4:
      return 'Strong'
    case 3:
      return 'Moderate'
    case 2:
      return 'Weak'
    default:
      return 'Very Weak'
  }
}

const generateDefaultPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
  let password = ''
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    password += chars[randomIndex]
  }
  return password
}

const ViewUser = () => {
  const { userId } = useParams()

  const { user } = useContext(AuthContext)
  const userRole = user?.role
  const notify = useToast()

  const isSuperUserOrAdmin = userRole === 'Super User' || userRole === 'Administrator'

  const isEditMode = Boolean(userId)
  const [userDetails, setUserDetails] = useState({
    roomTypeId: null,
    passWord: '',
    confirmPassword: '',
    pkiPw: '',
    mustChangePasswordOnFirstLogin: false,
  })
  const [listActiveUserTypes, setListActiveUserTypes] = useState([])

  //state variable for password change
  const [isPasswordChange, setIsPasswordChange] = useState(false)
  const [isPkiPasswordChange, setIsPkiPasswordChange] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordMatch, setPasswordMatch] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isDefaultPassword, setIsDefaultPassword] = useState(false)

  const [toggleIsApprover, setToggleIsApprover] = useState(false)

  const [profilePicSrc, setProfilePicSrc] = useState(null)
  const [localProfilePic, setLocalProfilePic] = useState(null)
  const userFileRef = useRef()
  const eSigPdfRef = useRef()
  const p12FileRef = useRef()
  const navigate = useNavigate()

  const fetchUserDetails = async () => {
    if (!isEditMode) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/User/GetUserById/${userId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Network response was not OK.')
      }

      const data = await response.json()
      setUserDetails(data)
      console.log(data)
    } catch (error) {
      console.error('Error fetching user details: ', error)
    }
  }

  const fetchUserTypes = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/User/GetActiveUserTypes`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Network response was not OK.')
      }

      const data = await response.json()
      setListActiveUserTypes(data)
    } catch (error) {
      console.error('Error fetching user types: ', error)
    }
  }

  useEffect(() => {
    if (isEditMode) {
      fetchUserDetails()
    }
    fetchUserTypes()
  }, [isEditMode])

  useEffect(() => {}, [userDetails])

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const handleFileChange = () => {
    const file = userFileRef.current.files[0]
    if (file) {
      setLocalProfilePic(URL.createObjectURL(file))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'utId') {
      setUserDetails({
        ...userDetails,
        userType: { ...userDetails.userType, utId: value },
      })
    } else if (
      name === 'empName' ||
      name === 'position' ||
      name === 'emailAddress'
    ) {
      setUserDetails({
        ...userDetails,
        employee: { ...userDetails.employee, [name]: value },
      })
    } else {
      setUserDetails({ ...userDetails, [name]: value })
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    if (name === 'pkiPw') {
      setUserDetails({ ...userDetails, pkiPw: e.target.value })
    } else if (name === 'confirmPassword') {
      setPasswordMatch(userDetails.passWord === value)
      setUserDetails({ ...userDetails, confirmPassword: e.target.value })
    } else {
      const strength = checkPasswordStrength(value)
      setPasswordStrength(strength)
      setUserDetails({ ...userDetails, passWord: e.target.value })
    }
  }

  const handlePasswordChangeClick = (pwType) => {
    if (pwType === 'password') {
      setIsPasswordChange(true)
    }
  }

  const handleToggleDefaultPassword = () => {
    if (!isDefaultPassword) {
      const defaultPassword = generateDefaultPassword()
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        passWord: defaultPassword,
        confirmPassword: defaultPassword,
      }))
    } else {
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        passWord: '',
        confirmPassword: '',
      }))
    }
    setIsDefaultPassword(!isDefaultPassword)
  }

  const handleToggleMustChangePassword = () => {
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      mustChangePasswordOnFirstLogin: !prevDetails.mustChangePasswordOnFirstLogin,
    }))
  }

  const handleToggleIsApproverClick = () => {
    setToggleIsApprover(true)
  }

  const handleSaveUser = async () => {
    if (userDetails.passWord !== userDetails.confirmPassword) {
      notify('Passwords do not match!', 'error')
      return
    }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/${isEditMode ? 'Auth/UpdateUser' : 'Auth/Register'}`,
        {
          method: isEditMode ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userDetails),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `Failed to ${isEditMode ? 'update' : 'save'} user. Server response: ${errorText}`,
        )
        throw new Error('Network response was not OK for user update.')
      }

      let user_id = null
      if (!isEditMode) {
        const responseData = await response.json()
        user_id = responseData.userId
      } else {
        user_id = userDetails.userId
      }
      if (isEditMode) {
        await fetchUserDetails()
      }
      notify(`User ${isEditMode ? 'updated' : 'added'} successfully.`, 'success')
    } catch (error) {
      notify(`Error ${isEditMode ? 'updating' : 'adding'} user.`, 'error')
    }
  }

  const handleActivateUser = () => {
    const newStatus = true
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      isActive: newStatus,
    }))
    updateUserStatus(newStatus)
  }

  const handleDeactivateUser = () => {
    const newStatus = false
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      isActive: newStatus,
    }))
    updateUserStatus(newStatus)
  }

  const updateUserStatus = async (isActive) => {
    const userStatus = {
      userId: userDetails.userId,
      isActive: isActive,
    }
    console.log(userStatus)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/User/UpdateUserStatus`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userStatus),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Failed to update user status. Server response: ${errorText}`)
        throw new Error('Network response was not OK for user update.')
      }

      await fetchUserDetails()
      notify('User status updated successfully.', 'success')
    } catch (error) {
      notify('Failed to update user status.', 'error')
    }
  }

  const handleBackToList = () => {
    //console.log()
    navigate('/user-management/user-accounts-list/')
  }

  if (!userDetails && isEditMode) return <CSpinner color="dark" />

  return (
    <CRow className="view-user-component">
      <CCol xs={12}>
        <CRow className="mb-2 p-3">
          <h4 className="card-title mb-0">User Profile</h4>
        </CRow>
        <CRow className="mb-2 p-3">
          <CCol sm={3} xs={12}>
            <CCard className="mb-3 p-3">
              <CCardBody>
                <div className="profile-pic-section">
                  <div className="image mt-2">
                    <img
                      src={avatar}
                      alt="prof-pic"
                    />
                  </div>
                </div>
              </CCardBody>
            </CCard>
            <CButton color="info" size="lg" className="btn-new mb-2" onClick={handleSaveUser}>
              <FontAwesomeIcon icon={faSave} /> {isEditMode ? 'Edit' : 'Add'} User
            </CButton>
            {isSuperUserOrAdmin && (
              <CButton
                size="lg"
                className="btn-new btn-approve-new mb-2"
                onClick={handleActivateUser}
              >
                <FontAwesomeIcon icon={faThumbsUp} /> Activate User
              </CButton>
            )}
            {isSuperUserOrAdmin && (
              <CButton
                size="lg"
                className="btn-new btn-disapprove-new mb-2"
                onClick={handleDeactivateUser}
              >
                <FontAwesomeIcon icon={faThumbsDown} /> Deactivate User
              </CButton>
            )}
            {isSuperUserOrAdmin && (
              <CButton
                color="warning"
                size="lg"
                className="btn-new mb-2"
                onClick={() => handleBackToList()}
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back to Masterlist
              </CButton>
            )}
          </CCol>
          <CCol sm={8} xs={12}>
            <CForm className="view-event-form">
              <CRow>
                <CCard className="mb-4 p-3">
                  <CCardBody>
                    <CRow>
                      <CCol sm={9} style={{ alignContent: 'center' }}>
                        <h5>Account Details</h5>
                      </CCol>
                      <CCol sm={3}>
                        {isEditMode
                        ? <UserStatus userStatus={userDetails.isActive} />
                        : "" }
                      </CCol>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={12}>
                        <CFormLabel htmlFor="idUsername">
                          <FontAwesomeIcon icon={faUser} />
                          &nbsp;Username
                        </CFormLabel>
                        <CFormInput
                          type="text"
                          name="userName"
                          id="idUsername"
                          value={userDetails.userName}
                          onChange={handleInputChange}
                          required
                        />
                      </CCol>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={8}>
                        <CFormLabel htmlFor="idUserType">
                          <FontAwesomeIcon icon={faUsersViewfinder} />
                          &nbsp;User Type
                        </CFormLabel>
                        {isSuperUserOrAdmin ? (
                          <CFormSelect
                            id="idUserType"
                            name="utId"
                            value={userDetails.userType?.utId || ''}
                            onChange={handleInputChange}
                            required
                            disabled={!isSuperUserOrAdmin}
                          >
                            <option>Select User Type</option>
                            {listActiveUserTypes.map((ut) => (
                              <option
                                key={ut.userTypeId}
                                value={ut.userTypeId}
                                selected={ut.userTypeId === userDetails.userType?.utId}
                              >
                                {ut.userTypeDesc}
                              </option>
                            ))}
                          </CFormSelect>
                        ) : (
                          <CFormInput
                            type="text"
                            name="userTypeName"
                            id="idUserTypeName"
                            value={user?.role}
                            disabled
                          />
                        )}
                      </CCol>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={8}>
                        <CFormLabel htmlFor="idPassword">
                          <FontAwesomeIcon icon={faLock} />
                          &nbsp;Password
                        </CFormLabel>
                        {userDetails.datePasswordLastSet && !isPasswordChange ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <p style={{ fontWeight: '500', fontSize: '14px' }}>
                              Last set/updated:{' '}
                              {formatRegularDates(userDetails.datePasswordLastSet)}
                            </p>
                            <CButton
                              className="float-end btn-info-new"
                              onClick={() => handlePasswordChangeClick('password')}
                            >
                              Change
                            </CButton>
                          </div>
                        ) : (
                          <>
                            <div style={{ position: 'relative' }}>
                              <CFormInput
                                type={showPassword ? 'text' : 'password'}
                                name="passWord"
                                value={userDetails.passWord}
                                onChange={handlePasswordChange}
                                id="idPassword"
                                required
                              />
                              <FontAwesomeIcon
                                icon={showPassword ? faEyeSlash : faEye}
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  cursor: 'pointer',
                                }}
                              />
                            </div>
                            <div style={{ marginTop: '10px' }}>
                              <div
                                style={{ height: '5px', width: '100%', backgroundColor: '#ddd' }}
                              >
                                <div
                                  style={{
                                    height: '5px',
                                    width: `${(passwordStrength / 5) * 100}%`,
                                    backgroundColor:
                                      passwordStrength === 5
                                        ? 'green'
                                        : passwordStrength >= 4
                                          ? 'blue'
                                          : passwordStrength >= 3
                                            ? 'orange'
                                            : 'red',
                                    transition: 'width 0.3s',
                                  }}
                                ></div>
                                <p style={{ marginTop: '5px', fontSize: '14px' }}>
                                  Password Strength: {getStrengthLabel(passwordStrength)}
                                </p>
                              </div>
                            </div>
                            <CFormLabel htmlFor="idConfirmPassword" className="mt-5 mb-3">
                              <FontAwesomeIcon icon={faLock} />
                              &nbsp;Confirm Password
                            </CFormLabel>
                            <div style={{ position: 'relative' }}>
                              <CFormInput
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                id="idConfirmPassword"
                                value={userDetails.confirmPassword}
                                onChange={handlePasswordChange}
                                required
                              />
                              <FontAwesomeIcon
                                icon={showConfirmPassword ? faEyeSlash : faEye}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  cursor: 'pointer',
                                }}
                              />
                            </div>
                            {!passwordMatch && (
                              <p style={{ color: 'red', marginTop: '5px', fontSize: '14px' }}>
                                Passswords do not match.
                              </p>
                            )}
                            <CFormSwitch
                              size="xl"
                              label="Set a Default Password"
                              id="idPasswordDefaultPw"
                              className="mt-3"
                              checked={isDefaultPassword}
                              onChange={handleToggleDefaultPassword}
                            />
                            <CFormSwitch
                              size="xl"
                              label="User must change password at next login"
                              id="idMustChangePassword"
                              checked={userDetails.mustChangePasswordOnFirstLogin}
                              onChange={handleToggleMustChangePassword}
                              className="mt-3"
                            />
                          </>
                        )}
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
                <CCard className="mb-4 p-3">
                  <CCardBody>
                    <CRow>
                      <h5>Employee Information</h5>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={12}>
                        <CFormLabel htmlFor="idEmpName">
                          <FontAwesomeIcon icon={faAddressCard} />
                          &nbsp;Full Name
                        </CFormLabel>
                        <CFormInput
                          type="text"
                          id="idEmpName"
                          name="empName"
                          value={userDetails.employee?.empName || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </CCol>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={6}>
                        <CFormLabel htmlFor="idEmpPosition">
                          <FontAwesomeIcon icon={faBriefcase} />
                          &nbsp;Position
                        </CFormLabel>
                        <CFormInput
                          type="text"
                          id="idEmpPosition"
                          name="position"
                          value={userDetails.employee?.position || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </CCol>
                      <CCol sm={6}>
                        <CFormLabel htmlFor="idEmpEmail">
                          <FontAwesomeIcon icon={faEnvelope} />
                          &nbsp;E-mail Address
                        </CFormLabel>
                        <CFormInput
                          type="email"
                          id="idEmpEmail"
                          name="emailAddress"
                          value={userDetails.employee?.emailAddress || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
                {/* <CCard className="mb-4 p-3">
                  <CCardBody>
                    <CRow>
                      <h5>PNPKI (Digital Signature) Credentials</h5>
                    </CRow>
                    <CRow className="mt-4">
                      <CCol sm={6}>
                        <CFormLabel htmlFor="idDateFiled">
                          <FontAwesomeIcon icon={faKey} />
                          &nbsp;Your .P12 File
                        </CFormLabel>
                        <CFormInput type="file" id="formFileP12" ref={p12FileRef} required />
                        {userDetails.pkiFilePath && (
                          <p style={{ fontSize: '12px', color: '#188821' }} className="mt-1">
                            <FontAwesomeIcon icon={faCircleCheck} /> Digital Certificate/PKI already
                            saved.
                          </p>
                        )}
                      </CCol>
                      <CCol sm={6}>
                        <CFormLabel htmlFor="idDateFiled">
                          <FontAwesomeIcon icon={faSignature} />
                          &nbsp;Image File of Your e-Signature
                        </CFormLabel>
                        <CFormInput type="file" id="formFileeSigPdf" ref={eSigPdfRef} required />
                        {userDetails.eSigPdfFilePath && (
                          <a
                            href={variables.PDF_ESIGS_URL + userDetails.eSigPdfFilePath}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '12px' }}
                          >
                            View Your e-Signature
                          </a>
                        )}
                      </CCol>
                    </CRow>
                    <CRow className="mt-4 mb-3">
                      <CCol sm={8}>
                        <CFormLabel htmlFor="idPassword">
                          <FontAwesomeIcon icon={faLock} />
                          &nbsp;PKI Password
                        </CFormLabel>
                        {userDetails.datePKIPasswordLastSet && !isPkiPasswordChange ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <p style={{ fontWeight: '500', fontSize: '14px' }}>
                              Last set/updated:{' '}
                              {formatRegularDates(userDetails.datePKIPasswordLastSet)}
                            </p>
                            <CButton
                              className="float-end btn-info-rev-new"
                              onClick={() => handlePasswordChangeClick('pkiPw')}
                            >
                              Change
                            </CButton>
                          </div>
                        ) : (
                          <>
                            <div style={{ position: 'relative' }}>
                              <CFormInput
                                type={showPkiPassword ? 'text' : 'password'}
                                name="pkiPw"
                                value={userDetails.pkiPw}
                                onChange={handlePasswordChange}
                                id="idPKIPassword"
                                required
                              />
                              <FontAwesomeIcon
                                icon={showPassword ? faEyeSlash : faEye}
                                onClick={() => setShowPkiPassword(!showPkiPassword)}
                                style={{
                                  position: 'absolute',
                                  right: '16px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  cursor: 'pointer',
                                }}
                              />
                            </div>
                          </>
                        )}
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard> */}
              </CRow>
            </CForm>
          </CCol>
        </CRow>
      </CCol>
    </CRow>
  )
}

export default ViewUser
