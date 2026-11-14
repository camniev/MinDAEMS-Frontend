import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormCheck,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilClock, cilDescription, cilFullscreen } from '@coreui/icons'
import { useApplicantAuth } from 'src/applicant/useApplicantAuth'
import { detectFullscreen, useFullscreen } from 'src/applicant/useFullScreen'
import { API_BASE_URL, extractErrorMessage, sendJson } from '../assets/api/Api'
import EssayEditor from './EssayEditor'

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

const QuestionCard = ({ question, index, answer, updateAnswer, onViewAttachment }) => {
  const multi = question.type === 'checkbox'
  const selected = answer.selectedOptionIds

  return (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex justify-content-between gap-3 mb-3">
          <h6 className="mb-0">
            <span className="text-primary me-1">{index + 1}.</span>
            {question.text}
            {question.required && <span className="text-danger ms-1">*</span>}
          </h6>
          <CBadge color="secondary" className="align-self-start text-nowrap">
            {question.points} {question.points === 1 ? 'pt' : 'pts'}
          </CBadge>
        </div>

        {question.attachment && (
          <div className="d-flex align-items-center gap-2 border rounded p-2 mb-3 bg-body-tertiary">
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
              {question.options.map((o) => (
                <div key={o.id} className="border rounded p-2 ps-4 bg-body-tertiary">
                  <CFormCheck
                    type={multi ? 'checkbox' : 'radio'}
                    name={`q-${question.id}`}
                    id={`q-${question.id}-${o.id}`}
                    label={o.text}
                    checked={selected.includes(o.id)}
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
                </div>
              ))}
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
    <CButton color="primary" onClick={() => navigate('/applicant/schedules')}>
      Back to My Exam Schedules
    </CButton>
  )

  if (phase === 'loading') {
    return (
      <div className="text-center text-body-secondary py-5">
        <CSpinner size="sm" className="me-2" />
        Loading your exam…
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <CAlert color="danger" className="d-flex justify-content-between align-items-center">
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
    )
  }

  if (phase === 'ended') {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <h5>This exam has ended</h5>
          <p className="text-body-secondary">{message}</p>
          {backButton}
        </CCardBody>
      </CCard>
    )
  }

  if (phase === 'submitted') {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CIcon icon={cilCheckCircle} size="3xl" className="text-success mb-3" />
          <h5>Your exam has been submitted</h5>
          <p className="text-body-secondary">
            {autoSubmitted
              ? 'Time ran out, so your answers were submitted automatically.'
              : 'Thank you. Your answers have been recorded.'}
          </p>
          {backButton}
        </CCardBody>
      </CCard>
    )
  }

  // phase === 'ready'
  const questions = session.questions
  const answerOf = (q) => answers[q.id] ?? EMPTY_ANSWER
  const missingRequired = questions
    .map((q, i) => ({ q, number: i + 1 }))
    .filter(({ q }) => q.required && !isAnswered(q, answers[q.id]))
  const unansweredCount = questions.filter((q) => !isAnswered(q, answers[q.id])).length
  const totalPoints = questions.reduce((n, q) => n + q.points, 0)
  const timerColor = secondsLeft <= 60 ? 'danger' : secondsLeft <= 300 ? 'warning' : 'primary'

  const saveLabel = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    error: null,
  }[saveState]

  return (
    <>
      <div className="mb-3">
        <h4 className="mb-0">{session.examTitle}</h4>
        <div className="small text-body-secondary">
          {questions.length} questions · {totalPoints} points
        </div>
      </div>

      {submitError && !confirmOpen && (
        <CAlert color="danger" className="d-flex justify-content-between align-items-center">
          <span>{submitError}</span>
          <CButton color="danger" variant="outline" size="sm" onClick={() => submit()}>
            Retry submit
          </CButton>
        </CAlert>
      )}

      {isFullscreen ? (
        questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            answer={answerOf(q)}
            updateAnswer={updateAnswer}
            onViewAttachment={openPdf}
          />
        ))
      ) : (
        <CCard>
          <CCardBody className="text-center py-5">
            <CIcon icon={cilFullscreen} size="3xl" className="text-warning mb-3" />
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

      {/* room so the fixed bar below never covers the last question */}
      <div style={{ height: 96 }} />

      <div
        className="position-fixed bottom-0 start-0 end-0 bg-body border-top shadow p-3"
        style={{ zIndex: 1030 }}
      >
        <div
          className="d-flex flex-wrap justify-content-between align-items-center gap-2 mx-auto"
          style={{ maxWidth: 960 }}
        >
          <div className="d-flex align-items-center gap-3">
            <CBadge color={timerColor} className="fs-6">
              <CIcon icon={cilClock} className="me-1" />
              {formatTime(secondsLeft)}
            </CBadge>
            <span className="small text-body-secondary">
              {saveLabel ?? (
                <span className="text-danger">
                  Couldn&apos;t save.{' '}
                  <CButton
                    color="link"
                    size="sm"
                    className="p-0 align-baseline"
                    onClick={flushSave}
                  >
                    Retry
                  </CButton>
                </span>
              )}
            </span>
          </div>
          <CButton
            color="success"
            disabled={!isFullscreen || submitting}
            onClick={() => setConfirmOpen(true)}
          >
            Submit Exam
          </CButton>
        </div>
      </div>

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
        <CModalHeader>
          <CModalTitle>Submit your exam?</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {missingRequired.length > 0 ? (
            <CAlert color="danger">
              Answer all required questions before submitting. Still missing:{' '}
              {missingRequired.map(({ number }) => `Question ${number}`).join(', ')}.
            </CAlert>
          ) : (
            <>
              {unansweredCount > 0 && (
                <CAlert color="warning">
                  You left {unansweredCount} optional question{unansweredCount === 1 ? '' : 's'}{' '}
                  unanswered.
                </CAlert>
              )}
              <p className="mb-0">
                Once you submit, you can&apos;t change your answers or take the exam again.
              </p>
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
            Keep working
          </CButton>
          <CButton
            color="success"
            disabled={missingRequired.length > 0 || submitting}
            onClick={() => submit()}
          >
            {submitting && <CSpinner size="sm" className="me-2" />}
            Yes, submit
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ApplicantExamTaking
