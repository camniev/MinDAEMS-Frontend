import React from 'react'
import { CProgress, CProgressBar } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEducation } from '@coreui/icons'

// Shown in the portal's top bar. Change it here to rename the portal everywhere.
const PORTAL_BRAND = 'MinDA Examination Management System'

const SHELL_CSS = `
@keyframes exam-portal-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .55 } }
.exam-portal-pulse { animation: exam-portal-pulse 1s ease-in-out infinite; }
`

// Round tinted icon tile used on the result screens (submitted, ended, …).
export const PortalIcon = ({ icon, tone = 'success' }) => (
  <div
    className={`d-inline-flex align-items-center justify-content-center rounded-4 mb-3 bg-${tone}-subtle text-${tone}`}
    style={{ width: 64, height: 64 }}
  >
    <CIcon icon={icon} size="3xl" />
  </div>
)

// Centers a single card in the portal body (loading, error, result screens).
export const PortalCenter = ({ maxWidth = 560, children }) => (
  <div className="my-auto mx-auto w-100" style={{ maxWidth }}>
    {children}
  </div>
)

/**
 * Full-viewport portal, like the "Student Exam Portal" in the design: a dark top bar
 * (brand, optional live HUD, optional action button), an optional thin progress line
 * and a scrolling body. It covers the app's own header/sidebar on purpose, so an
 * exam in progress shows nothing but the exam. z-index 1040 keeps it above the
 * layout (<= 1031) and below CoreUI modals (1055).
 *
 * subtitle – small line under the brand
 * hud      – node(s) shown in the middle/right of the bar (timer, progress)
 * action   – node shown at the far right (e.g. a Back button)
 * progress – 0-100 to show the progress line, undefined to hide it
 */
const PortalShell = ({ subtitle, hud, action, progress, children }) => (
  <div
    className="position-fixed top-0 start-0 end-0 bottom-0 d-flex flex-column bg-body-secondary"
    style={{ zIndex: 1040 }}
  >
    <style>{SHELL_CSS}</style>

    <header
      className="bg-dark text-white d-flex align-items-center justify-content-between gap-3 px-3 px-sm-4 flex-shrink-0 shadow"
      style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,.1)' }}
    >
      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, var(--cui-success), var(--cui-info))',
            color: '#0f172a',
          }}
        >
          <CIcon icon={cilEducation} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h6 fw-bold mb-0 text-truncate">{PORTAL_BRAND}</h1>
            <span
              className="d-none d-md-inline-block rounded-pill text-uppercase fw-bold px-2"
              style={{
                fontSize: 10,
                letterSpacing: '.05em',
                color: 'var(--cui-success)',
                background: 'rgba(var(--cui-success-rgb), .18)',
                border: '1px solid rgba(var(--cui-success-rgb), .35)',
              }}
            >
              Examinee Portal
            </span>
          </div>
          <div className="text-truncate" style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
            {subtitle}
          </div>
        </div>
      </div>

      {hud && <div className="d-flex align-items-center gap-3 flex-shrink-0">{hud}</div>}
      {action}
    </header>

    {typeof progress === 'number' && (
      <CProgress height={6} className="rounded-0 flex-shrink-0 bg-body-tertiary">
        <CProgressBar color="success" value={progress} />
      </CProgress>
    )}

    <main className="flex-grow-1 overflow-auto d-flex flex-column p-3 p-sm-4">{children}</main>
  </div>
)

export default PortalShell
