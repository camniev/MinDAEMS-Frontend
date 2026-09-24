import React, { useState } from 'react'
import {
  CAvatar,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CFormInput,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMagnifyingGlass, cilPaperPlane, cilPeople, cilTrash, cilUserPlus } from '@coreui/icons'
import { useExam } from 'src/exam/ExamContext'
import { EXAMINEE_COLOR } from 'src/exam/data'

const STATUSES = ['all', 'Invited', 'Registered', 'Completed']

const Examinees = () => {
  const { exams, selectedExam, setSelectedId, openAddExaminee, removeExaminee, resendInvite } =
    useExam()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = selectedExam.examinees
    .filter((e) => status === 'all' || e.status === status)
    .filter(
      (e) =>
        !q ||
        [e.name, e.email, e.studentId, e.department].some((v) =>
          (v || '').toLowerCase().includes(q),
        ),
    )

  return (
    <>
      <CCard className="mb-4">
        <CCardBody>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-3">
            <div className="flex-grow-1" style={{ maxWidth: 480 }}>
              <label
                className="small fw-semibold text-body-secondary text-uppercase mb-1"
                htmlFor="ex-schedule"
              >
                Select Exam Schedule Roster
              </label>
              <CFormSelect
                id="ex-schedule"
                value={selectedExam.id}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.examinees.length} Students)
                  </option>
                ))}
              </CFormSelect>
            </div>
            <CButton color="primary" size="sm" onClick={openAddExaminee}>
              <CIcon icon={cilUserPlus} className="me-1" /> Add Examinees
            </CButton>
          </div>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-top pt-3">
            <CInputGroup size="sm" style={{ maxWidth: 320 }}>
              <CInputGroupText>
                <CIcon icon={cilMagnifyingGlass} size="sm" />
              </CInputGroupText>
              <CFormInput
                placeholder="Search examinee by name, email, ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </CInputGroup>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-body-secondary">Status:</span>
              <CButtonGroup size="sm">
                {STATUSES.map((s) => (
                  <CButton
                    key={s}
                    color="primary"
                    variant={status === s ? undefined : 'outline'}
                    onClick={() => setStatus(s)}
                  >
                    {s === 'all' ? 'All' : s}
                  </CButton>
                ))}
              </CButtonGroup>
            </div>
          </div>
        </CCardBody>
      </CCard>

      <CCard>
        <CTable align="middle" hover responsive className="mb-0">
          <CTableHead color="light">
            <CTableRow>
              <CTableHeaderCell className="ps-4">Examinee Details</CTableHeaderCell>
              <CTableHeaderCell>Student ID / Code</CTableHeaderCell>
              <CTableHeaderCell>Department</CTableHeaderCell>
              <CTableHeaderCell>Exam Status</CTableHeaderCell>
              <CTableHeaderCell>Score</CTableHeaderCell>
              <CTableHeaderCell className="text-end pe-4">Actions</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {rows.length === 0 && (
              <CTableRow>
                <CTableDataCell colSpan={6} className="text-center text-body-secondary py-5">
                  <CIcon icon={cilPeople} size="3xl" className="mb-2" />
                  <div>
                    No examinees{' '}
                    {selectedExam.examinees.length
                      ? 'match these filters'
                      : 'registered for this schedule yet'}
                    .
                  </div>
                </CTableDataCell>
              </CTableRow>
            )}
            {rows.map((e) => (
              <CTableRow key={e.id}>
                <CTableDataCell className="ps-4">
                  <div className="d-flex align-items-center gap-3">
                    <CAvatar color="secondary" size="md">
                      {e.name.charAt(0)}
                    </CAvatar>
                    <div>
                      <div className="fw-bold">{e.name}</div>
                      <div className="small text-body-secondary">{e.email}</div>
                    </div>
                  </div>
                </CTableDataCell>
                <CTableDataCell className="font-monospace">{e.studentId}</CTableDataCell>
                <CTableDataCell>{e.department || 'N/A'}</CTableDataCell>
                <CTableDataCell>
                  <CBadge color={EXAMINEE_COLOR[e.status] || 'secondary'} shape="rounded-pill">
                    {e.status}
                  </CBadge>
                </CTableDataCell>
                <CTableDataCell className="fw-bold">
                  {e.score !== null ? (
                    <span
                      className={
                        e.score >= selectedExam.passingScore ? 'text-success' : 'text-danger'
                      }
                    >
                      {e.score}%
                    </span>
                  ) : (
                    <span className="text-body-secondary fw-normal">—</span>
                  )}
                </CTableDataCell>
                <CTableDataCell className="text-end pe-4">
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    title="Resend Passcode Invite"
                    onClick={() => resendInvite(e.email)}
                  >
                    <CIcon icon={cilPaperPlane} />
                  </CButton>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    title="Remove Examinee"
                    onClick={() => removeExaminee(e.id)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
        <CCardFooter className="d-flex justify-content-between small text-body-secondary">
          <span>
            Showing <strong className="text-body">{rows.length}</strong> examinees assigned to this
            schedule
          </span>
          <span>Auto-saves changes</span>
        </CCardFooter>
      </CCard>
    </>
  )
}

export default Examinees
