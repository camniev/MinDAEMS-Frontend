import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CBadge, CButton, CCard, CCardBody, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowRight,
  cilArrowTop,
  cilBadge,
  cilCalendarCheck,
  cilClock,
  cilMediaPlay,
  cilNotes,
  cilPencil,
  cilPeople,
  cilPlus,
  cilShieldAlt,
  cilSignalCellular4,
  cilUserPlus,
} from '@coreui/icons'
import { useExam } from 'src/exam/ExamContext'
import { STATUS_COLOR } from 'src/exam/data'

const Stat = ({ label, value, note, icon, color, noteColor }) => (
  <CCard className="h-100">
    <CCardBody>
      <div className="d-flex justify-content-between align-items-start">
        <span className="text-body-secondary small fw-semibold text-uppercase">{label}</span>
        <div className={`bg-${color}-subtle text-${color} rounded p-2`}>
          <CIcon icon={icon} size="lg" />
        </div>
      </div>
      <div className="fs-3 fw-bold mt-2">{value}</div>
      <div className={`small ${noteColor ? `text-${noteColor}` : 'text-body-secondary'}`}>
        {note}
      </div>
    </CCardBody>
  </CCard>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { exams, setSelectedId, openCreate, openPreview } = useExam()
  const active = exams.find((e) => e.status === 'Active')
  const upcoming = exams.filter((e) => e.status === 'Upcoming').length
  const totalExaminees = exams.reduce((n, e) => n + e.examinees.length, 0)

  const go = (id, path) => {
    setSelectedId(id)
    navigate(path)
  }

  const quick = [
    {
      icon: cilPlus,
      color: 'primary',
      title: 'Schedule New Exam',
      sub: 'Set date, time, and instructions',
      onClick: openCreate,
    },
    {
      icon: cilNotes,
      color: 'info',
      title: 'Build Question Set',
      sub: 'Google Forms style questionnaire',
      onClick: () => navigate('/builder'),
    },
    {
      icon: cilUserPlus,
      color: 'warning',
      title: 'Import Examinees',
      sub: 'Single or bulk text import',
      onClick: () => navigate('/examinees'),
    },
  ]

  return (
    <>
      <CRow className="g-3 mb-4">
        <CCol sm={6} lg={3}>
          <Stat
            label="Active Exams"
            value={exams.filter((e) => e.status === 'Active').length}
            icon={cilSignalCellular4}
            color="success"
            noteColor="success"
            note="Live test sessions ongoing"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <Stat
            label="Upcoming Schedules"
            value={upcoming}
            icon={cilCalendarCheck}
            color="primary"
            note="Scheduled in next 7 days"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <Stat
            label="Total Examinees"
            value={totalExaminees}
            icon={cilPeople}
            color="info"
            note="Enrolled across all events"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <Stat
            label="Avg. Pass Rate"
            value="84.2%"
            icon={cilBadge}
            color="warning"
            noteColor="success"
            note={
              <>
                <CIcon icon={cilArrowTop} size="sm" /> +3.5% vs last term
              </>
            }
          />
        </CCol>
      </CRow>

      <CRow className="g-3 mb-4">
        <CCol lg={8}>
          <CCard
            className="h-100 text-white border-0"
            style={{ background: 'linear-gradient(135deg,#312e81,#1e1b4b 55%,#0f172a)' }}
          >
            <CCardBody className="d-flex flex-column justify-content-between">
              {active ? (
                <>
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <CBadge color="success" shape="rounded-pill">
                        ● CURRENTLY ACTIVE EXAM
                      </CBadge>
                      <span className="small opacity-75">
                        Code: <strong className="font-monospace">{active.accessCode}</strong>
                      </span>
                    </div>
                    <h4 className="fw-bold">{active.title}</h4>
                    <p className="opacity-75 mb-0">{active.instructions}</p>
                  </div>
                  <CRow className="mt-4 pt-3 border-top border-light border-opacity-25 g-3">
                    {[
                      ['Duration', `${active.duration} Minutes`],
                      ['Questions', `${active.questions.length} Items`],
                      ['Enrolled', `${active.examinees.length} Examinees`],
                      ['Pass Score', `${active.passingScore}% Minimum`],
                    ].map(([k, v]) => (
                      <CCol xs={6} sm={3} key={k}>
                        <div className="small opacity-75 text-uppercase">{k}</div>
                        <div className="fw-semibold">{v}</div>
                      </CCol>
                    ))}
                  </CRow>
                  <div className="mt-4 d-flex flex-wrap gap-2">
                    <CButton color="primary" size="sm" onClick={() => go(active.id, '/builder')}>
                      <CIcon icon={cilPencil} className="me-1" /> Edit Questionnaire
                    </CButton>
                    <CButton
                      color="light"
                      variant="outline"
                      size="sm"
                      onClick={() => go(active.id, '/examinees')}
                    >
                      <CIcon icon={cilPeople} className="me-1" /> Examinee Roster
                    </CButton>
                    <CButton
                      color="success"
                      size="sm"
                      className="ms-auto"
                      onClick={() => openPreview(active.id)}
                    >
                      <CIcon icon={cilMediaPlay} className="me-1" /> Student Preview
                    </CButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 opacity-75">No exam is currently active.</div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={4}>
          <CCard className="h-100">
            <CCardBody className="d-flex flex-column justify-content-between">
              <div>
                <h5 className="mb-0">Quick Management Tasks</h5>
                <p className="small text-body-secondary">Common administrative workflows</p>
                <div className="d-grid gap-2">
                  {quick.map((q) => (
                    <button
                      key={q.title}
                      type="button"
                      onClick={q.onClick}
                      className="btn btn-outline-secondary text-start d-flex align-items-center gap-3 p-2"
                    >
                      <span className={`bg-${q.color}-subtle text-${q.color} rounded p-2`}>
                        <CIcon icon={q.icon} />
                      </span>
                      <span>
                        <span className="d-block fw-semibold small">{q.title}</span>
                        <span className="d-block small text-body-secondary">{q.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-between small text-body-secondary border-top pt-3 mt-4">
                <span>
                  System Status: <strong className="text-success">Online &amp; Secure</strong>
                </span>
                <CIcon icon={cilShieldAlt} className="text-success" />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-0">Upcoming Schedule Calendar Preview</h5>
              <div className="small text-body-secondary">
                Scheduled exam events for the current academic session
              </div>
            </div>
            <CButton color="link" size="sm" onClick={() => navigate('/schedules')}>
              View All Schedules <CIcon icon={cilArrowRight} size="sm" />
            </CButton>
          </div>
          <CRow className="g-3">
            {exams.slice(0, 3).map((e) => (
              <CCol md={6} lg={4} key={e.id}>
                <div className="border rounded p-3 h-100 d-flex flex-column justify-content-between bg-body-tertiary">
                  <div>
                    <div className="d-flex justify-content-between mb-2">
                      <CBadge color={STATUS_COLOR[e.status]}>{e.status}</CBadge>
                      <span className="small text-body-secondary">
                        <CIcon icon={cilClock} size="sm" className="me-1" />
                        {e.duration} mins
                      </span>
                    </div>
                    <div className="fw-bold text-truncate">{e.title}</div>
                    <div className="small text-body-secondary">
                      {e.subject} • {e.date}
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-3">
                    <span className="small text-body-secondary">
                      {e.questions.length} Questions
                    </span>
                    <CButton
                      color="link"
                      size="sm"
                      className="p-0"
                      onClick={() => go(e.id, '/builder')}
                    >
                      Edit Form →
                    </CButton>
                  </div>
                </div>
              </CCol>
            ))}
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Dashboard
