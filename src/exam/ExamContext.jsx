import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CToast, CToastBody, CToastClose, CToaster } from '@coreui/react'
import { seedExams } from './data'

const ExamContext = createContext(null)
export const useExam = () => useContext(ExamContext)

const uid = (p) => `${p}-${Date.now()}${Math.random().toString(36).slice(2, 5)}`
const TOAST_COLOR = { success: 'success', error: 'danger', info: 'primary' }

export const ExamProvider = ({ children }) => {
  const [exams, setExams] = useState(seedExams)
  const [selectedId, setSelectedId] = useState('exam-1')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [addExamineeOpen, setAddExamineeOpen] = useState(false)
  const [previewId, setPreviewId] = useState(null)

  const selectedExam = exams.find((e) => e.id === selectedId) || exams[0]

  const toast = useCallback((message, type = 'info') => {
    setToasts((t) => [...t, { id: uid('t'), message, type }])
  }, [])

  const patchExam = (id, fn) => setExams((xs) => xs.map((e) => (e.id === id ? fn(e) : e)))
  const patchSelected = (fn) => patchExam(selectedExam.id, fn)
  const patchQuestion = (qid, fn) =>
    patchSelected((e) => ({ ...e, questions: e.questions.map((q) => (q.id === qid ? fn(q) : q)) }))

  const actions = {
    // Schedules
    addExam: (data) => {
      const prefix = data.subject.substring(0, 3).toUpperCase() || 'EXM'
      const code = prefix + Math.floor(100 + Math.random() * 900)
      setExams((xs) => [
        {
          ...data,
          id: uid('exam'),
          accessCode: code,
          status: 'Upcoming',
          questions: [],
          examinees: [],
        },
        ...xs,
      ])
      toast('Exam Schedule successfully created!', 'success')
    },
    deleteExam: (id) => {
      if (exams.length <= 1)
        return toast('At least one exam schedule must remain in the system demo.', 'error')
      setExams((xs) => xs.filter((e) => e.id !== id))
      toast('Exam Schedule removed.', 'info')
    },
    // Builder
    saveQuestionnaire: (title, instructions) => {
      patchSelected((e) => ({ ...e, title, instructions }))
      toast('Questionnaire saved successfully!', 'success')
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
    // Examinees
    addExaminees: (list, message) => {
      patchSelected((e) => ({
        ...e,
        examinees: [
          ...e.examinees,
          ...list.map((p) => ({ id: uid('ex'), status: 'Invited', score: null, ...p })),
        ],
      }))
      toast(message, 'success')
    },
    removeExaminee: (id) => {
      patchSelected((e) => ({ ...e, examinees: e.examinees.filter((x) => x.id !== id) }))
      toast('Examinee removed from roster.', 'info')
    },
    resendInvite: (email) => toast(`Invitation & access pass code re-sent to ${email}`, 'success'),
  }

  const value = useMemo(
    () => ({
      exams,
      selectedExam,
      setSelectedId,
      search,
      setSearch,
      toast,
      ...actions,
      createOpen,
      openCreate: () => setCreateOpen(true),
      closeCreate: () => setCreateOpen(false),
      addExamineeOpen,
      openAddExaminee: () => setAddExamineeOpen(true),
      closeAddExaminee: () => setAddExamineeOpen(false),
      previewExam: exams.find((e) => e.id === previewId) || null,
      openPreview: (id) => setPreviewId(id || selectedExam.id),
      closePreview: () => setPreviewId(null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exams, selectedId, search, createOpen, addExamineeOpen, previewId, toast],
  )

  return (
    <ExamContext.Provider value={value}>
      {children}
      <CToaster placement="bottom-end" className="p-3">
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
