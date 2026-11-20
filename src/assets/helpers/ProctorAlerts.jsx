import React, { useCallback, useContext, useRef, useState } from 'react'
import { CBadge, CButton, CDropdown, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell } from '@coreui/icons'
import { AuthContext } from 'src/context/AuthContext'
import { useToast } from 'src/context/ToastContext'
import { HR_ROLES } from 'src/constants/roles'
import { API_BASE_URL } from 'src/assets/api/Api'
import { useNotificationHub } from 'src/assets/hub/useNotificationHub'

// A bell for the staff header: live exam alerts (an applicant left full screen / switched away
// from the exam page) from SignalR, plus the last few hours of history from the database.
// Put it once in the HR header, e.g. inside AppHeader's nav:   <ProctorAlerts />
// It renders nothing for applicants and does not connect for them.

const MAX_ALERTS = 100

const MESSAGES = {
  FullscreenExited: 'left full screen',
  FullscreenRestored: 'returned to full screen',
  FocusLost: 'switched away from the exam page',
  FocusRestored: 'came back to the exam page',
}

const formatAway = (s) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`)

const describe = (a) =>
  `${a.applicantName} (${a.applicantCode}) ${MESSAGES[a.type] ?? a.type}${
    a.awaySeconds != null ? ` after ${formatAway(a.awaySeconds)}` : ''
  }`

const STATUS_LABEL = {
  connected: ['Live', 'success'],
  connecting: ['Connecting…', 'secondary'],
  reconnecting: ['Reconnecting…', 'warning'],
  disconnected: ['Offline', 'danger'],
}

const ProctorAlerts = () => {
  const { user, getAccessToken } = useContext(AuthContext)
  const notify = useToast()
  const enabled = Boolean(user) && HR_ROLES.includes(user.role)

  const [alerts, setAlerts] = useState([]) // newest first; each has .unread
  const loadedOnce = useRef(false)

  // Adds alerts we don't have yet (matched by id, so history and live pushes never duplicate).
  const addAlerts = useCallback((incoming, unread) => {
    setAlerts((prev) => {
      const known = new Set(prev.map((a) => a.incidentId))
      const fresh = incoming.filter((a) => !known.has(a.incidentId)).map((a) => ({ ...a, unread }))
      if (fresh.length === 0) return prev
      return [...fresh, ...prev]
        .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
        .slice(0, MAX_ALERTS)
    })
  }, [])

  const handleNotification = useCallback(
    (payload) => {
      if (payload?.kind !== 'ExamIncident') return // the hub can carry other kinds later
      addAlerts([payload], true)
      // Pop a toast only when someone LEFT; "came back" just updates the list.
      if (payload.severity === 'warning') notify(`${describe(payload)} — ${payload.examTitle}`, 'error')
    },
    [addAlerts, notify],
  )

  // After the first connection: load recent history (already seen, so not "unread").
  // After a RECONNECT: anything that happened while offline is new, so it counts as unread.
  const loadHistory = useCallback(async () => {
    const firstLoad = !loadedOnce.current
    loadedOnce.current = true
    try {
      const token = await getAccessToken()
      const response = await fetch(`${API_BASE_URL}/Monitoring/Incidents?hours=12&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      addAlerts(await response.json(), !firstLoad)
    } catch (error) {
      console.warn('Could not load recent exam alerts:', error)
    }
  }, [addAlerts, getAccessToken])

  const status = useNotificationHub({
    enabled,
    onNotification: handleNotification,
    onConnected: loadHistory,
  })

  if (!enabled) return null

  const unreadCount = alerts.filter((a) => a.unread).length
  const [statusText, statusColor] = STATUS_LABEL[status] ?? STATUS_LABEL.disconnected

  return (
    <CDropdown
      variant="nav-item"
      alignment="end"
      // reading = opening and closing it; the highlight stays while it is open
      onHide={() => setAlerts((prev) => prev.map((a) => (a.unread ? { ...a, unread: false } : a)))}
    >
      <CDropdownToggle caret={false} className="position-relative" aria-label="Exam alerts">
        <CIcon icon={cilBell} size="lg" />
        {unreadCount > 0 && (
          <CBadge color="danger" shape="rounded-pill" className="position-absolute top-0 end-0 translate-middle-y">
            {unreadCount > 99 ? '99+' : unreadCount}
          </CBadge>
        )}
      </CDropdownToggle>

      <CDropdownMenu className="p-0" style={{ width: 380, maxWidth: '92vw' }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <div>
            <span className="fw-semibold">Exam alerts</span>
            <CBadge color={statusColor} className="ms-2">
              {statusText}
            </CBadge>
          </div>
          <CButton color="link" size="sm" className="p-0" disabled={alerts.length === 0} onClick={() => setAlerts([])}>
            Clear
          </CButton>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {alerts.length === 0 && (
            <div className="text-center small text-body-secondary py-4">No alerts.</div>
          )}
          {alerts.map((a) => (
            <div
              key={a.incidentId}
              className={`px-3 py-2 border-bottom ${a.unread ? 'bg-body-tertiary' : ''}`}
            >
              <div className="d-flex align-items-start gap-2">
                <CBadge color={a.severity === 'warning' ? 'warning' : 'success'} shape="rounded-circle" className="mt-1 p-1">
                  <span className="visually-hidden">{a.severity}</span>
                </CBadge>
                <div className="flex-grow-1">
                  <div className="small fw-semibold">{describe(a)}</div>
                  <div className="small text-body-secondary d-flex justify-content-between gap-2">
                    <span className="text-truncate">{a.examTitle}</span>
                    <span className="text-nowrap">
                      {new Date(a.occurredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default ProctorAlerts
