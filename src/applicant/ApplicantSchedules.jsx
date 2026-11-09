import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCol, CRow, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilClock, cilMediaPlay, cilPeople } from '@coreui/icons'
import { useApplicantAuth } from 'src/applicant/useApplicantAuth'
import { API_BASE_URL, extractErrorMessage } from '../assets/api/Api'

// Who is asking comes from the access token, not from anything in the URL.
const MY_SCHEDULES_ENDPOINT = `${API_BASE_URL}/Applicant/MySchedules`

const ApplicantSchedules = () => {
  const navigate = useNavigate()
  const { user, authedFetch } = useApplicantAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMySchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authedFetch(MY_SCHEDULES_ENDPOINT)
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to load your exam schedules.'))
      }
      setExams(await response.json())
    } catch (err) {
      console.error('Failed to fetch applicant schedules:', err)
      setError(err.message || 'Failed to load your exam schedules.')
    } finally {
      setLoading(false)
    }
  }, [authedFetch])

  useEffect(() => {
    fetchMySchedules()
  }, [fetchMySchedules])

  return (
    <>
      <div className="mb-4">
        <h4 className="mb-0">My Exam Schedules</h4>
        <div className="small text-body-secondary">
          Signed in as <strong>{user?.fullname || user?.username}</strong>
        </div>
      </div>

      {loading && (
        <div className="text-center text-body-secondary py-5">
          <CSpinner size="sm" className="me-2" />
          Loading your exam schedules…
        </div>
      )}

      {!loading && error && (
        <CAlert color="danger" className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <CButton color="danger" variant="outline" size="sm" onClick={fetchMySchedules}>
            Retry
          </CButton>
        </CAlert>
      )}

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
