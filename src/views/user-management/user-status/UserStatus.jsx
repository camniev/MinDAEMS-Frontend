import React from 'react'
import PropTypes from 'prop-types'

const statusMap = {
  false: { className: 'status-inactive', text: 'Inactive' },
  true: { className: 'status-active', text: 'Active' },
}

const UserStatus = ({ userStatus }) => {
  const { className, text } = statusMap[userStatus] || {}

  return (
    <h6 className={`user-status-section ${className}`}>
      <svg height="18" width="18" xmlns="http://www.w3.org/2000/svg">
        <circle r="5" cx="5" cy="9" fill="#000000" />
      </svg>
      {text}
    </h6>
  )
}

UserStatus.propTypes = {
  userStatus: PropTypes.bool.isRequired,
}

export default UserStatus
