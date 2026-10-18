import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilClock, cilPaperPlane } from '@coreui/icons'
import { useExam } from './ExamContext'

// Vite only inlines env vars that are (a) prefixed VITE_ and (b) read via
// import.meta.env — `import.meta.ADD_NEW_EXAM_SCHEDULES_API_ENDPOINT` is
// neither, so it was always `undefined` and every request went to
// "undefined/Exam/AddNewExamSchedules". Add VITE_API_BASE_URL to your .env
// (and restart `npm run dev` — Vite only reads .env at startup).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const ADD_NEW_EXAM_SCHEDULES_API_ENDPOINT = `${API_BASE_URL}/api/Exam/AddNewExamSchedules`
const USER_ID = '24fefc6e-ed0a-4e2e-95f3-9e448928e31d'

/** Reads a useful message out of a failed fetch Response, including
 * ASP.NET Core's ValidationProblemDetails shape ({ title, errors: {Field: [...]} }). */
const extractErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json()

    if (typeof data === 'string' && data.trim()) {
      return data
    }

    const firstFieldError = Object.values(data?.errors ?? {})[0]

    if (Array.isArray(firstFieldError) && firstFieldError.length) {
      return firstFieldError[0]
    }

    return data?.message || fallback
  } catch {
    return fallback
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const todayISO = () => new Date().toISOString().split('T')[0]

const emptyExam = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return {
    examTitle: '',
    examCode: '',
    accessType: 'Private',
    examDate: d.toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: 60,
    passingScore: 70,
    instructions: '',
  }
}

const validateExam = (f) => {
  const errors = {}
  if (!f.examTitle.trim()) errors.examTitle = 'Exam title is required.'
  if (!f.examCode.trim()) errors.examCode = 'Exam code is required.'
  else if (!/^[A-Za-z0-9_-]+$/.test(f.examCode.trim()))
    errors.examCode = 'Use only letters, numbers, underscores, and dashes.'
  if (!f.examDate) errors.examDate = 'Scheduled date is required.'
  else if (f.examDate < todayISO()) errors.examDate = 'Date cannot be in the past.'
  if (!f.startTime) errors.startTime = 'Start time is required.'
  const durationMinutes = Number(f.durationMinutes)
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) errors.durationMinutes = 'Duration must be at least 5 minutes.'
  const passingScore = Number(f.passingScore)
  if (!Number.isFinite(passingScore) || passingScore < 1 || passingScore > 100)
    errors.passingScore = 'Passing score must be between 1 and 100.'
  return errors
}

const CreateExamModal = () => {
  const { createOpen, closeCreate, addExam, toast } = useExam()
  const [f, setF] = useState(emptyExam)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isMounted = useRef(true)
  useEffect(
    () => () => {
      isMounted.current = false
    },
    [],
  )

  const set = (k) => (e) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }))
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))
  }

  const handleShow = () => {
    setF(emptyExam())
    setErrors({})
    setIsSubmitting(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    const validationErrors = validateExam(f)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    const payload = {
      examTitle: f.examTitle.trim(),
      examCode: f.examCode.trim().toUpperCase(),
      accessType: f.accessType,
      examDate: f.examDate,
      // normalize "HH:MM" from <input type="time"> to "HH:MM:SS" for .NET TimeOnly
      startTime: f.startTime.length === 5 ? `${f.startTime}:00` : f.startTime,
      durationMinutes: Number(f.durationMinutes),
      passingScore: Number(f.passingScore),
      instructions: f.instructions.trim(),
      userId: USER_ID,
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(ADD_NEW_EXAM_SCHEDULES_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to save the exam schedule.'))
      }

      // AddNewExamSchedules only returns { message: "..." } — it doesn't send
      // back the saved row (no generated ExamId, no server-assigned fields).
      // So there's nothing useful to read off the response for addExam; sync
      // the form data we already have instead. If you later change the
      // endpoint to return the created exam (recommended — the UI can't know
      // the real ExamId otherwise), swap this back to reading `created`.
      const created = await response.json().catch(() => null)
      addExam(payload)
      toast('Examination schedule added successfully.', 'success')
      closeCreate()
    } catch (error) {
      console.error(`Failed to save the exam schedule: ${error}`)
      toast(error.message || 'Failed to save the exam schedule.', 'error')
    } finally {
      if (isMounted.current) setIsSubmitting(false)
    }
  }

  return (
    <CModal
      size="lg"
      visible={createOpen}
      onShow={handleShow}
      onClose={() => !isSubmitting && closeCreate()}
      backdrop={isSubmitting ? 'static' : true}
      keyboard={!isSubmitting}
      scrollable
      alignment="center"
    >
      <CForm noValidate onSubmit={submit}>
        <CModalHeader closeButton={!isSubmitting}>
          <CModalTitle>Schedule New Examination</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel>Exam Title *</CFormLabel>
              <CFormInput
                placeholder="e.g. DMO I KMD Examination"
                value={f.examTitle}
                onChange={set('examTitle')}
                invalid={!!errors.examTitle}
                feedbackInvalid={errors.examTitle}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Exam Code *</CFormLabel>
              <CFormInput
                placeholder="e.g. DMO_I_KMD"
                value={f.examCode}
                onChange={set('examCode')}
                invalid={!!errors.examCode}
                feedbackInvalid={errors.examCode}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Access Type *</CFormLabel>
              <CFormSelect value={f.accessType} onChange={set('accessType')} disabled={isSubmitting}>
                <option value="Private">Private (Passcode Required)</option>
                <option value="Public">Public Access</option>
              </CFormSelect>
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Scheduled Date *</CFormLabel>
              <CFormInput
                type="date"
                min={todayISO()}
                value={f.examDate}
                onChange={set('examDate')}
                invalid={!!errors.examDate}
                feedbackInvalid={errors.examDate}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Start Time *</CFormLabel>
              <CFormInput
                type="time"
                value={f.startTime}
                onChange={set('startTime')}
                invalid={!!errors.startTime}
                feedbackInvalid={errors.startTime}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Duration (Minutes) *</CFormLabel>
              <CFormInput
                type="number"
                min={5}
                value={f.duration}
                onChange={set('duration')}
                invalid={!!errors.duration}
                feedbackInvalid={errors.duration}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Passing Score (%) *</CFormLabel>
              <CFormInput
                type="number"
                min={1}
                max={100}
                value={f.passingScore}
                onChange={set('passingScore')}
                invalid={!!errors.passingScore}
                feedbackInvalid={errors.passingScore}
                disabled={isSubmitting}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Instructions &amp; Guidelines</CFormLabel>
              <CFormTextarea
                rows={3}
                placeholder="Specify exam rules, allowed calculators, reference materials, etc..."
                value={f.instructions}
                onChange={set('instructions')}
                disabled={isSubmitting}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeCreate} disabled={isSubmitting}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting && <CSpinner size="sm" className="me-2" />}
            Save Schedule Event
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const blankExaminee = { name: '', email: '', studentId: '', department: '' }

const validateExaminee = (f) => {
  const errors = {}
  if (!f.name.trim()) errors.name = 'Full name is required.'
  if (!f.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Enter a valid email address.'
  if (!f.studentId.trim()) errors.studentId = 'Student ID is required.'
  return errors
}

/** Parses "Name, Email, StudentID, Department" lines, validating and
 * de-duplicating by email (case-insensitive) within the pasted batch. */
const parseBulkExaminees = (raw) => {
  const seenEmails = new Set()
  const valid = []
  const skipped = []

  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [name, email, studentId, department] = line.split(',').map((p) => p.trim())
      const lineNo = i + 1
      if (!name || !email) {
        skipped.push(`Line ${lineNo}: missing name or email.`)
        return
      }
      if (!EMAIL_RE.test(email)) {
        skipped.push(`Line ${lineNo}: invalid email "${email}".`)
        return
      }
      const key = email.toLowerCase()
      if (seenEmails.has(key)) {
        skipped.push(`Line ${lineNo}: duplicate email "${email}".`)
        return
      }
      seenEmails.add(key)
      valid.push({
        name,
        email,
        studentId: studentId || `STU-${Math.floor(1000 + Math.random() * 9000)}`,
        department: department || 'General',
      })
    })

  return { valid, skipped }
}

const AddExamineeModal = () => {
  const { addExamineeOpen, closeAddExaminee, addExaminees, toast } = useExam()
  const [tab, setTab] = useState('single')
  const [f, setF] = useState(blankExaminee)
  const [errors, setErrors] = useState({})
  const [bulk, setBulk] = useState('')

  const handleShow = () => {
    setTab('single')
    setF(blankExaminee)
    setErrors({})
    setBulk('')
  }

  const set = (k) => (e) => {
    setF((prev) => ({ ...prev, [k]: e.target.value }))
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev))
  }

  const single = (e) => {
    e.preventDefault()
    const validationErrors = validateExaminee(f)
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }
    addExaminees(
      [
        {
          name: f.name.trim(),
          email: f.email.trim(),
          studentId: f.studentId.trim(),
          department: f.department.trim(),
        },
      ],
      `Added ${f.name.trim()} to roster. Invite code sent!`,
    )
    closeAddExaminee()
  }

  const bulkSubmit = (e) => {
    e.preventDefault()
    const { valid, skipped } = parseBulkExaminees(bulk)
    if (!valid.length) {
      toast('No valid lines found. Use: Full Name, Email, StudentID, Department', 'error')
      return
    }
    addExaminees(
      valid,
      `Imported ${valid.length} examinee${valid.length === 1 ? '' : 's'}${
        skipped.length ? ` (${skipped.length} line${skipped.length === 1 ? '' : 's'} skipped)` : ''
      }!`,
    )
    if (skipped.length) console.warn('Skipped bulk import lines:', skipped)
    closeAddExaminee()
  }

  return (
    <CModal visible={addExamineeOpen} onShow={handleShow} onClose={closeAddExaminee} alignment="center">
      <CModalHeader>
        <CModalTitle>Add Examinees to Schedule</CModalTitle>
      </CModalHeader>
      <CNav variant="tabs" layout="fill">
        <CNavItem>
          <CNavLink as="button" active={tab === 'single'} onClick={() => setTab('single')}>
            Single Entry
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink as="button" active={tab === 'bulk'} onClick={() => setTab('bulk')}>
            Bulk Paste / Import
          </CNavLink>
        </CNavItem>
      </CNav>
      {tab === 'single' ? (
        <CForm noValidate onSubmit={single}>
          <CModalBody className="d-grid gap-3">
            <div>
              <CFormLabel>Full Name *</CFormLabel>
              <CFormInput
                placeholder="e.g. Alexander Wright"
                value={f.name}
                onChange={set('name')}
                invalid={!!errors.name}
                feedbackInvalid={errors.name}
              />
            </div>
            <div>
              <CFormLabel>Email Address *</CFormLabel>
              <CFormInput
                type="email"
                placeholder="alexander@university.edu"
                value={f.email}
                onChange={set('email')}
                invalid={!!errors.email}
                feedbackInvalid={errors.email}
              />
            </div>
            <CRow className="g-3">
              <CCol xs={6}>
                <CFormLabel>Student ID *</CFormLabel>
                <CFormInput
                  placeholder="STU-2026-09"
                  value={f.studentId}
                  onChange={set('studentId')}
                  invalid={!!errors.studentId}
                  feedbackInvalid={errors.studentId}
                />
              </CCol>
              <CCol xs={6}>
                <CFormLabel>Department</CFormLabel>
                <CFormInput
                  placeholder="Computer Science"
                  value={f.department}
                  onChange={set('department')}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeAddExaminee}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              Add Examinee
            </CButton>
          </CModalFooter>
        </CForm>
      ) : (
        <CForm noValidate onSubmit={bulkSubmit}>
          <CModalBody>
            <CFormLabel>Paste Bulk Examinee Records</CFormLabel>
            <p className="small text-body-secondary">
              Format line by line: <code>Full Name, Email, StudentID, Department</code>. Student ID and
              department are optional — blank ones get a generated ID and &quot;General&quot;.
            </p>
            <CFormTextarea
              rows={6}
              className="font-monospace small"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={
                'John Doe, john@univ.edu, STU-101, CS\nJane Smith, jane@univ.edu, STU-102, CS\nMark Lee, mark@univ.edu, STU-103, Engineering'
              }
            />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={closeAddExaminee}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit">
              Process Bulk Import
            </CButton>
          </CModalFooter>
        </CForm>
      )}
    </CModal>
  )
}

const pad = (n) => String(n).padStart(2, '0')

const PreviewPaper = ({ exam, onSubmit }) => {
  const [secs, setSecs] = useState(Math.max(exam.duration, 0) * 60)
  const [locked, setLocked] = useState(false)
  const lockedRef = useRef(false)
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const finish = () => {
    if (lockedRef.current) return
    lockedRef.current = true
    setLocked(true)
    onSubmitRef.current()
  }

  useEffect(() => {
    if (exam.duration <= 0) return undefined
    const t = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(t)
          finish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.duration])

  const total = exam.questions.reduce((n, q) => n + q.points, 0)
  const timeUp = secs <= 0

  return (
    <>
      <CAlert
        color={timeUp ? 'danger' : 'warning'}
        className="d-flex justify-content-between rounded-0 mb-0 py-2"
      >
        <span>
          <CIcon icon={cilClock} className="me-1" />
          {timeUp ? (
            "Time's Up!"
          ) : (
            <>
              Time Remaining:{' '}
              <strong className="font-monospace">
                {Math.floor(secs / 60)}:{pad(secs % 60)}
              </strong>
            </>
          )}
        </span>
        <strong>Total Score: {total} Points</strong>
      </CAlert>
      <CModalBody className="bg-body-tertiary">
        <CCard className="mb-3">
          <CCardBody>
            <h4>{exam.examTitle}</h4>
            <div className="small text-body-secondary">
              Course: {exam.subject} • Duration: {exam.duration} Mins
            </div>
            <CAlert color="primary" className="small mt-3 mb-0">
              <strong>Instructions:</strong>{' '}
              {exam.instructions || 'Please answer all required questions carefully.'}
            </CAlert>
          </CCardBody>
        </CCard>
        {exam.questions.length === 0 && (
          <div className="text-center text-body-secondary py-5">
            No questions added to this questionnaire yet.
          </div>
        )}
        {exam.questions.map((q, i) => (
          <CCard className="mb-3" key={q.id}>
            <CCardBody>
              <div className="d-flex justify-content-between gap-3 mb-3">
                <h6 className="mb-0">
                  <span className="text-primary me-1">{i + 1}.</span>
                  {q.text}
                  {q.required && <span className="text-danger ms-1">*</span>}
                </h6>
                <CBadge color="secondary" className="align-self-start text-nowrap">
                  {q.points} Pts
                </CBadge>
              </div>
              {q.type === 'essay' ? (
                <CFormTextarea rows={3} placeholder="Type your written response here..." disabled={locked} />
              ) : (
                <div className="d-grid gap-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="border rounded p-2 ps-4 bg-body-tertiary">
                      <CFormCheck
                        type={q.type === 'checkbox' ? 'checkbox' : 'radio'}
                        name={`preview-${q.id}`}
                        id={`preview-${q.id}-${oi}`}
                        label={o.text}
                        disabled={locked}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CCardBody>
          </CCard>
        ))}
      </CModalBody>
      <CModalFooter className="justify-content-between">
        <span className="small text-body-secondary d-none d-sm-inline">
          Interactive preview mode — simulates response testing. Auto-submits when time runs out.
        </span>
        <CButton color="success" className="ms-auto" onClick={finish} disabled={locked}>
          <CIcon icon={cilPaperPlane} className="me-1" />
          {locked ? 'Submitting…' : 'Submit Exam Paper'}
        </CButton>
      </CModalFooter>
    </>
  )
}

PreviewPaper.propTypes = {
  exam: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    examTitle: PropTypes.string,
    subject: PropTypes.string,
    duration: PropTypes.number.isRequired,
    instructions: PropTypes.string,
    questions: PropTypes.array.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
}

const LivePreviewModal = () => {
  const { previewExam, closePreview, toast } = useExam()
  const submit = () => {
    closePreview()
    toast('Student preview response submitted successfully!', 'success')
  }
  return (
    <CModal size="lg" scrollable visible={!!previewExam} onClose={closePreview} alignment="center">
      <CModalHeader>
        <CBadge color="success" className="me-2">
          LIVE STUDENT MODE
        </CBadge>
        <CModalTitle>{previewExam?.examTitle}</CModalTitle>
      </CModalHeader>
      {previewExam && <PreviewPaper key={previewExam.id} exam={previewExam} onSubmit={submit} />}
    </CModal>
  )
}

export const ExamModals = () => (
  <>
    <CreateExamModal />
    <AddExamineeModal />
    <LivePreviewModal />
  </>
)
