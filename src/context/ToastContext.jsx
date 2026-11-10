import React, { createContext, useContext, useRef, useState } from 'react'
import { CToast, CToastBody, CToastClose, CToaster } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilXCircle } from '@coreui/icons'

const ToastContext = createContext(null)

export const useToast = () => useContext(ToastContext)

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const notify = (message, type = 'success') => {
    const id = nextId.current++
    setToasts((items) => [...items, { id, message, type }])
  }

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <CToaster placement="top-end" className="p-3">
        {toasts.map((toast) => (
          <CToast
            key={toast.id}
            visible
            autohide
            delay={3000}
            color={toast.type === 'success' ? 'success' : 'danger'}
            className="text-white border-0 align-items-center"
            onClose={() => setToasts((items) => items.filter((item) => item.id !== toast.id))}
          >
            <div className="d-flex align-items-center">
              <CIcon
                icon={toast.type === 'success' ? cilCheckCircle : cilXCircle}
                className="ms-2 toast-icon-m"
                size="xl"
              />
              <CToastBody>{toast.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        ))}
      </CToaster>
    </ToastContext.Provider>
  )
}