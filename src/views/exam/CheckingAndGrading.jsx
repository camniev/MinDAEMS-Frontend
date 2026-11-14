import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilPencil, cilReload, cilSave, cilWarning, cilXCircle } from '@coreui/icons'
import { API_BASE_URL, extractErrorMessage } from 'src/assets/api/Api'

// ---------------------------------------------------------------------------
// API. The exam list endpoint already exists. The three /Grading endpoints are
// NEW: their request/response shapes are described in the comments below and
// need a matching controller.
// ---------------------------------------------------------------------------
const EXAMS_ENDPOINT = `${API_BASE_URL}/Exam/GetExamSchedules`
const rosterEndpoint = (examId) => `${API_BASE_URL}/Grading/${examId}/Roster`
const submissionEndpoint = (enrollmentId) => `${API_BASE_URL}/Grading/Enrollments/${enrollmentId}`
const gradeEndpoint = (enrollmentId) => `${API_BASE_URL}/Grading/Enrollments/${enrollmentId}/Grade`

// GET Grading/{examId}/Roster ->
//   { passingScore, enrollments: [{ examEnrollmentId, applicantName, email, applicantCode,
//                                   enrollmentStatus, submittedAt, score }] }
//   (applicantName = Applicant.FullName, email = Applicant.Email,
//    applicantCode/enrollmentStatus/submittedAt/score = ExamEnrollment columns)
//
// GET Grading/Enrollments/{enrollmentId} ->
//   { examEnrollmentId, applicantName, email, applicantCode, enrollmentStatus,
//     submittedAt, score, passingScore,
//     questions: [{ id, type, text, points, isRequired, orderIndex,
//                   options: [{ id, text, isCorrect, orderIndex }] }],
//     answers:   [{ questionId, essayText, selectedOptionIds, pointsAwarded }] }
//
// PUT Grading/Enrollments/{enrollmentId}/Grade
//   body: { finalize: bool, marks: [{ questionId, pointsAwarded }] }
//   -> { score, totalAwarded, totalPossible }
//   The server should clamp each mark to 0..Question.Points, save it to
//   Answer.PointsAwarded and, only when finalize is true, recompute and store
//   ExamEnrollment.Score (percentage, 0-100).

const GRADABLE_EXCLUDED_STATUSES = ['Upcoming', 'Archived']

const FILTERS = [
  ['all', 'All'],
  ['NeedsGrading', 'Needs Grading'],
  ['Graded', 'Graded'],
]

const TYPE_LABELS = {
  mcq: 'Multiple Choice',
  truefalse: 'True / False',
  checkbox: 'Checkboxes',
  essay: 'Essay',
}

const ESSAY_CSS = `
.grading-essay p { margin: 0 0 .5rem; }
.grading-essay ul, .grading-essay ol { padding-left: 1.5rem; margin-bottom: .5rem; }
.grading-essay table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
.grading-essay th, .grading-essay td { border: 1px solid var(--cui-border-color); padding: .35rem .5rem; vertical-align: top; }
.grading-essay th { background: var(--cui-tertiary-bg); }
.grading-essay td > p, .grading-essay th > p { margin: 0; }
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fetchJson = async (url, fallback, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(await extractErrorMessage(response, fallback))
  return response.json()
}

const round2 = (n) => Math.round(n * 100) / 100
const isEssay = (q) => q.type === 'essay'
const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s)
const htmlToText = (s) =>
  (s ?? '')
    .replace(/<\/(p|li|tr|td|th|h[1-6]|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
const hasText = (s) => htmlToText(s).length > 0
const wordCount = (s) => (hasText(s) ? htmlToText(s).split(/\s+/).length : 0)
const formatDate = (s) => (s ? new Date(s).toLocaleString() : '—')

// Derived: the schema has no "grading status" column. Not submitted until
// SubmittedAt is set; graded once ExamEnrollment.Score has been finalized.
const gradingStatusOf = (en) => (!en.submittedAt ? 'NotSubmitted' : en.score == null ? 'NeedsGrading' : 'Graded')

// Objective questions: full points only for an exact match with the answer key,
// otherwise 0. Returns null when the question has no correct option defined,
// because that can't be auto-checked.
const autoScore = (q, answer) => {
  const picked = new Set(answer?.selectedOptionIds ?? [])
  const correct = (q.options ?? []).filter((o) => o.isCorrect).map((o) => o.id)
  if (correct.length === 0) return null
  if (picked.size === 0) return 0
  const exact = picked.size === correct.length && correct.every((id) => picked.has(id))
  return exact ? q.points : 0
}

// Starting marks for a submission. Points live on Answer.PointsAwarded, so a
// question with no Answer row can't hold points and is simply 0.
// null means "an essay that still needs marking".
const initialMarks = (detail) => {
  const answerByQ = Object.fromEntries(detail.answers.map((a) => [a.questionId, a]))
  const marks = {}
  detail.questions.forEach((q) => {
    const a = answerByQ[q.id]
    if (!a) marks[q.id] = 0
    else if (a.pointsAwarded != null) marks[q.id] = Number(a.pointsAwarded)
    else if (isEssay(q)) marks[q.id] = hasText(a.essayText) ? null : 0
    else marks[q.id] = autoScore(q, a)
  })
  return marks
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
const GradingBadge = ({ enrollment, passingScore }) => {
  const status = gradingStatusOf(enrollment)
  if (status === 'NotSubmitted') return <CBadge color="secondary">Not Submitted</CBadge>
  if (status === 'NeedsGrading') return <CBadge color="warning">Needs Grading</CBadge>
  const passed = Number(enrollment.score) >= passingScore
  return (
    <CBadge color={passed ? 'success' : 'danger'}>
      Graded • {enrollment.score}% ({passed ? 'Passed' : 'Failed'})
    </CBadge>
  )
}
GradingBadge.propTypes = {
  enrollment: PropTypes.shape({ submittedAt: PropTypes.string, score: PropTypes.number }).isRequired,
  passingScore: PropTypes.number,
}

const EssayAnswer = ({ text }) => {
  if (!hasText(text)) return <em className="text-body-secondary">No written response submitted.</em>
  // Saved essays are sanitized HTML (server-side). Older answers may be plain text.
  return looksLikeHtml(text) ? (
    <div className="grading-essay" dangerouslySetInnerHTML={{ __html: text }} />
  ) : (
    <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
  )
}
EssayAnswer.propTypes = { text: PropTypes.string }

const OptionRow = ({ option, picked }) => {
  const correct = option.isCorrect
  let tone = 'border bg-body-tertiary'
  let tag = null
  if (picked && correct) {
    tone = 'border border-success bg-success-subtle'
    tag = <CBadge color="success">Picked • Correct</CBadge>
  } else if (picked) {
    tone = 'border border-danger bg-danger-subtle'
    tag = <CBadge color="danger">Picked • Wrong</CBadge>
  } else if (correct) {
    tone = 'border border-success'
    tag = <CBadge color="success" shape="rounded-pill" className="opacity-75">Correct answer</CBadge>
  }
  return (
    <div
      className={`d-flex align-items-center gap-2 rounded px-3 py-2 small ${tone}`}
      style={!picked && correct ? { borderStyle: 'dashed' } : undefined}
    >
      <span>{picked ? '◉' : '○'}</span>
      <span className="flex-grow-1">{option.text}</span>
      {tag}
    </div>
  )
}
OptionRow.propTypes = {
  option: PropTypes.shape({ text: PropTypes.string, isCorrect: PropTypes.bool }).isRequired,
  picked: PropTypes.bool,
}

const QuestionCard = ({ index, question: q, answer, mark, onMark }) => {
  const answered = Boolean(answer)
  const auto = answered && !isEssay(q) ? autoScore(q, answer) : null
  const overridden = auto != null && mark != null && mark !== auto

  let status
  if (!answered) status = <CBadge color="secondary">Not answered • 0 pts</CBadge>
  else if (mark == null) {
    status = (
      <CBadge color="warning">
        <CIcon icon={cilPencil} size="sm" className="me-1" />
        Needs manual marking
      </CBadge>
    )
  } else if (mark === q.points) {
    status = (
      <CBadge color="success">
        <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
        Full marks • {mark} pts
      </CBadge>
    )
  } else if (mark > 0) {
    status = <CBadge color="warning">Partial • {mark} pts</CBadge>
  } else {
    status = (
      <CBadge color="danger">
        <CIcon icon={cilXCircle} size="sm" className="me-1" />
        0 pts
      </CBadge>
    )
  }

  const commit = (raw) => {
    if (raw === '' || raw == null) return onMark(q.id, isEssay(q) ? null : 0)
    const n = parseFloat(raw)
    if (Number.isNaN(n)) return onMark(q.id, mark)
    return onMark(q.id, round2(Math.min(Math.max(n, 0), q.points)))
  }

  const selected = new Set(answer?.selectedOptionIds ?? [])
  const options = [...(q.options ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <CCard className="mb-3">
      <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2">
          <CBadge color="dark" shape="rounded-pill">{index + 1}</CBadge>
          <span className="small fw-semibold text-uppercase text-body-secondary">
            {TYPE_LABELS[q.type] ?? q.type}
          </span>
          <span className="small text-body-secondary">• Max {q.points} pts</span>
          {!q.isRequired && <CBadge color="light" textColor="dark">Optional</CBadge>}
        </div>
        <div className="d-flex align-items-center gap-2">
          {overridden && <CBadge color="info">Overridden (auto: {auto})</CBadge>}
          {status}
        </div>
      </CCardHeader>

      <CCardBody>
        <p className="fw-semibold mb-3" style={{ whiteSpace: 'pre-wrap' }}>{q.text}</p>

        {isEssay(q) ? (
          <div className="border rounded p-3 bg-body-tertiary">
            <div className="d-flex justify-content-between small text-body-secondary mb-2">
              <span className="text-uppercase fw-semibold">Examinee&apos;s written response</span>
              {answered && <span>{wordCount(answer.essayText)} words</span>}
            </div>
            <EssayAnswer text={answer?.essayText} />
          </div>
        ) : (
          <div className="d-grid gap-2">
            {options.map((o) => (
              <OptionRow key={o.id} option={o} picked={selected.has(o.id)} />
            ))}
            {!answered && <em className="small text-body-secondary">No option selected.</em>}
          </div>
        )}

        <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
          <label className="small fw-semibold mb-0" htmlFor={`pts-${q.id}`}>Awarded points:</label>
          <CFormInput
            // key forces a refresh when the quick buttons / re-run change the value
            key={`${q.id}-${mark}`}
            id={`pts-${q.id}`}
            type="number"
            size="sm"
            min={0}
            max={q.points}
            step={0.5}
            style={{ width: '5.5rem' }}
            disabled={!answered}
            defaultValue={mark ?? ''}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <span className="small text-body-secondary">/ {q.points}</span>
          <div className="d-flex gap-1 ms-1">
            <CButton size="sm" color="danger" variant="outline" disabled={!answered} onClick={() => onMark(q.id, 0)}>0</CButton>
            <CButton size="sm" color="warning" variant="outline" disabled={!answered} onClick={() => onMark(q.id, round2(q.points / 2))}>50%</CButton>
            <CButton size="sm" color="success" variant="outline" disabled={!answered} onClick={() => onMark(q.id, q.points)}>Full ({q.points})</CButton>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}
QuestionCard.propTypes = {
  index: PropTypes.number.isRequired,
  question: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    text: PropTypes.string,
    points: PropTypes.number,
    isRequired: PropTypes.bool,
    options: PropTypes.array,
  }).isRequired,
  answer: PropTypes.shape({
    essayText: PropTypes.string,
    selectedOptionIds: PropTypes.array,
  }),
  mark: PropTypes.number,
  onMark: PropTypes.func.isRequired,
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const CheckingAndGrading = ({ initialExamId }) => {
  const [exams, setExams] = useState([])
  const [examsState, setExamsState] = useState('loading') // loading | ready | error
  const [examId, setExamId] = useState(initialExamId ?? '')

  const [roster, setRoster] = useState(null)
  const [rosterState, setRosterState] = useState('idle') // idle | loading | ready | error
  const [rosterError, setRosterError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // bump to re-fetch the roster (Retry button)

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailState, setDetailState] = useState('idle')
  const [detailError, setDetailError] = useState(null)
  const [marks, setMarks] = useState({})
  const [baseline, setBaseline] = useState({})

  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null) // { color, text }

  const dirty = JSON.stringify(marks) !== JSON.stringify(baseline)
  const confirmDiscard = () =>
    !dirty || window.confirm('You have unsaved marks for this submission. Discard them?')

  // --- exam list -------------------------------------------------------------
  useEffect(() => {
    let ignore = false
    fetchJson(EXAMS_ENDPOINT, 'Failed to load exam schedules.')
      .then((list) => {
        if (ignore) return
        const gradable = list.filter((e) => !GRADABLE_EXCLUDED_STATUSES.includes(e.status))
        setExams(gradable)
        setExamId((cur) => cur || gradable[0]?.examId || '')
        setExamsState('ready')
      })
      .catch((err) => {
        if (ignore) return
        console.error(err)
        setExamsState('error')
        setNotice({ color: 'danger', text: err.message })
      })
    return () => {
      ignore = true
    }
  }, [])

  // --- roster for the selected exam -----------------------------------------
  const refreshRoster = useCallback(async (id) => {
    const data = await fetchJson(rosterEndpoint(id), 'Failed to load submissions.')
    setRoster(data)
    return data
  }, [])

  useEffect(() => {
    if (!examId) return undefined
    let ignore = false
    setRosterState('loading')
    setRosterError(null)
    setRoster(null)
    setSelectedId(null)
    setDetail(null)
    refreshRoster(examId)
      .then((data) => {
        if (ignore) return
        setRosterState('ready')
        const first =
          data.enrollments.find((e) => gradingStatusOf(e) === 'NeedsGrading') ??
          data.enrollments.find((e) => e.submittedAt)
        setSelectedId(first?.examEnrollmentId ?? null)
      })
      .catch((err) => {
        if (ignore) return
        console.error(err)
        setRosterError(err.message)
        setRosterState('error')
      })
    return () => {
      ignore = true
    }
  }, [examId, refreshRoster, reloadKey])

  // --- one submission --------------------------------------------------------
  useEffect(() => {
    if (!selectedId) return undefined
    let ignore = false
    setDetailState('loading')
    setDetailError(null)
    setNotice(null)
    fetchJson(submissionEndpoint(selectedId), 'Failed to load this submission.')
      .then((data) => {
        if (ignore) return
        const start = initialMarks(data)
        setDetail(data)
        setMarks(start)
        setBaseline(start)
        setDetailState('ready')
      })
      .catch((err) => {
        if (ignore) return
        console.error(err)
        setDetailError(err.message)
        setDetailState('error')
      })
    return () => {
      ignore = true
    }
  }, [selectedId])

  // --- derived ---------------------------------------------------------------
  const questions = useMemo(
    () => [...(detail?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [detail],
  )
  const answerByQ = useMemo(
    () => Object.fromEntries((detail?.answers ?? []).map((a) => [a.questionId, a])),
    [detail],
  )
  const passingScore = detail?.passingScore ?? roster?.passingScore ?? 0

  const totals = useMemo(() => {
    const possible = questions.reduce((s, q) => s + q.points, 0)
    const earned = round2(questions.reduce((s, q) => s + (marks[q.id] ?? 0), 0))
    const percentage = possible > 0 ? round2((earned / possible) * 100) : 0
    const pendingEssays = questions.filter(
      (q) => isEssay(q) && answerByQ[q.id] && marks[q.id] == null,
    ).length
    return { possible, earned, percentage, passed: percentage >= passingScore, pendingEssays }
  }, [questions, marks, answerByQ, passingScore])

  const visibleEnrollments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (roster?.enrollments ?? []).filter((e) => {
      if (filter !== 'all' && gradingStatusOf(e) !== filter) return false
      if (!needle) return true
      return [e.applicantName, e.email, e.applicantCode].some((v) => (v ?? '').toLowerCase().includes(needle))
    })
  }, [roster, filter, query])

  // --- actions ---------------------------------------------------------------
  const selectExam = (id) => {
    if (id === examId || !confirmDiscard()) return
    setExamId(id)
    setNotice(null)
  }

  const selectEnrollment = (id) => {
    if (id === selectedId || !confirmDiscard()) return
    setSelectedId(id)
  }

  const setMark = (questionId, value) => setMarks((prev) => ({ ...prev, [questionId]: value }))

  const rerunAutoCheck = () =>
    setMarks((prev) => {
      const next = { ...prev }
      questions.forEach((q) => {
        const a = answerByQ[q.id]
        if (isEssay(q) || !a) return
        const s = autoScore(q, a)
        if (s != null) next[q.id] = s
      })
      return next
    })

  const save = async (finalize) => {
    setSaving(true)
    setNotice(null)
    try {
      const body = {
        finalize,
        marks: questions
          .filter((q) => answerByQ[q.id] && marks[q.id] != null)
          .map((q) => ({ questionId: q.id, pointsAwarded: marks[q.id] })),
      }
      const result = await fetchJson(gradeEndpoint(selectedId), 'Failed to save grades.', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const score = result?.score ?? totals.percentage
      setBaseline(marks)
      if (finalize) setDetail((d) => ({ ...d, score }))
      setNotice({
        color: 'success',
        text: finalize ? `Grade finalized: ${score}%.` : 'Progress saved.',
      })
      await refreshRoster(examId)
    } catch (err) {
      console.error(err)
      setNotice({ color: 'danger', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // --- render ----------------------------------------------------------------
  const selectedEnrollment = roster?.enrollments.find((e) => e.examEnrollmentId === selectedId)
  const alreadyGraded = detail?.score != null

  return (
    <>
      <style>{ESSAY_CSS}</style>

      <CCard className="mb-4">
        <CCardBody className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div style={{ minWidth: '18rem', flex: '1 1 24rem', maxWidth: '36rem' }}>
            <label className="small fw-semibold text-uppercase text-body-secondary mb-1" htmlFor="grading-exam">
              Exam schedule to check
            </label>
            <CFormSelect
              id="grading-exam"
              value={examId}
              disabled={examsState !== 'ready' || exams.length === 0}
              onChange={(e) => selectExam(e.target.value)}
            >
              {exams.length === 0 && <option value="">No exam schedules to grade</option>}
              {exams.map((e) => (
                <option key={e.examId} value={e.examId}>
                  {e.examTitle} ({e.examCode}) — {e.status}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="small text-body-secondary">
            Passing score: <strong>{passingScore}%</strong>
          </div>
        </CCardBody>
      </CCard>

      {examsState === 'loading' && (
        <div className="text-center text-body-secondary py-5">
          <CSpinner size="sm" className="me-2" />
          Loading exam schedules…
        </div>
      )}

      {notice && !selectedId && <CAlert color={notice.color}>{notice.text}</CAlert>}

      <CRow className="g-4 align-items-start">
        {/* ---------------- Roster ---------------- */}
        <CCol lg={4}>
          <CCard>
            <CCardHeader className="d-flex align-items-center justify-content-between">
              <div>
                <div className="fw-semibold">Examinee Submissions</div>
                <div className="small text-body-secondary">Select an applicant to mark</div>
              </div>
              <CBadge color="primary" shape="rounded-pill">{visibleEnrollments.length}</CBadge>
            </CCardHeader>
            <CCardBody className="border-bottom">
              <div className="d-flex flex-wrap gap-1 mb-2">
                {FILTERS.map(([value, label]) => (
                  <CButton
                    key={value}
                    size="sm"
                    color="primary"
                    variant={filter === value ? undefined : 'outline'}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </CButton>
                ))}
              </div>
              <CFormInput
                size="sm"
                placeholder="Search name, email or applicant code…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </CCardBody>

            {rosterState === 'loading' && (
              <div className="text-center text-body-secondary py-4">
                <CSpinner size="sm" className="me-2" />
                Loading submissions…
              </div>
            )}
            {rosterState === 'error' && (
              <CAlert color="danger" className="m-3 d-flex justify-content-between align-items-center">
                <span>{rosterError}</span>
                <CButton size="sm" color="danger" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </CButton>
              </CAlert>
            )}
            {rosterState === 'ready' && visibleEnrollments.length === 0 && (
              <div className="text-center small text-body-secondary p-4">
                {roster.enrollments.length === 0
                  ? 'No applicants are enrolled in this exam.'
                  : 'No submissions match this filter.'}
              </div>
            )}

            <CListGroup flush style={{ maxHeight: '650px', overflowY: 'auto' }}>
              {visibleEnrollments.map((e) => (
                <CListGroupItem
                  key={e.examEnrollmentId}
                  action
                  tabIndex={0}
                  active={e.examEnrollmentId === selectedId}
                  onClick={() => selectEnrollment(e.examEnrollmentId)}
                  onKeyDown={(ev) => ev.key === 'Enter' && selectEnrollment(e.examEnrollmentId)}
                  className="text-start"
                >
                  <div className="fw-semibold text-truncate">{e.applicantName}</div>
                  <div className="small opacity-75 text-truncate">{e.email}</div>
                  <div className="mt-1 d-flex flex-wrap align-items-center gap-2">
                    <GradingBadge enrollment={e} passingScore={roster.passingScore} />
                    {e.enrollmentStatus === 'Disqualified' && <CBadge color="danger">Disqualified</CBadge>}
                  </div>
                </CListGroupItem>
              ))}
            </CListGroup>
          </CCard>
        </CCol>

        {/* ---------------- Marking pane ---------------- */}
        <CCol lg={8}>
          {!selectedId && rosterState === 'ready' && (
            <CCard>
              <CCardBody className="text-center text-body-secondary py-5">
                {roster.enrollments.some((e) => e.submittedAt)
                  ? 'Select an examinee from the roster to begin checking.'
                  : 'Nobody has submitted this exam yet.'}
              </CCardBody>
            </CCard>
          )}

          {selectedId && detailState === 'loading' && (
            <div className="text-center text-body-secondary py-5">
              <CSpinner size="sm" className="me-2" />
              Loading submission…
            </div>
          )}

          {selectedId && detailState === 'error' && (
            <CAlert color="danger">{detailError}</CAlert>
          )}

          {selectedId && detailState === 'ready' && detail && !detail.submittedAt && (
            <CCard>
              <CCardBody className="text-center py-5">
                <h5 className="mb-1">{detail.applicantName}</h5>
                <p className="small text-body-secondary mb-0">
                  Status: <strong>{detail.enrollmentStatus}</strong> — this applicant has not
                  submitted their exam yet.
                </p>
              </CCardBody>
            </CCard>
          )}

          {selectedId && detailState === 'ready' && detail?.submittedAt && (
            <>
              <CCard className="mb-3">
                <CCardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <h4 className="mb-0">{detail.applicantName}</h4>
                        <CBadge color="secondary">{detail.applicantCode}</CBadge>
                        {detail.enrollmentStatus === 'Disqualified' && (
                          <CBadge color="danger">Disqualified</CBadge>
                        )}
                      </div>
                      <div className="small text-body-secondary mt-1">
                        {detail.email} • Submitted: {formatDate(detail.submittedAt)}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <div className="border rounded px-3 py-2 text-end">
                        <div className="small text-uppercase text-body-secondary">Raw points</div>
                        <div className="fw-bold">
                          {totals.earned} <span className="small text-body-secondary">/ {totals.possible}</span>
                        </div>
                      </div>
                      <div className={`border rounded px-3 py-2 text-end ${totals.passed ? 'border-success text-success' : 'border-danger text-danger'}`}>
                        <div className="small text-uppercase">Final percentage</div>
                        <div className="fw-bold">{totals.percentage}% ({totals.passed ? 'PASS' : 'FAIL'})</div>
                      </div>
                    </div>
                  </div>

                  {totals.pendingEssays > 0 && (
                    <CAlert color="warning" className="d-flex align-items-center gap-2 mt-3 mb-0">
                      <CIcon icon={cilWarning} />
                      {totals.pendingEssays} essay answer{totals.pendingEssays > 1 ? 's' : ''} still need
                      manual marking before the grade can be finalized.
                    </CAlert>
                  )}
                  {detail.enrollmentStatus === 'Disqualified' && (
                    <CAlert color="danger" className="mt-3 mb-0">
                      This applicant is marked Disqualified. Check whether this submission should be graded.
                    </CAlert>
                  )}
                </CCardBody>
              </CCard>

              {questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  index={i}
                  question={q}
                  answer={answerByQ[q.id]}
                  mark={marks[q.id]}
                  onMark={setMark}
                />
              ))}

              {notice && <CAlert color={notice.color}>{notice.text}</CAlert>}

              <CCard className="position-sticky bottom-0 shadow" style={{ zIndex: 10 }}>
                <CCardBody className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <div className="small text-body-secondary">
                      Computed grade for <strong>{selectedEnrollment?.applicantName ?? detail.applicantName}</strong>
                      {dirty && <CBadge color="warning" className="ms-2">Unsaved changes</CBadge>}
                    </div>
                    <div className="fw-bold">
                      {totals.earned} / {totals.possible} points
                      <CBadge color={totals.passed ? 'success' : 'danger'} className="ms-2">
                        {totals.percentage}% — {totals.passed ? 'PASSED' : 'FAILED'}
                      </CBadge>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <CButton color="secondary" variant="outline" onClick={rerunAutoCheck} disabled={saving}>
                      <CIcon icon={cilReload} className="me-1" />
                      Re-run auto-check
                    </CButton>
                    <CButton color="primary" variant="outline" onClick={() => save(false)} disabled={saving || !dirty}>
                      <CIcon icon={cilSave} className="me-1" />
                      Save progress
                    </CButton>
                    <CButton
                      color="success"
                      onClick={() => save(true)}
                      disabled={saving || totals.pendingEssays > 0}
                      title={totals.pendingEssays > 0 ? 'Mark all essay answers first' : undefined}
                    >
                      {saving ? <CSpinner size="sm" className="me-1" /> : <CIcon icon={cilCheckCircle} className="me-1" />}
                      {alreadyGraded ? 'Update final grade' : 'Save & finalize grade'}
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </>
          )}
        </CCol>
      </CRow>
    </>
  )
}

CheckingAndGrading.propTypes = { initialExamId: PropTypes.string }

export default CheckingAndGrading
