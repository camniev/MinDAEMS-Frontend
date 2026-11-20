import { useCallback, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../assets/api/Api'

// Tells the server (and through it the proctor) when the applicant leaves full screen or the
// exam page loses focus. Used by ApplicantExamTaking:
//
//   useExamIntegrityReporter({ enabled: phase === 'ready', enrollmentId, authedFetch, isFullscreen })
//
// Four events are reported: FullscreenExited / FullscreenRestored and FocusLost / FocusRestored.
// "Focus lost" means the tab was hidden or minimized, another window or app took over, or
// another monitor was clicked.
//
// Reducing false alarms:
//  * Nothing is reported unless the applicant is away for AWAY_GRACE_MS, so a flicker (the
//    focus blip when full screen starts, an OS notification) is ignored. The "restored" event
//    is only sent for an absence that WAS reported, with how long it lasted.
//  * Clicking into the reference-PDF viewer (an <iframe>) blurs the window, but the document
//    still has focus, so document.hasFocus() is checked before calling it "away".
//
// It can't see everything: it doesn't catch a second device, a second monitor the applicant
// never clicks on, or closing the tab (the browser doesn't allow an authenticated request while
// a page is unloading). Reports are best-effort and never interrupt the exam: failures are
// kept in a small queue and retried; the exam page is never told about them.

const AWAY_GRACE_MS = 2000
const MAX_QUEUE = 50

const eventsEndpoint = (enrollmentId) => `${API_BASE_URL}/Applicant/MyExam/${enrollmentId}/Events`

const newTracker = () => ({ away: false, reported: false, since: 0, timer: null })

export const useExamIntegrityReporter = ({ enabled, enrollmentId, authedFetch, isFullscreen }) => {
  const queue = useRef([])
  const flushing = useRef(false)
  const fullscreenTracker = useRef(newTracker())
  const focusTracker = useRef(newTracker())

  const flush = useCallback(async () => {
    if (flushing.current) return
    flushing.current = true
    try {
      while (queue.current.length > 0) {
        const event = queue.current[0]
        const response = await authedFetch(eventsEndpoint(enrollmentId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })
        // 2xx = delivered. 4xx = the server refused it for good (exam over, too many events…),
        // so retrying can't help. 5xx = try again later: leave it in the queue.
        if (response.ok || (response.status >= 400 && response.status < 500)) queue.current.shift()
        else break
      }
    } catch {
      // Network down: keep the queue; it is retried on the next event or when the browser is back online.
    } finally {
      flushing.current = false
    }
  }, [authedFetch, enrollmentId])

  const report = useCallback(
    (type, awaySeconds) => {
      queue.current.push({ type, awaySeconds: awaySeconds ?? null })
      if (queue.current.length > MAX_QUEUE) queue.current.shift()
      flush()
    },
    [flush],
  )

  // Moves one "away" condition between away/back and sends the right events.
  const track = useCallback(
    (tracker, isAway, awayType, backType) => {
      if (isAway && !tracker.away) {
        tracker.away = true
        tracker.reported = false
        tracker.since = Date.now()
        tracker.timer = setTimeout(() => {
          tracker.reported = true
          report(awayType)
        }, AWAY_GRACE_MS)
      } else if (!isAway && tracker.away) {
        tracker.away = false
        clearTimeout(tracker.timer)
        if (tracker.reported) report(backType, Math.round((Date.now() - tracker.since) / 1000))
      }
    },
    [report],
  )

  // Full screen
  useEffect(() => {
    if (!enabled) return
    track(fullscreenTracker.current, !isFullscreen, 'FullscreenExited', 'FullscreenRestored')
  }, [enabled, isFullscreen, track])

  // Focus / visibility
  useEffect(() => {
    if (!enabled) return undefined

    let settle
    const evaluate = () => {
      const away = document.visibilityState === 'hidden' || !document.hasFocus()
      track(focusTracker.current, away, 'FocusLost', 'FocusRestored')
    }
    // blur also fires when focus moves into the PDF viewer iframe; wait a moment, then look.
    const onBlur = () => {
      clearTimeout(settle)
      settle = setTimeout(evaluate, 250)
    }

    document.addEventListener('visibilitychange', evaluate)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', evaluate)
    evaluate()

    return () => {
      clearTimeout(settle)
      document.removeEventListener('visibilitychange', evaluate)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', evaluate)
    }
  }, [enabled, track])

  // Retry anything still queued when the network comes back.
  useEffect(() => {
    if (!enabled) return undefined
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [enabled, flush])

  // The exam ended or the page is closing: stop timers so nothing is reported afterwards.
  useEffect(() => {
    const fullscreen = fullscreenTracker.current
    const focus = focusTracker.current
    return () => {
      clearTimeout(fullscreen.timer)
      clearTimeout(focus.timer)
    }
  }, [])
  useEffect(() => {
    if (enabled) return
    for (const t of [fullscreenTracker.current, focusTracker.current]) {
      clearTimeout(t.timer)
      Object.assign(t, newTracker())
    }
  }, [enabled])
}