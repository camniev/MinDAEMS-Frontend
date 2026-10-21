// Static seed data removed — exams now come from GET /Exam/GetExamSchedules
// (see ExamContext.jsx). This file is just shared lookup/config constants
// that views use for labels and badge colors, independent of where the
// exam data itself comes from.

export const QUESTION_TYPES = {
  mcq: 'Multiple Choice',
  checkbox: 'Checkboxes',
  truefalse: 'True / False',
  essay: 'Short Answer / Essay',
}

export const STATUS_COLOR = { Active: 'success', Upcoming: 'primary', Completed: 'secondary' }

// Renamed from EXAMINEE_COLOR to match the applicant terminology.
export const APPLICANT_COLOR = {
  Completed: 'success',
  Registered: 'primary',
  Disqualified: 'danger',
  Invited: 'secondary',
}
