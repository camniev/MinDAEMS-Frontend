import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormCheck,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilArrowRight,
  cilBolt,
  cilClock,
  cilFullscreen,
  cilInfo,
} from '@coreui/icons'
import { useApplicantAuth } from 'src/applicant/useApplicantAuth'
import { useFullscreen } from 'src/applicant/useFullScreen'
import { API_BASE_URL, extractErrorMessage } from '../assets/api/Api'
import PortalShell, { PortalCenter } from './ExamPortalShell'

// Who is asking comes from the access token, not from anything in the URL.
const MY_SCHEDULES_ENDPOINT = `${API_BASE_URL}/Applicant/MySchedules`

// ASSUMPTION: an applicant who already finished (or was disqualified from)
// an exam shouldn't be able to start it again. The schedules list still shows
// such exams, so this page is where it gets stopped. Adjust if "Completed"
// should allow retakes.
const BLOCKED_ENROLLMENT_STATUSES = ['Completed', 'Disqualified']

// One of the small metric tiles under the exam title.
const Tile = ({ icon, color, label, children }) => (
  <div className="bg-body-tertiary border rounded-3 p-3 h-100">
    <div className={`d-flex align-items-center gap-2 small fw-bold mb-1 text-${color}`}>
      <CIcon icon={icon} size="sm" />
      {label}
    </div>
    <div className="fs-5 fw-bolder">{children}</div>
  </div>
)

const ApplicantExamDetails = () => {
  const { enrollmentId } = useParams()
  const navigate = useNavigate()
  const { authedFetch } = useApplicantAuth()
  const { isFullscreen, canRequest, enter, error: fullscreenError } = useFullscreen()

  const [exam, setExam] = useState(null)
  const [loadState, setLoadState] = useState('loading') // loading | ready | notFound | error
  const [loadError, setLoadError] = useState(null)
  // As in the design, the acknowledgement starts ticked; unticking it disables Start Exam.
  const [acknowledged, setAcknowledged] = useState(true)

  // The URL only carries the enrollment id, so look it up among this
  // applicant's own Ongoing exams (the same endpoint the schedules page
  // uses). That also means an exam that isn't open, or isn't theirs, simply
  // isn't found here — no separate check needed.
  const loadExam = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      const response = await authedFetch(MY_SCHEDULES_ENDPOINT)
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to load the exam details.'))
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
  }, [authedFetch, enrollmentId])

  useEffect(() => {
    loadExam()
  }, [loadExam])

  const goBack = () => navigate('/applicant/schedules')

  const headerBack = (
    <CButton color="light" variant="outline" size="sm" className="flex-shrink-0" onClick={goBack}>
      <CIcon icon={cilArrowLeft} className="me-sm-2" />
      <span className="d-none d-sm-inline">Back to My Exam Schedules</span>
    </CButton>
  )

  if (loadState === 'loading') {
    return (
      <PortalShell subtitle="Examination Briefing" action={headerBack}>
        <PortalCenter>
          <div className="text-center text-body-secondary py-5">
            <CSpinner size="sm" className="me-2" />
            Loading exam details…
          </div>
        </PortalCenter>
      </PortalShell>
    )
  }

  if (loadState === 'error') {
    return (
      <PortalShell subtitle="Examination Briefing" action={headerBack}>
        <PortalCenter>
          <CAlert color="danger" className="d-flex justify-content-between align-items-center mb-0">
            <span>{loadError}</span>
            <CButton color="danger" variant="outline" size="sm" onClick={loadExam}>
              Retry
            </CButton>
          </CAlert>
        </PortalCenter>
      </PortalShell>
    )
  }

  if (loadState === 'notFound') {
    return (
      <PortalShell subtitle="Examination Briefing" action={headerBack}>
        <PortalCenter>
          <CCard className="shadow-sm">
            <CCardBody className="text-center text-body-secondary py-5">
              <p className="fw-semibold mb-1">This exam isn&apos;t available.</p>
              <p className="small mb-0">
                It may not be open yet, may have already closed, or isn&apos;t assigned to you.
              </p>
            </CCardBody>
          </CCard>
        </PortalCenter>
      </PortalShell>
    )
  }

  const alreadyDone = BLOCKED_ENROLLMENT_STATUSES.includes(exam.enrollmentStatus)
  const canStart = isFullscreen && !alreadyDone && acknowledged

  return (
    <PortalShell subtitle="Examination Briefing" action={headerBack}>
      <div className="mx-auto w-100 pb-4" style={{ maxWidth: 768 }}>
        <CCard className="shadow overflow-hidden" style={{ borderTop: '8px solid var(--cui-primary)' }}>
          <CCardBody className="p-4 p-sm-5">
            <h2 className="fw-bolder mb-4">{exam.examTitle}</h2>

            {/* Key facts */}
            <CRow className="g-3 mb-4">
              <CCol xs={6}>
                <Tile icon={cilClock} color="primary" label="Duration">
                  {exam.durationMinutes} Mins
                </Tile>
              </CCol>
              <CCol xs={6}>
                <Tile icon={cilFullscreen} color={isFullscreen ? 'success' : 'danger'} label="Full screen">
                  <CBadge color={isFullscreen ? 'success' : 'danger'}>
                    {isFullscreen ? 'On' : 'Off'}
                  </CBadge>
                </Tile>
              </CCol>
            </CRow>

            {/* Instructions */}
            <CAlert color="primary" className="mb-4">
              <h6 className="text-uppercase small fw-bolder d-flex align-items-center gap-2 mb-2">
                <CIcon icon={cilInfo} />
                Examination Instructions &amp; Guidelines
              </h6>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {exam.instructions?.trim() || 'No specific instructions were provided.'}
              </div>
            </CAlert>

            {/* Before you begin */}
            <div className="bg-body-tertiary border rounded-4 p-4 mb-4">
              <h6 className="text-uppercase small fw-bolder mb-3">Before You Begin:</h6>
              <ul className="list-unstyled small text-body-secondary d-grid gap-2 mb-3">
                <li className="d-flex align-items-start gap-2">
                  <CIcon icon={cilClock} className="text-primary mt-1 flex-shrink-0" size="sm" />
                  <span>
                    The countdown timer starts immediately once you click <strong>Start Exam</strong>{' '}
                    and cannot be paused.
                  </span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CIcon icon={cilBolt} className="text-warning mt-1 flex-shrink-0" size="sm" />
                  <span>
                    Your answers are automatically saved as you progress. When time reaches{' '}
                    <strong>00:00</strong>, your exam will be submitted automatically.
                  </span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <span
                    className="text-danger fw-bold flex-shrink-0 text-center"
                    style={{ width: 16 }}
                  >
                    *
                  </span>
                  <span>
                    Questions marked with a red asterisk (<span className="text-danger fw-bold">*</span>)
                    are required. You can flag any question to review before final submission.
                  </span>
                </li>
                <li className="d-flex align-items-start gap-2">
                  <CIcon icon={cilFullscreen} className="text-danger mt-1 flex-shrink-0" size="sm" />
                  <span>
                    Leaving full screen or switching to another window or tab during the exam is
                    recorded and reported to the proctor.
                  </span>
                </li>
              </ul>
              <div className="border-top pt-3">
                <CFormCheck
                  id="exam-acknowledge"
                  label="I have read the examination details and instructions, and I am ready to begin."
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
              </div>
            </div>

            {/* Full screen requirement */}
            <CAlert
              color={isFullscreen ? 'success' : 'danger'}
              className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-0"
            >
              <span>
                {isFullscreen ? (
                  <>Full screen is on. You can start the exam.</>
                ) : (
                  <>
                    <strong>This page is not in full screen.</strong> The exam must be taken in full
                    screen with the address bar and tabs hidden. Click{' '}
                    <strong>Enter Full Screen</strong> below. Start Exam stays disabled until then.
                  </>
                )}
              </span>
              {!isFullscreen && canRequest && (
                <CButton color="primary" onClick={enter}>
                  <CIcon icon={cilFullscreen} className="me-1" />
                  Enter Full Screen
                </CButton>
              )}
            </CAlert>

            {fullscreenError && <div className="small text-danger mt-2">{fullscreenError}</div>}
            {alreadyDone && (
              <div className="small text-danger mt-2">
                This exam is marked {exam.enrollmentStatus} for you, so it can&apos;t be started.
              </div>
            )}
          </CCardBody>

          {/* Action bar */}
          <div className="bg-dark d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3 px-4 px-sm-5 py-4">
            <CButton color="light" variant="outline" className="align-self-stretch align-self-sm-auto" onClick={goBack}>
              Cancel &amp; Return
            </CButton>
            <CButton
              color="success"
              size="lg"
              className="align-self-stretch align-self-sm-auto fw-bold px-5"
              disabled={!canStart}
              onClick={() => navigate(`/applicant/exam/${enrollmentId}/take`)}
            >
              Start Exam
              <CIcon icon={cilArrowRight} className="ms-2" />
            </CButton>
          </div>
        </CCard>
      </div>
    </PortalShell>
  )
}

export default ApplicantExamDetails
