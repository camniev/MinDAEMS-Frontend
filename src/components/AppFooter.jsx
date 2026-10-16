import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => (
  <CFooter className="px-4">
    <div>
      <strong>MinDA Examination Management System</strong>
      <span className="ms-1">&copy; 2026 <a href="https://minda.gov.ph" target="_blank" rel="noopener noreferrer">Mindanao Development Authority (MinDA)</a></span>
    </div>
  </CFooter>
)

export default React.memo(AppFooter)
