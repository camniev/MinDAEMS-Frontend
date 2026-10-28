import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CBadge, CButton, CButtonGroup, CCard, CCardBody, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCalendar,
  cilClock,
  cilEducation,
  cilLockLocked,
  cilPeople,
  cilPencil,
  cilPlus,
  cilTrash,
  cilFolder,
  cilMediaPlay,
  cilXCircle,
  cilArrowTop,
} from '@coreui/icons'
import { useExam } from 'src/exam/ExamContext'
import { STATUS_COLOR } from 'src/exam/data'

const USER_ID = '24fefc6e-ed0a-4e2e-95f3-9e448928e31d'

const FILTERS = [
  ['all', 'All Schedules'],
  ['Upcoming', 'Upcoming'],
  ['Ongoing', 'Ongoing'],
  ['Closed', 'Closed'],
  ['Archived', 'Archived'],
]

const Schedules = () => {
  const navigate = useNavigate()
  const {
    exams,
    search,
    setSelectedId,
    openCreate,
    archiveExam,
    restoreExam,
    openExam,
    closeExam,
    setIncludeArchived,
  } = useExam()
  const [filter, setFilter] = useState('all')

  // Archived exams are excluded from the default fetch, so the Archived tab
  // needs to ask for them specifically. Every other tab switches it back
  // off — see the note on this in the write-up, this is a shared piece of
  // context state, not scoped to just this page.
  const handleFilterChange = (key) => {
    setFilter(key)
    setIncludeArchived(key === 'Archived')
  }

  const q = search.trim().toLowerCase()
  const list = exams
    .filter((e) => filter === 'all' || e.status === filter)
    .filter((e) => !q || `${e.examTitle} ${e.examCode}`.toLowerCase().includes(q))

  const go = (id, path) => {
    setSelectedId(id)
    navigate(path)
  }

  return (
    <>
      <CCard className="mb-4">
        <CCardBody className="d-flex flex-column flex-sm-row justify-content-between gap-3">
          <CButtonGroup>
            {FILTERS.map(([key, label]) => (
              <CButton
                key={key}
                size="sm"
                color="primary"
                variant={filter === key ? undefined : 'outline'}
                onClick={() => handleFilterChange(key)}
              >
                {key === 'Archived' && <CIcon icon={cilFolder} size="sm" className="me-1" />}
                {label}
              </CButton>
            ))}
          </CButtonGroup>
          <CButton color="primary" size="sm" onClick={openCreate}>
            <CIcon icon={cilPlus} className="me-1" /> Schedule New Exam Event
          </CButton>
        </CCardBody>
      </CCard>

      {list.length === 0 ? (
        <CCard>
          <CCardBody className="text-center py-5 text-body-secondary">
            <CIcon icon={cilCalendar} size="3xl" className="mb-2" />
            <p className="fw-semibold mb-0">No exam schedules match this filter.</p>
          </CCardBody>
        </CCard>
      ) : (
        <CRow className="g-4">
          {list.map((e) => (
            <CCol md={6} lg={4} key={e.id}>
              <CCard className="h-100">
                <CCardBody className="d-flex flex-column justify-content-between">
                  <div>
                    {/* subject (the old category tag) no longer exists on
                        the exam record — nothing meaningful to show on the
                        left here anymore, so the badge now sits alone. */}
                    <div className="d-flex justify-content-end align-items-center mb-2">
                      <CBadge color={STATUS_COLOR[e.status]} shape="rounded-pill">
                        {e.status === 'Ongoing' ? '● Ongoing' : e.status}
                      </CBadge>
                    </div>
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
                        <CIcon icon={cilLockLocked} className="text-primary me-2" />
                        Access Code: <code className="fw-bold">{e.examCode}</code>{' '}
                        <span className="text-body-secondary">({e.accessType})</span>
                      </li>
                      <li>
                        <CIcon icon={cilEducation} className="text-primary me-2" />
                        Passing Threshold: <strong>{e.passingScore}%</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-4">
                    <span className="small text-body-secondary">
                      <CIcon icon={cilPeople} className="me-1" />
                      {e.applicants.length} Applicants
                    </span>
                    <div className="d-flex gap-1">
                      <CButton
                        color="light"
                        size="sm"
                        title="Edit Form"
                        onClick={() => go(e.id, '/builder')}
                      >
                        <CIcon icon={cilPencil} /> Form
                      </CButton>
                      <CButton
                        color="light"
                        size="sm"
                        title="Manage Applicants"
                        onClick={() => go(e.id, '/applicants')}
                      >
                        <CIcon icon={cilPeople} /> Roster
                      </CButton>

                      {/* Open/Close mirror the backend's own rules: Open only
                          applies to Upcoming, Close only to Ongoing — this
                          just avoids offering a button that would 409. */}
                      {e.status === 'Upcoming' && (
                        <CButton
                          color="light"
                          size="sm"
                          className="text-success"
                          title="Open Exam"
                          onClick={() => openExam(e.id)}
                        >
                          <CIcon icon={cilMediaPlay} />
                        </CButton>
                      )}
                      {e.status === 'Ongoing' && (
                        <CButton
                          color="light"
                          size="sm"
                          className="text-warning"
                          title="Close Exam"
                          onClick={() => closeExam(e.id)}
                        >
                          <CIcon icon={cilXCircle} />
                        </CButton>
                      )}

                      {/* Archive is available from any non-archived status;
                          Archived schedules get Restore instead. */}
                      {e.status === 'Archived' ? (
                        <CButton
                          color="light"
                          size="sm"
                          className="text-primary"
                          title="Restore Schedule"
                          onClick={() => restoreExam(e.id)}
                        >
                          <CIcon icon={cilArrowTop} />
                        </CButton>
                      ) : (
                        <CButton
                          color="light"
                          size="sm"
                          className="text-danger"
                          title="Archive Schedule"
                          onClick={() => archiveExam(e.id, USER_ID)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      )}
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}
    </>
  )
}

export default Schedules
