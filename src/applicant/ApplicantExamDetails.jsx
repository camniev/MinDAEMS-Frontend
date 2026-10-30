import React from 'react'
import { useParams } from 'react-router-dom'
import { CCard, CCardBody } from '@coreui/react'

// STUB — this is intentionally minimal. The real version (title,
// instructions, duration, the fullscreen-before-Start-Exam requirement) is
// the "Applicant Open Exam page" from your next item, not built yet. This
// just gives the Open Exam button in ApplicantSchedules.jsx somewhere real
// to land instead of a dead route.
const ApplicantExamDetails = () => {
  const { enrollmentId } = useParams()
  return (
    <CCard>
      <CCardBody className="text-center py-5 text-body-secondary">
        Exam details page for enrollment <code>{enrollmentId}</code> — not built yet.
      </CCardBody>
    </CCard>
  )
}

export default ApplicantExamDetails
