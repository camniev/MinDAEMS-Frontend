import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CAlert,
  CButton,
  CFormCheck,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import { API_BASE_URL, extractErrorMessage } from 'src/assets/api/Api'
import { useAuthedFetch } from 'src/context/useAuthedFetch'

// Pick which Checker accounts may check one exam schedule. For Administrators and Proctors.
//   <AssignCheckersModal visible={open} examId={id} examTitle={title}
//                        onClose={() => setOpen(false)} onSaved={() => …} />
// The same component can also be dropped into the schedule-management screen.

const AssignCheckersModal = ({ visible, examId, examTitle, onClose, onSaved }) => {
  const { authedFetch } = useAuthedFetch()
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)
  const [checkers, setCheckers] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !examId) return undefined
    let ignore = false
    setState('loading')
    setError(null)
    ;(async () => {
      try {
        const [all, assigned] = await Promise.all([
          authedFetch(`${API_BASE_URL}/ExamChecker/Checkers`),
          authedFetch(`${API_BASE_URL}/ExamChecker/Exam/${examId}/Checkers`),
        ])
        if (!all.ok) throw new Error(await extractErrorMessage(all, 'Failed to load the checkers.'))
        if (!assigned.ok) throw new Error(await extractErrorMessage(assigned, 'Failed to load the assignments.'))
        const list = await all.json()
        const current = await assigned.json()
        if (ignore) return
        setCheckers(list)
        console.log(list)
        setSelected(new Set(current.map((c) => c.userId)))
        setState('ready')
      } catch (err) {
        if (ignore) return
        console.error(err)
        setError(err.message)
        setState('error')
      }
    })()
    return () => {
      ignore = true
    }
  }, [visible, examId, authedFetch])

  const toggle = (userId) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await authedFetch(`${API_BASE_URL}/ExamChecker/Exam/${examId}/Checkers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...selected] }),
      })
      if (!response.ok) throw new Error(await extractErrorMessage(response, 'Failed to save the assignment.'))
      onSaved?.([...selected])
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} alignment="center" backdrop="static" onClose={() => !saving && onClose()}>
      <CModalHeader>
        <CModalTitle>Assign checkers</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="small">
          Checkers ticked here can open <strong>{examTitle}</strong> in Checking &amp; Grading. A
          checker sees only the schedules assigned to them. Administrators and Proctors always see
          every schedule.
        </p>

        {state === 'loading' && (
          <div className="text-center text-body-secondary py-4">
            <CSpinner size="sm" className="me-2" />
            Loading…
          </div>
        )}

        {state === 'ready' && checkers.length === 0 && (
          <CAlert color="warning" className="mb-0">
            There are no active Checker accounts yet. Create user accounts with the Checker type
            first.
          </CAlert>
        )}

        {state === 'ready' && checkers.length > 0 && (
          <div className="d-grid gap-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <CAlert color="secondary" className="mb-0">
                {checkers.map((c) => (
                <CFormCheck
                    key={c.userId}
                    id={`checker-${c.userId}`}
                    checked={selected.has(c.userId)}
                    onChange={() => toggle(c.userId)}
                    label={
                    <>
                        <span className="fw-semibold">{c.name}</span>
                        <span className="small text-body-secondary ms-2">{c.position}</span>
                    </>
                    }
                />
                ))}
            </CAlert>
          </div>
        )}

        {error && (
          <CAlert color="danger" className="mt-3 mb-0">
            {error}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" disabled={saving || state !== 'ready'} onClick={save}>
          {saving && <CSpinner size="sm" className="me-2" />}
          Save
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

AssignCheckersModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  examId: PropTypes.string,
  examTitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
}

export default AssignCheckersModal
