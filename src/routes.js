import React from 'react'

const Dashboard = React.lazy(() => import('./views/exam/Dashboard'))
const Schedules = React.lazy(() => import('./views/exam/Schedules'))
const Builder = React.lazy(() => import('./views/exam/Builder'))
const Applicants = React.lazy(() => import('./views/exam/Applicants'))
// const ApplicantSchedules = React.lazy(() => import('./applicant/ApplicantSchedules'))
// const ApplicantExamDetails = React.lazy(() => import('./applicant/ApplicantExamDetails'))

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
    path: '/applicants',
    name: 'Applicants Directory',
    subtitle: 'Manage enrolled candidates and send assessment invitations.',
    element: Applicants,
  },
  // {
  //   path: '/applicants/schedules',
  //   name: 'My Exam Schedules',
  //   subtitle: 'Exams currently open to you',
  //   element: ApplicantSchedules,
  // },
  // {
  //   path: '/applicant/exam/:enrollmentId',
  //   name: 'Exam Details',
  //   subtitle: 'Review before you beging',
  //   element: ApplicantExamDetails,
  // },
]

export default routes
