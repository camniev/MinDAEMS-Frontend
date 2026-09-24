import React, { useEffect, useState } from 'react'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilClock, cilPaperPlane } from '@coreui/icons'
import { useExam } from './ExamContext'

const emptyExam = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return {
    title: '',
    subject: '',
    accessType: 'Private',
    date: d.toISOString().split('T')[0],
    startTime: '10:00',
    duration: 60,
    passingScore: 70,
    instructions: '',
  }
}

const CreateExamModal = () => {
  const { createOpen, closeCreate, addExam } = useExam()
  const [f, setF] = useState(emptyExam)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    addExam({
      ...f,
      title: f.title.trim(),
      subject: f.subject.trim(),
      duration: parseInt(f.duration),
      passingScore: parseInt(f.passingScore),
      instructions: f.instructions.trim(),
    })
    closeCreate()
  }

  return (
    <CModal
      size="lg"
      visible={createOpen}
      onShow={() => setF(emptyExam())}
      onClose={closeCreate}
      scrollable
      alignment="center"
    >
      <CForm onSubmit={submit}>
        <CModalHeader>
          <CModalTitle>Schedule New Examination</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol xs={12}>
              <CFormLabel>Exam Title *</CFormLabel>
              <CFormInput
                required
                placeholder="e.g. MATH-201 Calculus II Final Exam"
                value={f.title}
                onChange={set('title')}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Subject / Course Code *</CFormLabel>
              <CFormInput
                required
                placeholder="e.g. Mathematics"
                value={f.subject}
                onChange={set('subject')}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Access Type *</CFormLabel>
              <CFormSelect value={f.accessType} onChange={set('accessType')}>
                <option value="Private">Private (Passcode Required)</option>
                <option value="Public">Public Access</option>
              </CFormSelect>
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Scheduled Date *</CFormLabel>
              <CFormInput type="date" required value={f.date} onChange={set('date')} />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Start Time *</CFormLabel>
              <CFormInput type="time" required value={f.startTime} onChange={set('startTime')} />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Duration (Minutes) *</CFormLabel>
              <CFormInput
                type="number"
                required
                min={5}
                value={f.duration}
                onChange={set('duration')}
              />
            </CCol>
            <CCol sm={6}>
              <CFormLabel>Passing Score (%) *</CFormLabel>
              <CFormInput
                type="number"
                required
                min={1}
                max={100}
                value={f.passingScore}
                onChange={set('passingScore')}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel>Instructions &amp; Guidelines</CFormLabel>
              <CFormTextarea
                rows={3}
                placeholder="Specify exam rules, allowed calculators, reference materials, etc..."
                value={f.instructions}
                onChange={set('instructions')}
              />
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={closeCreate}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit">
            Save Schedule Event
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

const blank = { name: '', email: '', studentId: '', department: '' }

const AddExamineeModal = () => {
  const { addExamineeOpen, closeAddExaminee, addExaminees, toast } = useExam()
  const [tab, setTab] = useState('single')
  const [f, setF] = useState(blank)
  const [bulk, setBulk] = useState('')

  const single = (e) => {
    e.preventDefault()
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
    const list = bulk
      .split('\n')
      .map((l) => l.split(',').map((p) => p.trim()))
      .filter((p) => p.length >= 2)
      .map((p) => ({
        name: p[0] || 'Unknown',
        email: p[1] || 'student@university.edu',
        studentId: p[2] || 'STU-' + Math.floor(1000 + Math.random() * 9000),
        department: p[3] || 'General',
      }))
    if (!list.length)
      return toast('No valid lines found. Use: Full Name, Email, StudentID, Department', 'error')
    addExaminees(list, `Successfully imported ${list.length} examinees!`)
    closeAddExaminee()
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <CModal
      visible={addExamineeOpen}
      onShow={() => {
        setTab('single')
        setF(blank)
        setBulk('')
      }}
      onClose={closeAddExaminee}
      alignment="center"
    >
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
        <CForm onSubmit={single}>
          <CModalBody className="d-grid gap-3">
            <div>
              <CFormLabel>Full Name *</CFormLabel>
              <CFormInput
                required
                placeholder="e.g. Alexander Wright"
                value={f.name}
                onChange={set('name')}
              />
            </div>
            <div>
              <CFormLabel>Email Address *</CFormLabel>
              <CFormInput
                type="email"
                required
                placeholder="alexander@university.edu"
                value={f.email}
                onChange={set('email')}
              />
            </div>
            <CRow className="g-3">
              <CCol xs={6}>
                <CFormLabel>Student ID *</CFormLabel>
                <CFormInput
                  required
                  placeholder="STU-2026-09"
                  value={f.studentId}
                  onChange={set('studentId')}
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
        <CForm onSubmit={bulkSubmit}>
          <CModalBody>
            <CFormLabel>Paste Bulk Examinee Records</CFormLabel>
            <p className="small text-body-secondary">
              Format line by line: <code>Full Name, Email, StudentID, Department</code>
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
  const [secs, setSecs] = useState(exam.duration * 60)
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])
  const total = exam.questions.reduce((n, q) => n + q.points, 0)

  return (
    <>
      <CAlert color="warning" className="d-flex justify-content-between rounded-0 mb-0 py-2">
        <span>
          <CIcon icon={cilClock} className="me-1" /> Time Remaining:{' '}
          <strong className="font-monospace">
            {Math.floor(secs / 60)}:{pad(secs % 60)}
          </strong>
        </span>
        <strong>Total Score: {total} Points</strong>
      </CAlert>
      <CModalBody className="bg-body-tertiary">
        <CCard className="mb-3">
          <CCardBody>
            <h4>{exam.title}</h4>
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
                <CFormTextarea rows={3} placeholder="Type your written response here..." />
              ) : (
                <div className="d-grid gap-2">
                  {q.options.map((o, oi) => (
                    <div key={oi} className="border rounded p-2 ps-4 bg-body-tertiary">
                      <CFormCheck
                        type={q.type === 'checkbox' ? 'checkbox' : 'radio'}
                        name={`preview-${q.id}`}
                        id={`preview-${q.id}-${oi}`}
                        label={o.text}
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
          Interactive preview mode simulate response testing.
        </span>
        <CButton color="success" className="ms-auto" onClick={onSubmit}>
          <CIcon icon={cilPaperPlane} className="me-1" /> Submit Exam Paper
        </CButton>
      </CModalFooter>
    </>
  )
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
        <CModalTitle>{previewExam?.title}</CModalTitle>
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
