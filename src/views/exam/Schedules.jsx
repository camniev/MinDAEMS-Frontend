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
} from '@coreui/icons'
import { useExam } from 'src/exam/ExamContext'
import { STATUS_COLOR } from 'src/exam/data'

const FILTERS = [
  ['all', 'All Schedules'],
  ['Active', 'Active Now'],
  ['Upcoming', 'Upcoming'],
  ['Completed', 'Completed'],
]

const Schedules = () => {
  const navigate = useNavigate()
  const { exams, search, setSelectedId, openCreate, deleteExam } = useExam()
  const [filter, setFilter] = useState('all')

  const q = search.trim().toLowerCase()
  const list = exams
    .filter((e) => filter === 'all' || e.status === filter)
    .filter((e) => !q || `${e.title} ${e.subject} ${e.accessCode}`.toLowerCase().includes(q))

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
                onClick={() => setFilter(key)}
              >
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
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold text-primary text-uppercase">{e.subject}</span>
                      <CBadge color={STATUS_COLOR[e.status]} shape="rounded-pill">
                        {e.status === 'Active' ? '● Active Now' : e.status}
                      </CBadge>
                    </div>
                    <h5>{e.title}</h5>
                    <ul className="list-unstyled small mt-3 mb-0 d-grid gap-2">
                      <li>
                        <CIcon icon={cilCalendar} className="text-primary me-2" />
                        {e.date} at {e.startTime}
                      </li>
                      <li>
                        <CIcon icon={cilClock} className="text-primary me-2" />
                        {e.duration} Minutes Duration
                      </li>
                      <li>
                        <CIcon icon={cilLockLocked} className="text-primary me-2" />
                        Access Code: <code className="fw-bold">{e.accessCode}</code>{' '}
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
                      {e.examinees.length} Students
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
                        title="Manage Examinees"
                        onClick={() => go(e.id, '/examinees')}
                      >
                        <CIcon icon={cilPeople} /> Roster
                      </CButton>
                      <CButton
                        color="light"
                        size="sm"
                        className="text-danger"
                        title="Delete Schedule"
                        onClick={() => deleteExam(e.id)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
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
