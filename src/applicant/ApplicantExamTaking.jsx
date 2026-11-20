import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilClock,
  cilDescription,
  cilFlagAlt,
  cilFullscreen,
  cilSend,
  cilWarning,
} from '@coreui/icons'
import { useApplicantAuth } from 'src/applicant/useApplicantAuth'
import { detectFullscreen, useFullscreen } from 'src/applicant/useFullScreen'
import { API_BASE_URL, extractErrorMessage, sendJson } from '../assets/api/Api'
import EssayEditor from './EssayEditor'
import { useExamIntegrityReporter } from './useExamIntegrityReporter'
import PortalShell, { PortalCenter, PortalIcon } from './ExamPortalShell'

// Answers are saved this long after the applicant stops changing something.
const AUTOSAVE_DELAY_MS = 1000

const examEndpoint = (enrollmentId, action) =>
  `${API_BASE_URL}/Applicant/MyExam/${enrollmentId}/${action}`

// A reference PDF for a question. The server only serves it to the owner of this
// enrollment while the attempt is open.
const attachmentEndpoint = (enrollmentId, attachmentId) =>
  `${API_BASE_URL}/Applicant/MyExam/${enrollmentId}/Attachments/${attachmentId}`

const EMPTY_ANSWER = { selectedOptionIds: [], essayText: '' }

const isAnswered = (question, answer) =>
  question.type === 'essay'
    ? Boolean(answer?.essayText?.trim())
    : (answer?.selectedOptionIds?.length ?? 0) > 0

const toAnswerMap = (saved) =>
  Object.fromEntries(
    (saved ?? []).map((a) => [
      a.questionId,
      { selectedOptionIds: a.selectedOptionIds ?? [], essayText: a.essayText ?? '' },
    ]),
  )

// What goes to the server: only questions that actually have an answer. The
// server replaces its saved set with this, so a cleared question is cleared
// there too.
const toPayload = (answers) =>
  Object.entries(answers)
    .map(([questionId, a]) => ({
      questionId,
      selectedOptionIds: a.selectedOptionIds ?? [],
      essayText: a.essayText?.trim() ? a.essayText : null,
    }))
    .filter((a) => a.selectedOptionIds.length > 0 || a.essayText)

const pad = (n) => String(n).padStart(2, '0')
const formatTime = (total) => {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const exitFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
}

const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  truefalse: 'True / False',
  checkbox: 'Multiple Answer',
  essay: 'Essay',
}
const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Timer box colours in the top bar: calm, then amber at 5 minutes, then red + pulsing at 1.
const TIMER_TONES = {
  normal: {
    background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.18)',
    icon: 'text-success',
    pulse: false,
  },
  warning: {
    background: 'rgba(var(--cui-warning-rgb), .18)',
    border: '1px solid var(--cui-warning)',
    icon: 'text-warning',
    pulse: false,
  },
  danger: {
    background: 'rgba(var(--cui-danger-rgb), .22)',
    border: '1px solid var(--cui-danger)',
    icon: 'text-danger',
    pulse: true,
  },
}

const QuestionCard = ({
  question,
  index,
  answer,
  updateAnswer,
  onViewAttachment,
  flagged,
  onToggleFlag,
}) => {
  const multi = question.type === 'checkbox'
  const selected = answer.selectedOptionIds

  return (
    <CCard
      id={`q-card-${question.id}`}
      className={`mb-3 ${flagged ? 'border-warning' : ''}`}
      style={{
        scrollMarginTop: 16,
        boxShadow: flagged ? '0 0 0 .2rem rgba(var(--cui-warning-rgb), .25)' : undefined,
      }}
    >
      <CCardBody className="p-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 bg-dark text-white fw-bold"
              style={{ width: 28, height: 28, fontSize: 12 }}
            >
              {index + 1}
            </span>
            <span className="small fw-bold text-uppercase text-body-secondary">
              {TYPE_LABELS[question.type] ?? question.type}
            </span>
            <CBadge color="light" textColor="dark" shape="rounded-pill">
              {question.points} {question.points === 1 ? 'pt' : 'pts'}
            </CBadge>
          </div>
          <CButton
            size="sm"
            color={flagged ? 'warning' : 'light'}
            aria-pressed={flagged}
            onClick={() => onToggleFlag(question.id)}
          >
            <CIcon icon={cilFlagAlt} size="sm" className="me-1" />
            {flagged ? 'Flagged for Review' : 'Flag'}
          </CButton>
        </div>

        <h6 className="fw-bold lh-base mb-3">
          {question.text}
          {question.required && (
            <span className="text-danger ms-1" title="Required question">
              *
            </span>
          )}
        </h6>

        {question.attachment && (
          <div className="d-flex align-items-center gap-2 border rounded-3 p-2 mb-3 bg-body-tertiary">
            <CIcon icon={cilDescription} className="text-danger" />
            <div className="flex-grow-1 text-truncate">
              <div className="small fw-semibold">Reference document</div>
              <div className="small text-body-secondary text-truncate">
                {question.attachment.fileName}
              </div>
            </div>
            <CButton
              size="sm"
              color="primary"
              variant="outline"
              onClick={() => onViewAttachment(question.attachment)}
            >
              View PDF
            </CButton>
          </div>
        )}

        {question.type === 'essay' ? (
          <EssayEditor
            ariaLabel={`Answer to question ${index + 1}`}
            value={answer.essayText}
            onChange={(html) => updateAnswer(question.id, { essayText: html })}
          />
        ) : (
          <>
            <div className="d-grid gap-2">
              {question.options.map((o, oIdx) => {
                const checked = selected.includes(o.id)
                return (
                  <label
                    key={o.id}
                    htmlFor={`q-${question.id}-${o.id}`}
                    className={`d-flex align-items-center gap-3 p-3 rounded-3 border mb-0 ${
                      checked ? 'border-primary bg-primary-subtle' : 'bg-body-tertiary'
                    }`}
                    style={{
                      cursor: 'pointer',
                      boxShadow: checked ? '0 0 0 1px var(--cui-primary)' : undefined,
                    }}
                  >
                    <CFormCheck
                      type={multi ? 'checkbox' : 'radio'}
                      name={`q-${question.id}`}
                      id={`q-${question.id}-${o.id}`}
                      className="mt-0 flex-shrink-0"
                      checked={checked}
                      onChange={() =>
                        updateAnswer(question.id, (cur) => ({
                          selectedOptionIds: multi
                            ? cur.selectedOptionIds.includes(o.id)
                              ? cur.selectedOptionIds.filter((id) => id !== o.id)
                              : [...cur.selectedOptionIds, o.id]
                            : [o.id],
                        }))
                      }
                    />
                    {!multi && (
                      <span
                        className={`d-inline-flex align-items-center justify-content-center rounded-2 fw-bold flex-shrink-0 ${
                          checked ? 'bg-primary text-white' : 'bg-body border text-body-secondary'
                        }`}
                        style={{ width: 24, height: 24, fontSize: 12 }}
                      >
                        {OPTION_LETTERS[oIdx] ?? oIdx + 1}
                      </span>
                    )}
                    <span className="fw-medium">{o.text}</span>
                  </label>
                )
              })}
            </div>
            {/* A radio can't be un-picked by clicking it again, so optional
                questions get an explicit way to take an answer back. */}
            {!question.required && selected.length > 0 && (
              <CButton
                color="link"
                size="sm"
                className="p-0 mt-2"
                onClick={() => updateAnswer(question.id, { selectedOptionIds: [] })}
              >
                Clear answer
              </CButton>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

const ApplicantExamTaking = () => {
  const { enrollmentId } = useParams()
  const navigate = useNavigate()
  const { authedFetch } = useApplicantAuth()
  const { isFullscreen, canRequest, enter, error: fullscreenError } = useFullscreen()

  // This page is only reachable from the details page, i.e. already in full
  // screen. Refreshing (or opening the URL directly) drops out of full screen,
  // which sends the applicant back there. Captured once, at mount — leaving
  // full screen DURING the exam is handled separately below.
  const [cameInFullscreen] = useState(detectFullscreen)

  const [phase, setPhase] = useState('loading') // loading | ready | error | ended | submitted
  const [attempt, setAttempt] = useState(0) // bumped to retry the start request
  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [message, setMessage] = useState(null)
  const [saveState, setSaveState] = useState('saved') // saved | dirty | saving | error
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(null)
  // "Flag for review" marks. Local to this screen only: not saved, and cleared on refresh.
  const [flagged, setFlagged] = useState({})

  // Reference PDF viewer. Shown in a modal on this page: opening a new tab would
  // leave the exam page (and its full screen), which this exam doesn't allow.
  const [pdfViewer, setPdfViewer] = useState(null) // { attachment, url, loading, error }
  const pdfCacheRef = useRef(new Map()) // attachment id -> blob URL, so reopening is instant

  const deadlineRef = useRef(0) // browser-clock time the attempt ends
  const answersRef = useRef(answers)
  const saveTimerRef = useRef(null)
  const savingRef = useRef(false)
  const dirtyRef = useRef(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => () => clearTimeout(saveTimerRef.current), [])

  const toggleFlag = useCallback(
    (questionId) => setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] })),
    [],
  )

  const scrollToQuestion = useCallback((questionId) => {
    document
      .getElementById(`q-card-${questionId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  // The attempt is over (time up, closed by HR, already submitted…).
  const endAttempt = useCallback((text) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    setConfirmOpen(false)
    setMessage(text)
    setPhase('ended')
    exitFullscreen()
  }, [])

  // ---- start / resume ----
  useEffect(() => {
    if (!cameInFullscreen) return undefined
    let cancelled = false

    const run = async () => {
      try {
        const response = await authedFetch(examEndpoint(enrollmentId, 'Start'), { method: 'POST' })
        if (cancelled) return
        if (response.status === 409 || response.status === 410) {
          endAttempt(await extractErrorMessage(response, 'This exam can no longer be taken.'))
          return
        }
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, 'Failed to start the exam.'))
        }
        const data = await response.json()
        if (cancelled) return
        deadlineRef.current = Date.now() + data.secondsRemaining * 1000
        setSession(data)
        setAnswers(toAnswerMap(data.answers))
        setSecondsLeft(data.secondsRemaining)
        setPhase('ready')
      } catch (err) {
        if (cancelled) return
        console.error('Failed to start exam:', err)
        setMessage(err.message || 'Failed to start the exam.')
        setPhase('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [cameInFullscreen, enrollmentId, attempt, endAttempt, authedFetch])

  // ---- autosave ----
  // One request at a time. If something changes while a save is in flight,
  // another pass runs right after it, so the server never ends up with an
  // older copy overwriting a newer one.
  const flushSave = useCallback(async () => {
    if (submittingRef.current) return
    if (savingRef.current) {
      dirtyRef.current = true
      return
    }
    savingRef.current = true
    setSaveState('saving')
    try {
      do {
        dirtyRef.current = false
        const response = await sendJson(authedFetch, examEndpoint(enrollmentId, 'Answers'), 'PUT', {
          answers: toPayload(answersRef.current),
        })
        // A submit may have started (or finished) while this was in flight —
        // its outcome wins, so ignore whatever this late response says.
        if (submittingRef.current) return
        if (response.status === 409 || response.status === 410) {
          endAttempt(await extractErrorMessage(response, 'This exam can no longer be saved.'))
          return
        }
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, 'Failed to save your answers.'))
        }
      } while (dirtyRef.current)
      setSaveState(saveTimerRef.current ? 'dirty' : 'saved')
    } catch (err) {
      console.error('Failed to save answers:', err)
      setSaveState('error')
    } finally {
      savingRef.current = false
    }
  }, [authedFetch, enrollmentId, endAttempt])

  const updateAnswer = useCallback(
    (questionId, change) => {
      setAnswers((prev) => {
        const current = { ...EMPTY_ANSWER, ...prev[questionId] }
        const patch = typeof change === 'function' ? change(current) : change
        return { ...prev, [questionId]: { ...current, ...patch } }
      })
      setSaveState('dirty')
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        flushSave()
      }, AUTOSAVE_DELAY_MS)
    },
    [flushSave],
  )

  // ---- submit ----
  const submit = useCallback(
    async ({ auto = false } = {}) => {
      if (submittingRef.current) return
      submittingRef.current = true
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      setSubmitting(true)
      setSubmitError(null)
      try {
        const response = await sendJson(authedFetch, examEndpoint(enrollmentId, 'Submit'), 'POST', {
          answers: toPayload(answersRef.current),
        })
        if (response.status === 409 || response.status === 410) {
          endAttempt(await extractErrorMessage(response, 'This exam can no longer be submitted.'))
          return
        }
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, 'Failed to submit the exam.'))
        }
        setAutoSubmitted(auto)
        setSubmittedAt(new Date())
        setConfirmOpen(false)
        setPhase('submitted')
        exitFullscreen()
      } catch (err) {
        console.error('Failed to submit exam:', err)
        submittingRef.current = false // allow another try
        setSubmitError(err.message || 'Failed to submit the exam.')
      } finally {
        setSubmitting(false)
      }
    },
    [authedFetch, enrollmentId, endAttempt],
  )

  // Tells the proctor (via the server) when the applicant leaves full screen or the page loses focus.
  useExamIntegrityReporter({
    enabled: phase === 'ready',
    enrollmentId,
    authedFetch,
    isFullscreen,
  })

  // ---- reference PDFs ----
  // Fetched with authedFetch (a plain <iframe src> or link can't send the login
  // token) and shown from a blob URL.
  useEffect(() => {
    const cache = pdfCacheRef.current
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url))
      cache.clear()
    }
  }, [])

  const openPdf = useCallback(
    async (attachment) => {
      const cached = pdfCacheRef.current.get(attachment.id)
      setPdfViewer({ attachment, url: cached ?? null, loading: !cached, error: null })
      if (cached) return
      const patch = (change) =>
        setPdfViewer((v) => (v && v.attachment.id === attachment.id ? { ...v, ...change } : v))
      try {
        const response = await authedFetch(attachmentEndpoint(enrollmentId, attachment.id))
        if (response.status === 409 || response.status === 410) {
          // time ran out or HR closed the exam while the PDF was being opened
          setPdfViewer(null)
          endAttempt(await extractErrorMessage(response, 'This exam can no longer be taken.'))
          return
        }
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, 'Failed to load the document.'))
        }
        const blob = await response.blob()
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        pdfCacheRef.current.set(attachment.id, url)
        patch({ url, loading: false })
      } catch (err) {
        console.error('Failed to load reference PDF:', err)
        patch({ loading: false, error: err.message || 'Failed to load the document.' })
      }
    },
    [authedFetch, enrollmentId, endAttempt],
  )

  // ---- countdown (from the server's seconds-remaining, not the clock) ----
  useEffect(() => {
    if (phase !== 'ready') return undefined
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(id)
        submit({ auto: true })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [phase, submit])

  // ---- render ----
  if (!cameInFullscreen) {
    return <Navigate to={`/applicant/exam/${enrollmentId}`} replace />
  }

  const backButton = (
    <CButton color="dark" onClick={() => navigate('/applicant/schedules')}>
      Back to My Exam Schedules
    </CButton>
  )

  if (phase === 'loading') {
    return (
      <PortalShell subtitle="Examination in Progress">
        <PortalCenter>
          <div className="text-center text-body-secondary py-5">
            <CSpinner size="sm" className="me-2" />
            Loading your exam…
          </div>
        </PortalCenter>
      </PortalShell>
    )
  }

  if (phase === 'error') {
    return (
      <PortalShell subtitle="Examination in Progress">
        <PortalCenter>
          <CAlert color="danger" className="d-flex justify-content-between align-items-center mb-0">
            <span>{message}</span>
            <CButton
              color="danger"
              variant="outline"
              size="sm"
              onClick={() => {
                setPhase('loading')
                setAttempt((n) => n + 1)
              }}
            >
              Retry
            </CButton>
          </CAlert>
        </PortalCenter>
      </PortalShell>
    )
  }

  if (phase === 'ended') {
    return (
      <PortalShell subtitle="Examination Ended">
        <PortalCenter>
          <CCard className="shadow">
            <CCardBody className="text-center p-5">
              <PortalIcon icon={cilWarning} tone="warning" />
              <h4 className="fw-bolder">This exam has ended</h4>
              <p className="text-body-secondary">{message}</p>
              {backButton}
            </CCardBody>
          </CCard>
        </PortalCenter>
      </PortalShell>
    )
  }

  if (phase === 'submitted') {
    const submittedQuestions = session?.questions ?? []
    const submittedAnswered = submittedQuestions.filter((q) => isAnswered(q, answers[q.id])).length
    const receiptRows = [
      ['Examination:', session?.examTitle],
      ['Questions Answered:', `${submittedAnswered} of ${submittedQuestions.length}`],
      [
        'Submitted At:',
        submittedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? '—',
      ],
    ]
    return (
      <PortalShell subtitle="Submission Recorded">
        <PortalCenter maxWidth={576}>
          <CCard className="shadow-lg">
            <CCardBody className="text-center p-5">
              <PortalIcon icon={cilCheckCircle} tone="success" />
              <div>
                <CBadge color="success" shape="rounded-pill" className="text-uppercase px-3 py-2">
                  Submission Recorded
                </CBadge>
              </div>
              <h3 className="fw-bolder mt-3">Your exam has been submitted</h3>
              <p className="text-body-secondary small mb-4">
                {autoSubmitted
                  ? 'Time ran out, so your answers were submitted automatically.'
                  : 'Thank you. Your answers have been recorded.'}
              </p>
              <div className="bg-body-tertiary border rounded-4 p-3 text-start small d-grid gap-2 mb-4">
                {receiptRows.map(([label, value]) => (
                  <div key={label} className="d-flex justify-content-between gap-3">
                    <span className="text-body-secondary">{label}</span>
                    <span className="fw-bold text-end">{value}</span>
                  </div>
                ))}
              </div>
              {backButton}
            </CCardBody>
          </CCard>
        </PortalCenter>
      </PortalShell>
    )
  }

  // phase === 'ready'
  const questions = session.questions
  const total = questions.length
  const answerOf = (q) => answers[q.id] ?? EMPTY_ANSWER
  const missingRequired = questions
    .map((q, i) => ({ q, number: i + 1 }))
    .filter(({ q }) => q.required && !isAnswered(q, answers[q.id]))
  const unansweredCount = questions.filter((q) => !isAnswered(q, answers[q.id])).length
  const answeredCount = total - unansweredCount
  const flaggedCount = questions.filter((q) => flagged[q.id]).length
  const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0
  const totalPoints = questions.reduce((n, q) => n + q.points, 0)
  const timerTone = TIMER_TONES[secondsLeft <= 60 ? 'danger' : secondsLeft <= 300 ? 'warning' : 'normal']

  const saveLabel = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    error: null,
  }[saveState]

  const saveStatus =
    saveLabel ?? (
      <span className="text-danger">
        Couldn&apos;t save.{' '}
        <CButton color="link" size="sm" className="p-0 align-baseline" onClick={flushSave}>
          Retry
        </CButton>
      </span>
    )

  const hud = (
    <>
      <div className="d-none d-md-block text-end">
        <div
          className="text-uppercase fw-bold"
          style={{ fontSize: 10, letterSpacing: '.05em', color: 'rgba(255,255,255,.6)' }}
        >
          Completion Progress
        </div>
        <div className="small fw-bolder text-success">
          {answeredCount} of {total} Answered
        </div>
      </div>
      <div
        className={`d-flex align-items-center gap-2 rounded-3 px-3 py-1 ${
          timerTone.pulse ? 'exam-portal-pulse' : ''
        }`}
        style={{ background: timerTone.background, border: timerTone.border }}
      >
        <CIcon icon={cilClock} className={timerTone.icon} />
        <div>
          <div
            className="text-uppercase fw-bold"
            style={{ fontSize: 9, letterSpacing: '.05em', color: 'rgba(255,255,255,.6)', lineHeight: 1 }}
          >
            Time Left
          </div>
          <div className="font-monospace fw-bolder fs-6 text-white" style={{ lineHeight: 1.2 }}>
            {formatTime(secondsLeft)}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <PortalShell subtitle="Examination in Progress" hud={hud} progress={progressPct}>
        <CRow className="g-4 mx-auto w-100 pb-5" style={{ maxWidth: 1152 }}>
          <CCol lg={isFullscreen ? 8 : 12}>
            <CCard className="mb-3 shadow-sm">
              <CCardBody className="p-4">
                <h4 className="fw-bolder mb-1">{session.examTitle}</h4>
                <div className="small text-body-secondary">
                  {total} questions · {totalPoints} points
                </div>
              </CCardBody>
            </CCard>

            {submitError && !confirmOpen && (
              <CAlert color="danger" className="d-flex justify-content-between align-items-center">
                <span>{submitError}</span>
                <CButton color="danger" variant="outline" size="sm" onClick={() => submit()}>
                  Retry submit
                </CButton>
              </CAlert>
            )}

            {isFullscreen ? (
              <>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    answer={answerOf(q)}
                    updateAnswer={updateAnswer}
                    onViewAttachment={openPdf}
                    flagged={Boolean(flagged[q.id])}
                    onToggleFlag={toggleFlag}
                  />
                ))}

                <CCard className="shadow">
                  <CCardBody className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 p-4">
                    <div className="small">
                      <strong>
                        {answeredCount} of {total} questions answered
                      </strong>
                      <span className="d-block d-sm-inline ms-sm-2 text-body-secondary">
                        {flaggedCount > 0
                          ? `${flaggedCount} flagged for review.`
                          : 'Review flagged items before submitting.'}
                      </span>
                      <div className="text-body-secondary mt-1">{saveStatus}</div>
                    </div>
                    <CButton
                      color="success"
                      className="fw-bold px-4"
                      disabled={!isFullscreen || submitting}
                      onClick={() => setConfirmOpen(true)}
                    >
                      <CIcon icon={cilSend} className="me-2" />
                      Submit Examination
                    </CButton>
                  </CCardBody>
                </CCard>
              </>
            ) : (
              <CCard className="shadow-sm">
                <CCardBody className="text-center py-5">
                  <PortalIcon icon={cilFullscreen} tone="warning" />
                  <h5>You left full screen</h5>
                  <p className="text-body-secondary">
                    The questions are hidden until you return to full screen. Your time is still
                    running, and your answers so far are saved.
                  </p>
                  {canRequest && (
                    <CButton color="primary" onClick={enter}>
                      Return to Full Screen
                    </CButton>
                  )}
                  {fullscreenError && <div className="small text-danger mt-2">{fullscreenError}</div>}
                </CCardBody>
              </CCard>
            )}
          </CCol>

          {isFullscreen && (
            <CCol lg={4}>
              <div className="position-sticky" style={{ top: 0 }}>
                <CCard className="shadow-sm">
                  <CCardBody className="p-4">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                      <h6 className="text-uppercase fw-bolder small mb-0">Question Navigator</h6>
                      <span className="small fw-bold text-primary">
                        {answeredCount} / {total}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                      {questions.map((q, i) => {
                        const isFlagged = Boolean(flagged[q.id])
                        const done = isAnswered(q, answers[q.id])
                        return (
                          <CButton
                            key={q.id}
                            size="sm"
                            color={isFlagged ? 'warning' : done ? 'success' : 'secondary'}
                            variant={isFlagged || done ? undefined : 'outline'}
                            className="position-relative fw-bold"
                            style={{ height: 36 }}
                            aria-label={`Go to question ${i + 1}`}
                            onClick={() => scrollToQuestion(q.id)}
                          >
                            {i + 1}
                            {isFlagged && (
                              <span
                                className="position-absolute rounded-circle bg-danger"
                                style={{ width: 6, height: 6, top: 4, right: 4 }}
                              />
                            )}
                          </CButton>
                        )
                      })}
                    </div>

                    <div className="d-flex flex-wrap gap-3 border-top pt-3 mt-3 small text-body-secondary">
                      {[
                        ['bg-success', 'Answered'],
                        ['bg-warning', 'Flagged'],
                        ['bg-body border', 'Unanswered'],
                      ].map(([swatch, label]) => (
                        <div key={label} className="d-flex align-items-center gap-2">
                          <span
                            className={`d-inline-block rounded-1 ${swatch}`}
                            style={{ width: 12, height: 12 }}
                          />
                          {label}
                        </div>
                      ))}
                    </div>

                    <CButton
                      color="dark"
                      className="w-100 fw-bold mt-3"
                      disabled={submitting}
                      onClick={() => setConfirmOpen(true)}
                    >
                      <CIcon icon={cilCheckCircle} className="me-2 text-success" />
                      Finish &amp; Submit Exam
                    </CButton>
                    <div className="small text-body-secondary text-center mt-3">{saveStatus}</div>
                  </CCardBody>
                </CCard>
              </div>
            </CCol>
          )}
        </CRow>
      </PortalShell>

      {/* Hidden together with the questions if the applicant leaves full screen. */}
      <CModal
        visible={Boolean(pdfViewer) && isFullscreen}
        alignment="center"
        size="xl"
        onClose={() => setPdfViewer(null)}
      >
        <CModalHeader>
          <CModalTitle className="text-truncate">
            {pdfViewer?.attachment.fileName ?? 'Reference document'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {pdfViewer?.loading && (
            <div className="text-center text-body-secondary py-5">
              <CSpinner size="sm" className="me-2" />
              Loading document…
            </div>
          )}
          {pdfViewer?.error && <CAlert color="danger">{pdfViewer.error}</CAlert>}
          {pdfViewer?.url && (
            <>
              <iframe
                title={pdfViewer.attachment.fileName}
                src={pdfViewer.url}
                style={{ width: '100%', height: '70vh', border: 0 }}
              />
              <div className="small text-body-secondary mt-2">
                Can&apos;t see the document?{' '}
                <a href={pdfViewer.url} download={pdfViewer.attachment.fileName}>
                  Download it
                </a>
                . Your timer keeps running while this window is open.
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setPdfViewer(null)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal
        visible={confirmOpen}
        alignment="center"
        backdrop="static"
        onClose={() => !submitting && setConfirmOpen(false)}
      >
        <CModalHeader closeButton={false}>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 bg-primary-subtle text-primary flex-shrink-0"
              style={{ width: 40, height: 40 }}
            >
              <CIcon icon={cilSend} size="lg" />
            </div>
            <CModalTitle>Confirm Exam Submission</CModalTitle>
          </div>
        </CModalHeader>
        <CModalBody>
          <p className="small text-body-secondary">
            Are you sure you want to submit your examination? Once you submit, you can&apos;t change
            your answers or take the exam again.
          </p>
          {missingRequired.length > 0 ? (
            <CAlert color="danger" className="mb-0">
              <CIcon icon={cilWarning} className="me-2" />
              Answer all required questions before submitting. Still missing:{' '}
              {missingRequired.map(({ number }) => `Question ${number}`).join(', ')}.
            </CAlert>
          ) : (
            <>
              {unansweredCount > 0 && (
                <CAlert color="warning" className="mb-2">
                  <CIcon icon={cilWarning} className="me-2" />
                  You left {unansweredCount} optional question{unansweredCount === 1 ? '' : 's'}{' '}
                  unanswered.
                </CAlert>
              )}
              {flaggedCount > 0 && (
                <CAlert color="warning" className="mb-0">
                  <CIcon icon={cilFlagAlt} className="me-2" />
                  You still have {flaggedCount} question{flaggedCount === 1 ? '' : 's'} flagged for
                  review.
                </CAlert>
              )}
            </>
          )}
          {submitError && (
            <CAlert color="danger" className="mt-3 mb-0">
              {submitError}
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            disabled={submitting}
            onClick={() => setConfirmOpen(false)}
          >
            Review Answers
          </CButton>
          <CButton
            color="success"
            className="fw-bold"
            disabled={missingRequired.length > 0 || submitting}
            onClick={() => submit()}
          >
            {submitting && <CSpinner size="sm" className="me-2" />}
            Yes, Submit Now
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ApplicantExamTaking
