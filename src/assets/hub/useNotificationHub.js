import { useContext, useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { AuthContext } from 'src/context/AuthContext'
import { API_BASE_URL } from 'src/assets/api/Api'

// Install once:  npm i @microsoft/signalr

// The hub is mapped at the SERVER ROOT ("/notificationHub"), not under "/api", so drop the
// trailing /api from the API base URL.
const HUB_URL = `${API_BASE_URL.replace(/\/api\/?$/, '')}/notificationHub`

const RETRY_MS = 10_000

/**
 * Keeps one SignalR connection open while `enabled`, calling onNotification(payload) for each
 * "ReceiveNotification" the server sends, and onConnected() after the first connection and after
 * every automatic reconnect (use it to reload anything missed while offline).
 * Returns the connection state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'.
 */
export const useNotificationHub = ({ enabled, onNotification, onConnected }) => {
  const { getAccessToken } = useContext(AuthContext)
  const [state, setState] = useState('disconnected')

  // Always call the latest versions without re-creating the connection when they change.
  const latest = useRef({ getAccessToken, onNotification, onConnected })
  useEffect(() => {
    latest.current = { getAccessToken, onNotification, onConnected }
  })

  useEffect(() => {
    if (!enabled) return undefined

    let stopped = false
    let retryTimer = null

    const connection = new HubConnectionBuilder()
      // Asked for again on every (re)connect, so a reconnect after the 15-minute token expiry
      // still carries a valid token.
      .withUrl(HUB_URL, { accessTokenFactory: async () => (await latest.current.getAccessToken()) ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build()

    connection.on('ReceiveNotification', (payload) => latest.current.onNotification?.(payload))
    connection.onreconnecting(() => !stopped && setState('reconnecting'))
    connection.onreconnected(() => {
      if (stopped) return
      setState('connected')
      latest.current.onConnected?.()
    })
    // Automatic reconnect gives up after its last delay; keep trying every RETRY_MS after that.
    connection.onclose(() => {
      if (stopped) return
      setState('disconnected')
      retryTimer = setTimeout(start, RETRY_MS)
    })

    async function start() {
      if (stopped) return
      setState('connecting')
      try {
        await connection.start()
        if (stopped) return
        setState('connected')
        latest.current.onConnected?.()
      } catch (error) {
        if (stopped) return
        console.warn('Notification hub connection failed, retrying:', error)
        setState('disconnected')
        retryTimer = setTimeout(start, RETRY_MS)
      }
    }
    start()

    return () => {
      stopped = true
      clearTimeout(retryTimer)
      connection.stop()
    }
  }, [enabled])

  return state
}