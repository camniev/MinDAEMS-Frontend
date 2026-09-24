import React from 'react'

const Dashboard = React.lazy(() => import('./views/exam/Dashboard'))
const Schedules = React.lazy(() => import('./views/exam/Schedules'))
const Builder = React.lazy(() => import('./views/exam/Builder'))
const Examinees = React.lazy(() => import('./views/exam/Examinees'))

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  {
    path: '/dashboard',
    name: 'Dashboard Overview',
    subtitle: 'Monitor exams, build assessments, and assign students.',
    element: Dashboard,
  },
  {
    path: '/schedules',
    name: 'Exam Event Schedules',
    subtitle: 'Create and manage examination calendar events.',
    element: Schedules,
  },
  {
    path: '/builder',
    name: 'Questionnaire Builder',
    subtitle: 'Google Forms style dynamic question editor.',
    element: Builder,
  },
  {
    path: '/examinees',
    name: 'Examinee Directory',
    subtitle: 'Manage enrolled candidates and send assessment invitations.',
    element: Examinees,
  },
]

export default routes
