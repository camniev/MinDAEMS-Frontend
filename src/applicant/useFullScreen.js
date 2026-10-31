import { useCallback, useEffect, useState } from 'react'

// How far the window may differ from the screen and still count as full screen.
// Kept generous because of Mac notches and rounding.
const FULLSCREEN_TOLERANCE_PX = 50

// Full screen counts only if ALL of these hold:
//  1. The page was put into full screen with requestFullscreen()
//     (this is what hides the tabs and address bar).
//  2. The page is visible (not minimized or in a hidden tab).
//  3. The window still fills the screen. Minimizing or leaving full screen
//     in other ways can leave fullscreenElement set without firing an event.
// outerWidth/outerHeight are used instead of innerWidth/innerHeight because
// they don't change with browser zoom.
export const detectFullscreen = () => {
  if (typeof document === 'undefined') return false
  const el = document.fullscreenElement ?? document.webkitFullscreenElement
  if (!el) return false
  if (document.visibilityState !== 'visible') return false
  return (
    Math.abs(window.outerWidth - window.screen.width) <= FULLSCREEN_TOLERANCE_PX &&
    Math.abs(window.outerHeight - window.screen.height) <= FULLSCREEN_TOLERANCE_PX
  )
}

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(detectFullscreen)
  const [error, setError] = useState(null)

  const root = typeof document !== 'undefined' ? document.documentElement : null
  const canRequest = Boolean(root?.requestFullscreen || root?.webkitRequestFullscreen)

  useEffect(() => {
    const update = () => setIsFullscreen(detectFullscreen())

    const onVisibility = () => {
      // If the window is minimized or hidden while the page is still "in" full
      // screen, leave full screen so the browser state matches what we show.
      if (document.visibilityState === 'hidden' && document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      update()
    }

    document.addEventListener('fullscreenchange', update)
    document.addEventListener('webkitfullscreenchange', update)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', update)
    window.addEventListener('focus', update)

    // Safety net: some exits fire no event at all.
    const timer = setInterval(update, 500)

    return () => {
      clearInterval(timer)
      document.removeEventListener('fullscreenchange', update)
      document.removeEventListener('webkitfullscreenchange', update)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', update)
      window.removeEventListener('focus', update)
    }
  }, [])

  // Must be called from a user gesture (a click) or the browser refuses.
  const enter = useCallback(async () => {
    setError(null)
    try {
      const el = document.documentElement
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      else throw new Error('Fullscreen API not supported')
    } catch (err) {
      console.error('Could not enter full screen:', err)
      setError('Your browser did not allow full screen. Please try again or use a different browser.')
    }
  }, [])

  return { isFullscreen, canRequest, enter, error }
}