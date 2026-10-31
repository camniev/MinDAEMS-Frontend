import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCol, CRow, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilClock, cilFullscreen, cilMediaPlay } from '@coreui/icons'
import { useApplicantSession } from 'src/applicant/ApplicantSession'
import { useFullscreen } from 'src/applicant/useFullscreen'

// Same base-URL convention as ApplicantSchedules.jsx / ExamContext.jsx.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5026/api'
const mySchedulesEndpoint = (email) =>
  `${API_BASE_URL}/Applicant/MySchedules?email=${encodeURIComponent(email)}`

// ASSUMPTION: an applicant who already finished (or was disqualified from)
// an exam shouldn't be able to start it again. The schedules list still shows
// such exams, so this page is where it gets stopped. Adjust if "Completed"
// should allow retakes.
const BLOCKED_ENROLLMENT_STATUSES = ['Completed', 'Disqualified']

const ApplicantExamDetails = () => {
  const { enrollmentId } = useParams()
  const navigate = useNavigate()
  const { email, isIdentified } = useApplicantSession()
  const { isFullscreen, canRequest, enter, error: fullscreenError } = useFullscreen()

  const [exam, setExam] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | ready | notFound | error
  const [loadError, setLoadError] = useState(null)
  const [startClicked, setStartClicked] = useState(false)

  // The URL only carries the enrollment id, so look it up among this
  // applicant's own Ongoing exams (the same endpoint the schedules page
  // uses). That also means an exam that isn't open, or isn't theirs, simply
  // isn't found here — no separate check needed.
  const loadExam = useCallback(async () => {
    if (!email) return
    setLoadState('loading')
    setLoadError(null)
    try {
      const response = await fetch(mySchedulesEndpoint(email))
      if (!response.ok) {
        throw new Error(`Failed to load the exam details (status ${response.status}).`)
      }
      const list = await response.json()
      const match = list.find((e) => e.examEnrollmentId === enrollmentId) ?? null
      setExam(match)
      setLoadState(match ? 'ready' : 'notFound')
    } catch (err) {
      console.error('Failed to load exam details:', err)
      setLoadError(err.message || 'Failed to load the exam details.')
      setLoadState('error')
    }
  }, [email, enrollmentId])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  const backButton = (
    <CButton color="link" className="ps-0 mb-3" onClick={() => navigate('/applicant/schedules')}>
      <CIcon icon={cilArrowLeft} className="me-1" />
      Back to My Exam Schedules
    </CButton>
  )

  if (!isIdentified) {
    return (
      <>
        {backButton}
        <CAlert color="warning">
          We don&apos;t know who you are yet. Go back to My Exam Schedules and enter your email
          first.
        </CAlert>
      </>
    )
  }

  if (loadState === 'loading') {
    return (
      <div className="text-center text-body-secondary py-5">
        <CSpinner size="sm" className="me-2" />
        Loading exam details…
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <>
        {backButton}
        <CAlert color="danger" className="d-flex justify-content-between align-items-center">
          <span>{loadError}</span>
          <CButton color="danger" variant="outline" size="sm" onClick={loadExam}>
            Retry
          </CButton>
        </CAlert>
      </>
    )
  }

  if (loadState === 'notFound') {
    return (
      <>
        {backButton}
        <CCard>
          <CCardBody className="text-center text-body-secondary py-5">
            <p className="fw-semibold mb-1">This exam isn&apos;t available.</p>
            <p className="small mb-0">
              It may not be open yet, may have already closed, or isn&apos;t assigned to you.
            </p>
          </CCardBody>
        </CCard>
      </>
    )
  }

  const alreadyDone = BLOCKED_ENROLLMENT_STATUSES.includes(exam.enrollmentStatus)
  const canStart = isFullscreen && !alreadyDone

  return (
    <>
      {backButton}
      <CRow className="justify-content-center">
        <CCol lg={9} xl={8}>
          <CCard>
            <CCardBody className="p-4">
              <h3 className="mb-2">{exam.examTitle}</h3>
              <CBadge color="primary" shape="rounded-pill" className="mb-4">
                <CIcon icon={cilClock} size="sm" className="me-1" />
                {exam.durationMinutes} minutes
              </CBadge>

              <h6 className="text-uppercase text-body-secondary small fw-semibold">
                Exam Instructions
              </h6>
              <p className="mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                {exam.instructions?.trim() || 'No specific instructions were provided.'}
              </p>

              <CAlert color={isFullscreen ? 'success' : 'danger'} className="mb-4">
                {isFullscreen ? (
                  <>Full screen is on. You can start the exam.</>
                ) : (
                  <>
                    <strong>This page is not in full screen.</strong> The exam must be taken in full screen
                    with the address bar and tabs hidden. Click <strong>Enter Full Screen</strong> below. Start
                    Exam stays disabled until then.
                  </>
                )}
              </CAlert>

              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="small text-body-secondary">Full screen:</span>
                <CBadge color={isFullscreen ? 'success' : 'danger'}>
                  {isFullscreen ? 'On' : 'Off'}
                </CBadge>
              </div>

              <div className="d-flex flex-wrap gap-2">
                {!isFullscreen && canRequest && (
                  <CButton color="primary" variant="outline" onClick={enter}>
                    <CIcon icon={cilFullscreen} className="me-1" />
                    Enter Full Screen
                  </CButton>
                )}
                <CButton
                  color="success"
                  disabled={!canStart}
                  onClick={() => setStartClicked(true)}
                >
                  <CIcon icon={cilMediaPlay} className="me-1" />
                  Start Exam
                </CButton>
              </div>

              {fullscreenError && <div className="small text-danger mt-2">{fullscreenError}</div>}
              {alreadyDone ? (
                <div className="small text-danger mt-2">
                  This exam is marked {exam.enrollmentStatus} for you, so it can&apos;t be started.
                </div>
              ) : null}

              {/* STUB — the questions page is the next piece. Starting does
                  nothing yet beyond acknowledging the click. */}
              {startClicked && (
                <CAlert color="info" className="mt-3 mb-0">
                  Full screen confirmed. The exam questions page isn&apos;t built yet — this is
                  where the exam will begin.
                </CAlert>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ApplicantExamDetails
