// One place for the role names, shared by App.jsx, ProtectedRoute and Login.
// (App.jsx re-exports ROLES, so anything that already imports it from there
// keeps working.)
export const ROLES = {
  ADMIN: 'Administrator',
  PROCTOR: 'Proctor',
  CHECKER: 'Checker',
  APPLICANT: 'Applicant',
}

// Everyone who belongs in the HR/admin shell.
export const HR_ROLES = [ROLES.ADMIN, ROLES.PROCTOR, ROLES.CHECKER]

// Where each kind of user lands after login, and where they get sent if they
// wander into a part of the app that isn't theirs.
export const homePathForRole = (role) =>
  role === ROLES.APPLICANT ? '/applicant/schedules' : '/dashboard'
