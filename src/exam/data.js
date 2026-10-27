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

// Matches the four exam-schedule statuses the backend now computes/stores
// (see ExamContext.jsx's EXAM_STATUSES): Upcoming/Ongoing/Closed are
// time-derived, Archived is a manual soft-delete.
export const STATUS_COLOR = {
  Upcoming: 'primary',
  Ongoing: 'success',
  Closed: 'secondary',
  Archived: 'dark',
}

// Renamed from EXAMINEE_COLOR to match the applicant terminology.
export const APPLICANT_COLOR = {
  Completed: 'success',
  Registered: 'primary',
  Disqualified: 'danger',
  Invited: 'secondary',
}