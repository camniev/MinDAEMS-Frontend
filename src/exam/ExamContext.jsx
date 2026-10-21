import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CToast, CToastBody, CToastClose, CToaster } from '@coreui/react'

const ExamContext = createContext(null)
export const useExam = () => useContext(ExamContext)

const uid = (p) => `${p}-${Date.now()}${Math.random().toString(36).slice(2, 5)}`
const TOAST_COLOR = { success: 'success', error: 'danger', info: 'primary' }

// Same base-URL convention as ExamModals.jsx — set VITE_API_BASE_URL in .env;
// this fallback just matches the endpoint you've been testing against.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5026/api'
const GET_EXAM_SCHEDULES_ENDPOINT = `${API_BASE_URL}/Exam/GetExamSchedules`
const saveExamQuestionsEndpoint = (examId) => `${API_BASE_URL}/Question/${examId}/SaveQuestions`

// Duplicated from ExamModals.jsx rather than imported — there's no shared
// api-utils module yet. Worth extracting once a third place needs it.
const extractErrorMessage = async (response, fallback) => {
  try {
    const data = await response.json()
    if (typeof data === 'string' && data.trim()) return data
    const firstFieldError = Object.values(data?.errors ?? {})[0]
    if (Array.isArray(firstFieldError) && firstFieldError.length) return firstFieldError[0]
    return data?.title || data?.message || fallback
  } catch {
    return fallback
  }
}

// The API returns the exam's key as `examId`, but the rest of this app
// (selectedId, question/applicant lookups, route state, etc.) was written
// against a plain `id` field. Rather than rename `id` -> `examId` across
// every view, alias it once here so the rest of the app doesn't need to
// change. `questions` and `applicants` are passed through exactly as the
// API returns them — I haven't seen their real field names beyond what you
// pasted (both arrays were empty in your sample), so if Examinees.jsx /
// Builder.jsx expect something other than what the API actually sends
// (e.g. an `applicantId` vs `studentId` mismatch), that'll need a matching
// fix once there's a non-empty response to check against.
const normalizeExam = (apiExam) => ({
  ...apiExam,
  id: apiExam.examId,
})

export const ExamProvider = ({ children }) => {
  const [exams, setExams] = useState([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [examsError, setExamsError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [addApplicantOpen, setAddApplicantOpen] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const isMounted = useRef(true)
  useEffect(() => () => { isMounted.current = false }, [])

  const toast = useCallback((message, type = 'info') => {
    setToasts((t) => [...t, { id: uid('t'), message, type }])
  }, [])

  const fetchExams = useCallback(async () => {
    setExamsLoading(true)
    setExamsError(null)
    try {
      const response = await fetch(GET_EXAM_SCHEDULES_ENDPOINT)
      if (!response.ok) throw new Error(`Failed to load exam schedules (status ${response.status}).`)
      const payload = await response.json()
      if (!isMounted.current) return
      setExams(payload.map(normalizeExam))
    } catch (error) {
      console.error('Failed to fetch exam schedules:', error)
      if (!isMounted.current) return
      setExamsError(error.message || 'Failed to load exam schedules.')
      toast(error.message || 'Failed to load exam schedules.', 'error')
    } finally {
      if (isMounted.current) setExamsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  // Default to the first loaded exam once data arrives; stays put afterwards
  // so switching exams elsewhere in the app doesn't get reset by a refetch.
  useEffect(() => {
    if (!selectedId && exams.length) setSelectedId(exams[0].id)
  }, [exams, selectedId])

  const selectedExam = exams.find((e) => e.id === selectedId) || exams[0] || null

  const patchExam = (id, fn) => setExams((xs) => xs.map((e) => (e.id === id ? fn(e) : e)))
  const patchSelected = (fn) => {
    if (!selectedExam) return
    patchExam(selectedExam.id, fn)
  }
  const patchQuestion = (qid, fn) =>
    patchSelected((e) => ({ ...e, questions: e.questions.map((q) => (q.id === qid ? fn(q) : q)) }))

  const actions = {
    // Schedules
    // ExamModals already POSTs the new exam to the real API before calling
    // this — GetExamSchedules is now the source of truth, so instead of
    // fabricating a local record with a client-side id (which would never
    // match the database's real examId), just refetch the authoritative
    // list. `data` is accepted but unused, kept so existing callers don't
    // need to change.
    addExam: async (_data) => {
      await fetchExams()
      toast('Exam Schedule successfully created!', 'success')
    },
    refetchExams: fetchExams,
    // NOTE: everything below this line (and every action after it) only
    // mutates local React state — there's no DELETE/PATCH/PUT endpoint
    // wired up for any of it yet. That was fine when `exams` was a
    // hardcoded array, but now that it's loaded from the database, none of
    // these changes persist: a refetch (reload, or creating another exam)
    // will silently bring back whatever the server still has. Treat these
    // as UI-only until matching endpoints exist.
    deleteExam: (id) => {
      if (exams.length <= 1)
        return toast('At least one exam schedule must remain in the system demo.', 'error')
      setExams((xs) => xs.filter((e) => e.id !== id))
      toast('Exam Schedule removed locally (not yet persisted to the server).', 'info')
    },
    // Builder
    // Title/instructions still has no backing endpoint — still local-only.
    saveQuestionnaire: (examTitle, instructions) => {
      patchSelected((e) => ({ ...e, examTitle, instructions }))
      toast('Questionnaire details saved locally (not yet persisted to the server).', 'success')
    },
    // Questions, on the other hand, now have a real endpoint. This sends
    // the exam's *entire current question list* — the server replaces
    // whatever it has for this exam with exactly this set (see the
    // endpoint's replace-all design). The in-memory `id`s on each question
    // (from the local `uid()` helper) are intentionally not sent — they're
    // not real GUIDs, and the server assigns fresh ones on every save.
    // After a successful save, refetch so the questions you see carry the
    // server's real ids instead of the local placeholder ones.
    saveQuestions: async () => {
      if (!selectedExam) return
      const payload = {
        questions: selectedExam.questions.map((q) => ({
          type: q.type,
          text: q.text,
          points: q.points,
          required: q.required,
          options: (q.options || []).map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        })),
      }
      try {
        const response = await fetch(saveExamQuestionsEndpoint(selectedExam.id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          throw new Error(await extractErrorMessage(response, 'Failed to save exam questions.'))
        }
        await fetchExams()
        toast('Exam questions saved successfully.', 'success')
      } catch (error) {
        console.error('Failed to save exam questions:', error)
        toast(error.message || 'Failed to save exam questions.', 'error')
      }
    },
    addQuestion: (type) => {
      const opts = {
        mcq: [
          { text: 'Option 1', isCorrect: true },
          { text: 'Option 2', isCorrect: false },
        ],
        checkbox: [
          { text: 'Choice A', isCorrect: true },
          { text: 'Choice B', isCorrect: false },
        ],
        truefalse: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ],
        essay: [],
      }[type]
      const q = {
        id: uid('q'),
        type,
        text: 'New Question Prompt',
        points: 5,
        required: true,
        options: opts,
      }
      patchSelected((e) => ({ ...e, questions: [...e.questions, q] }))
      toast('New question block added!', 'success')
    },
    duplicateQuestion: (qid) => {
      patchSelected((e) => {
        const i = e.questions.findIndex((q) => q.id === qid)
        if (i < 0) return e
        const clone = { ...structuredClone(e.questions[i]), id: uid('q') }
        clone.text += ' (Copy)'
        const questions = [...e.questions]
        questions.splice(i + 1, 0, clone)
        return { ...e, questions }
      })
      toast('Question duplicated.', 'info')
    },
    deleteQuestion: (qid) => {
      patchSelected((e) => ({ ...e, questions: e.questions.filter((q) => q.id !== qid) }))
      toast('Question deleted.', 'info')
    },
    updateQuestion: (qid, patch) => patchQuestion(qid, (q) => ({ ...q, ...patch })),
    addOption: (qid) =>
      patchQuestion(qid, (q) => ({
        ...q,
        options: [...q.options, { text: `Option ${q.options.length + 1}`, isCorrect: false }],
      })),
    deleteOption: (qid, idx) => {
      if (!selectedExam) return
      const q = selectedExam.questions.find((x) => x.id === qid)
      if (!q || q.options.length <= 1)
        return toast('A question must have at least one choice option.', 'error')
      patchQuestion(qid, (x) => ({ ...x, options: x.options.filter((_, i) => i !== idx) }))
    },
    updateOptionText: (qid, idx, text) =>
      patchQuestion(qid, (q) => ({
        ...q,
        options: q.options.map((o, i) => (i === idx ? { ...o, text } : o)),
      })),
    setCorrect: (qid, idx) =>
      patchQuestion(qid, (q) => ({
        ...q,
        options: q.options.map((o, i) =>
          q.type === 'checkbox'
            ? i === idx
              ? { ...o, isCorrect: !o.isCorrect }
              : o
            : { ...o, isCorrect: i === idx },
        ),
      })),
    // Applicants (renamed from Examinees to match the new terminology and
    // the API's `applicants` key)
    addApplicants: (list, message) => {
      patchSelected((e) => ({
        ...e,
        applicants: [
          ...e.applicants,
          ...list.map((p) => ({ id: uid('applicant'), status: 'Invited', score: null, ...p })),
        ],
      }))
      toast(message, 'success')
    },
    removeApplicant: (id) => {
      patchSelected((e) => ({ ...e, applicants: e.applicants.filter((x) => x.id !== id) }))
      toast('Applicant removed from roster.', 'info')
    },
    resendInvite: (email) => toast(`Invitation & access pass code re-sent to ${email}`, 'success'),
  }

  const value = useMemo(
    () => ({
      exams,
      examsLoading,
      examsError,
      selectedExam,
      setSelectedId,
      search,
      setSearch,
      toast,
      ...actions,
      createOpen,
      openCreate: () => setCreateOpen(true),
      closeCreate: () => setCreateOpen(false),
      addApplicantOpen,
      openAddApplicant: () => setAddApplicantOpen(true),
      closeAddApplicant: () => setAddApplicantOpen(false),
      previewExam: exams.find((e) => e.id === previewId) || null,
      openPreview: (id) => setPreviewId(id || selectedExam?.id || null),
      closePreview: () => setPreviewId(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exams, examsLoading, examsError, selectedId, search, createOpen, addApplicantOpen, previewId, toast],
  )

  return (
    <ExamContext.Provider value={value}>
      {children}
      <CToaster placement="top-end" className="p-3">
        {toasts.map((t) => (
          <CToast
            key={t.id}
            visible
            autohide
            delay={3000}
            color={TOAST_COLOR[t.type]}
            className="text-white border-0"
            onClose={() => setToasts((xs) => xs.filter((x) => x.id !== t.id))}
          >
            <div className="d-flex">
              <CToastBody>{t.message}</CToastBody>
              <CToastClose className="me-2 m-auto" white />
            </div>
          </CToast>
        ))}
      </CToaster>
    </ExamContext.Provider>
  )
}

ExamProvider.propTypes = { children: PropTypes.node }
