import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilClock, cilMediaPlay, cilPeople } from '@coreui/icons'
import { useApplicantSession } from 'src/applicant/ApplicantSession'

// Same base-URL convention as ExamContext.jsx.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5026/api'
const mySchedulesEndpoint = (email) =>
  `${API_BASE_URL}/Applicant/MySchedules?email=${encodeURIComponent(email)}`

const IdentityGate = ({ onSubmit }) => {
  const [value, setValue] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <CCard className="mx-auto mt-5" style={{ maxWidth: 420 }}>
      <CCardBody>
        <h5 className="mb-1">View Your Exam Schedules</h5>
        <p className="small text-body-secondary">
          Enter the email address you were enrolled with to see your exams.
        </p>
        <CForm onSubmit={submit}>
          <CFormLabel htmlFor="applicant-email">Email Address</CFormLabel>
          <CFormInput
            id="applicant-email"
            type="email"
            required
            placeholder="you@example.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <CButton color="primary" type="submit" className="mt-3 w-100">
            Continue
          </CButton>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

const ApplicantSchedules = () => {
  const navigate = useNavigate()
  const { email, setEmail, isIdentified } = useApplicantSession()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMySchedules = useCallback(async () => {
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(mySchedulesEndpoint(email))
      if (!response.ok) {
        throw new Error(`Failed to load your exam schedules (status ${response.status}).`)
      }
      setExams(await response.json())
    } catch (err) {
      console.error('Failed to fetch applicant schedules:', err)
      setError(err.message || 'Failed to load your exam schedules.')
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    fetchMySchedules()
  }, [fetchMySchedules])

  if (!isIdentified) {
    return <IdentityGate onSubmit={setEmail} />
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">My Exam Schedules</h4>
          <div className="small text-body-secondary">
            Signed in as <strong>{email}</strong>
          </div>
        </div>
        <CButton color="link" size="sm" onClick={() => setEmail('')}>
          Not you? Switch email
        </CButton>
      </div>

      {loading && (
        <div className="text-center text-body-secondary py-5">
          <CSpinner size="sm" className="me-2" />
          Loading your exam schedules…
        </div>
      )}

      {!loading && error && <CAlert color="danger">{error}</CAlert>}

      {!loading && !error && exams.length === 0 && (
        <CCard>
          <CCardBody className="text-center text-body-secondary py-5">
            <CIcon icon={cilCalendar} size="3xl" className="mb-2" />
            <p className="fw-semibold mb-0">No exams are currently open for you.</p>
            <p className="small mb-0">
              Exams only appear here once they&apos;ve been opened — check back once your
              scheduled exam begins.
            </p>
          </CCardBody>
        </CCard>
      )}

      {!loading && !error && exams.length > 0 && (
        <CRow className="g-4">
          {exams.map((e) => (
            <CCol md={6} lg={4} key={e.examEnrollmentId}>
              <CCard className="h-100">
                <CCardBody className="d-flex flex-column justify-content-between">
                  <div>
                    <CBadge color="success" shape="rounded-pill" className="mb-2">
                      ● Ongoing
                    </CBadge>
                    <h5>{e.examTitle}</h5>
                    <ul className="list-unstyled small mt-3 mb-0 d-grid gap-2">
                      <li>
                        <CIcon icon={cilCalendar} className="text-primary me-2" />
                        {e.examDate} at {e.startTime}
                      </li>
                      <li>
                        <CIcon icon={cilClock} className="text-primary me-2" />
                        {e.durationMinutes} Minutes Duration
                      </li>
                      <li>
                        <CIcon icon={cilPeople} className="text-primary me-2" />
                        Your Status: <strong>{e.enrollmentStatus}</strong>
                      </li>
                    </ul>
                  </div>
                  <CButton
                    color="success"
                    className="mt-4"
                    onClick={() => navigate(`/applicant/exam/${e.examEnrollmentId}`)}
                  >
                    <CIcon icon={cilMediaPlay} className="me-1" /> Open Exam
                  </CButton>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}
    </>
  )
}

export default ApplicantSchedules
