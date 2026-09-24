import React, { useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilAlignLeft,
  cilCopy,
  cilSave,
  cilMediaPlay,
  cilPlus,
  cilTrash,
  cilX,
} from '@coreui/icons'
import { useExam } from 'src/exam/ExamContext'
import { QUESTION_TYPES } from 'src/exam/data'

const Options = ({ q }) => {
  const { setCorrect, updateOptionText, deleteOption, addOption } = useExam()
  if (q.type === 'essay') {
    return (
      <div className="border border-dashed rounded p-3 small fst-italic text-body-secondary bg-body-tertiary">
        <CIcon icon={cilAlignLeft} className="me-2" />
        Examinees will enter a written text answer in a multiline box.
      </div>
    )
  }
  const single = q.type !== 'checkbox'
  return (
    <div className="d-grid gap-2">
      {q.options.map((o, i) => (
        <div
          key={i}
          className="d-flex align-items-center gap-2 border rounded p-2 bg-body-tertiary"
        >
          <CFormCheck
            type={single ? 'radio' : 'checkbox'}
            name={`correct-${q.id}`}
            checked={o.isCorrect}
            onChange={() => setCorrect(q.id, i)}
            title="Mark as correct answer"
          />
          <CFormInput
            size="sm"
            value={o.text}
            readOnly={q.type === 'truefalse'}
            onChange={(e) => updateOptionText(q.id, i, e.target.value)}
          />
          {o.isCorrect && (
            <CBadge color="success" className="text-nowrap">
              Correct Answer
            </CBadge>
          )}
          {q.type !== 'truefalse' && (
            <CButton
              color="link"
              size="sm"
              className="text-danger p-1"
              onClick={() => deleteOption(q.id, i)}
              aria-label="Delete option"
            >
              <CIcon icon={cilX} />
            </CButton>
          )}
        </div>
      ))}
      {q.type !== 'truefalse' && (
        <div>
          <CButton color="primary" variant="ghost" size="sm" onClick={() => addOption(q.id)}>
            <CIcon icon={cilPlus} size="sm" className="me-1" /> Add Option
          </CButton>
        </div>
      )}
    </div>
  )
}

const QuestionCard = ({ q, index }) => {
  const { updateQuestion, duplicateQuestion, deleteQuestion } = useExam()
  return (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <CBadge color="primary" shape="rounded-circle" className="px-2">
              {index + 1}
            </CBadge>
            <span className="small fw-semibold text-body-secondary text-uppercase">
              {QUESTION_TYPES[q.type]}
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <label className="small fw-semibold" htmlFor={`pts-${q.id}`}>
                Points:
              </label>
              <CFormInput
                id={`pts-${q.id}`}
                type="number"
                min={1}
                size="sm"
                style={{ width: 80 }}
                value={q.points}
                onChange={(e) => updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })}
              />
            </div>
            <CFormCheck
              label="Required"
              checked={q.required}
              onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
            />
          </div>
        </div>
        <CFormInput
          className="fw-semibold mb-3"
          placeholder="Enter question statement..."
          value={q.text}
          onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
        />
        <Options q={q} />
        <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-3">
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={() => duplicateQuestion(q.id)}
          >
            <CIcon icon={cilCopy} className="me-1" /> Duplicate
          </CButton>
          <CButton color="danger" variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}>
            <CIcon icon={cilTrash} className="me-1" /> Delete
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const BuilderBody = () => {
  const { exams, selectedExam, setSelectedId, saveQuestionnaire, addQuestion, openPreview } =
    useExam()
  const [title, setTitle] = useState(selectedExam.title)
  const [instructions, setInstructions] = useState(selectedExam.instructions || '')

  const total = selectedExam.questions.reduce((n, q) => n + (q.points || 0), 0)

  return (
    <>
      <CCard className="mb-4">
        <CCardBody className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3">
          <div className="flex-grow-1" style={{ maxWidth: 520 }}>
            <label
              className="small fw-semibold text-body-secondary text-uppercase mb-1"
              htmlFor="builder-exam"
            >
              Target Exam Schedule
            </label>
            <CFormSelect
              id="builder-exam"
              value={selectedExam.id}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3">
            <div className="text-center border rounded px-3 py-1 bg-body-tertiary">
              <div className="small text-body-secondary text-uppercase">Total Score</div>
              <div className="fw-bold text-primary">{total} Points</div>
            </div>
            <div className="text-center border rounded px-3 py-1 bg-body-tertiary">
              <div className="small text-body-secondary text-uppercase">Question Count</div>
              <div className="fw-bold">{selectedExam.questions.length}</div>
            </div>
            <CButton color="success" size="sm" onClick={() => openPreview(selectedExam.id)}>
              <CIcon icon={cilMediaPlay} className="me-1" /> Student Preview
            </CButton>
            <CButton
              color="primary"
              size="sm"
              onClick={() => saveQuestionnaire(title.trim(), instructions.trim())}
            >
              <CIcon icon={cilSave} className="me-1" /> Save Questionnaire
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <CCard className="mb-3 border-top-primary border-top-3">
          <CCardBody>
            <CFormInput
              className="fs-4 fw-bold mb-2"
              placeholder="Exam Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <CFormTextarea
              rows={2}
              placeholder="Instructions for examinees (e.g., Duration, guidelines, rules)..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </CCardBody>
        </CCard>

        {selectedExam.questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i} />
        ))}

        <CCard className="position-sticky shadow" style={{ bottom: '1rem', zIndex: 5 }}>
          <CCardBody className="d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
            <span className="small fw-semibold">
              <CIcon icon={cilPlus} className="text-primary me-1" /> Add Question Type:
            </span>
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(QUESTION_TYPES).map(([type, label]) => (
                <CButton
                  key={type}
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion(type)}
                >
                  {label}
                </CButton>
              ))}
            </div>
          </CCardBody>
        </CCard>
      </div>
    </>
  )
}

const Builder = () => {
  const { selectedExam } = useExam()
  // key resets the title/instructions drafts whenever another exam is selected
  return <BuilderBody key={selectedExam.id} />
}

export default Builder
