import React from 'react'
import { HR_ROLES, ROLES } from './constants/roles'

const Dashboard = React.lazy(() => import('./views/exam/Dashboard'))
const Schedules = React.lazy(() => import('./views/exam/Schedules'))
const Builder = React.lazy(() => import('./views/exam/Builder'))
const Applicants = React.lazy(() => import('./views/exam/Applicants'))
const ApplicantSchedules = React.lazy(() => import('./applicant/ApplicantSchedules'))
const CheckingAndGrading = React.lazy(() => import('./views/exam/CheckingAndGrading'))
const ApplicantExamDetails = React.lazy(() => import('./applicant/ApplicantExamDetails'))
const ApplicantExamTaking = React.lazy(() => import('./applicant/ApplicantExamTaking'))

// User Management
const UserAccountsList = React.lazy(() => import('./views/user-management/user-accounts-list/UserAccounts'))
const ViewUser = React.lazy(() => import('./views/user-management/view-user/ViewUser'))


export const routes = [
  { path: '/', exact: true, name: 'Home' },
  {
    path: '/dashboard',
    name: 'Dashboard Overview',
    subtitle: 'Monitor exams, build assessments, and assign students.',
    element: Dashboard,
    roles: HR_ROLES,
  },
  {
    path: '/schedules',
    name: 'Exam Event Schedules',
    subtitle: 'Create and manage examination calendar events.',
    element: Schedules,
    roles: HR_ROLES,
  },
  {
    path: '/builder',
    name: 'Questionnaire Builder',
    subtitle: 'Google Forms style dynamic question editor.',
    element: Builder,
    roles: HR_ROLES,
  },
  {
    path: '/applicants',
    name: 'Applicants Directory',
    subtitle: 'Manage enrolled candidates and send assessment invitations.',
    element: Applicants,
    roles: HR_ROLES,
  },
  {
    path: '/checking-and-grading',
    name: 'Checking and Grading',
    subtitle: 'Review and grade submitted assessments.',
    element: CheckingAndGrading,
    roles: HR_ROLES,
  },
  {
    path: '/user-management/user-accounts-list',
    name: 'Add User',
    element: UserAccountsList,
    roles: HR_ROLES,
  },
  {
    path: '/user-management/view-user',
    name: 'Add User',
    element: ViewUser,
    roles: HR_ROLES,
  },
  {
    path: '/user-management/edit-user/:userId',
    name: 'Edit User',
    element: ViewUser,
    roles: HR_ROLES,
  },
  {
    path: '/applicant/schedules',
    name: 'My Exam Schedules',
    subtitle: 'sdsfd',
    element: ApplicantSchedules,
    roles: [ROLES.APPLICANT],
  },
  {
    path: '/applicant/exam/:enrollmentId',
    name: 'Exam Details',
    subtitle: 'Review Exam Instructions and Start the Assessment.',
    element: ApplicantExamDetails,
    roles: [ROLES.APPLICANT],
  },
  {
    path: '/applicant/exam/:enrollmentId/take',
    name: 'Take Exam',
    subtitle: 'Start the assessment and answer the questions.',
    element: ApplicantExamTaking,
    roles: [ROLES.APPLICANT],
  },
]

export default routes
