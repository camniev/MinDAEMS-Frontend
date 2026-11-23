import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE_URL, extractErrorMessage } from 'src/assets/api/Api'
import { useAuthedFetch } from 'src/context/useAuthedFetch'

// Printing of each applicant's questionnaire with their answers, using the browser's own
// print dialog (so HR sets margins/printer there).
//
//   const { print, printing, notice, clearNotice, printHost } = usePrintSubmissions()
//   print(examId, [enrollmentId, …])     // one applicant, or several; [] = every submitted one
//   …and render {printHost} once anywhere in the screen (it only exists while printing).
//
// What is printed, per applicant, on its OWN A4 page(s): Applicant Code, Position Applying For
// and Exam Date, then the questions with the applicant's answers. Never the applicant's name
// and never the answer key — the server doesn't even send either (see GradingController
// PrintData), so they can't leak into the page by accident.

const printDataEndpoint = (examId) => `${API_BASE_URL}/Grading/${examId}/PrintData`

// ---------------------------------------------------------------------------
// Print stylesheet. Hidden on screen; when printing, everything else in <body> is hidden and
// only the print layer shows.
// ---------------------------------------------------------------------------
const PRINT_CSS = `
@page { size: A4; margin: 20mm; }   /* paper size is fixed; margins can still be changed in the print dialog */

.print-root { display: none; }

@media print {
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body > *:not(.print-root) { display: none !important; }
  .print-root {
    display: block;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.35;
    color: #000;
  }

  /* One applicant = one table. break-before starts every applicant on a new page (Word's
     "Insert page"); the header row is a table header, so it repeats on every page of that
     applicant and loose pages can always be put back with the right questionnaire. */
  .ps-sheet { width: 100%; border-collapse: collapse; break-before: page; page-break-before: always; }
  .ps-sheet:first-of-type { break-before: auto; page-break-before: auto; }   /* no blank page before the first applicant */
  .ps-sheet > thead { display: table-header-group; }
  .ps-sheet > thead > tr > td, .ps-sheet > tbody > tr > td { padding: 0; vertical-align: top; }

  .ps-head {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2mm 8mm;
    font-size: 10pt; padding-bottom: 2mm; margin-bottom: 5mm; border-bottom: 1.5px solid #000;
  }
  .ps-title { font-size: 13pt; font-weight: bold; margin: 0 0 5mm 0; text-transform: uppercase; }

  .ps-q { margin: 0 0 5mm 0; }
  .ps-row--keep { break-inside: avoid; page-break-inside: avoid; }   /* a multiple-choice item (and the title) is never split; essays may continue on the next page */
  .ps-qtext { display: flex; gap: 2mm; margin-bottom: 2mm; font-weight: bold; }
  .ps-qnum { flex: 0 0 auto; min-width: 7mm; }
  .ps-pts { font-weight: normal; font-size: 9pt; color: #333; white-space: nowrap; }

  .ps-options { margin-left: 9mm; }
  .ps-opt { display: flex; align-items: flex-start; gap: 2.5mm; margin-bottom: 1.2mm; }
  .ps-opt--picked { font-weight: bold; }
  .ps-box {
    flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    width: 4mm; height: 4mm; margin-top: .6mm; border: 1px solid #000;
    font-size: 8pt; font-weight: bold; line-height: 1;
  }
  .ps-none { margin: 1mm 0 0 6.5mm; font-style: italic; font-size: 10pt; }

  .ps-answer { margin-left: 9mm; border: 1px solid #000; padding: 2mm 3mm; min-height: 12mm; }
  .ps-answer p { margin: 0 0 2mm 0; }
  .ps-answer ul, .ps-answer ol { margin: 0 0 2mm 0; padding-left: 6mm; }
  .ps-answer table { border-collapse: collapse; width: 100%; margin: 1mm 0 3mm 0; }
  .ps-answer thead { display: table-header-group; }   /* a long table repeats its header on the next page */
  .ps-answer tr { break-inside: avoid; page-break-inside: avoid; }   /* rows are never split across pages */
  .ps-answer th, .ps-answer td { border: 1px solid #000; padding: 1mm 2mm; vertical-align: top; text-align: left; }
  .ps-answer th { font-weight: bold; }
  .ps-answer td > p, .ps-answer th > p { margin: 0; }
}
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s)
const htmlToText = (s) =>
  (s ?? '')
    .replace(/<\/(p|li|tr|td|th|h[1-6]|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
const hasText = (s) => htmlToText(s).length > 0

// "2026-11-20" -> "November 20, 2026" (built from the parts so the time zone can't shift the day)
const formatExamDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const EssayAnswer = ({ text }) => {
  if (!hasText(text)) return <em>No answer.</em>
  // Saved essays are sanitized HTML (server-side). Older answers may be plain text.
  return looksLikeHtml(text) ? (
    <div dangerouslySetInnerHTML={{ __html: text }} />
  ) : (
    <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
  )
}

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const PrintQuestion = ({ index, question: q, answer }) => {
  const essay = q.type === 'essay'
  const picked = new Set(answer?.selectedOptionIds ?? [])
  const options = [...(q.options ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className={`ps-q${essay ? ' ps-q--essay' : ''}`}>
      <div className="ps-qtext">
        <span className="ps-qnum">{index + 1}.</span>
        <span>
          <span style={{ whiteSpace: 'pre-wrap' }}>{q.text}</span>{' '}
          <span className="ps-pts">
            ({q.points} {q.points === 1 ? 'pt' : 'pts'})
          </span>
        </span>
      </div>

      {essay ? (
        <div className="ps-answer">
          <EssayAnswer text={answer?.essayText} />
        </div>
      ) : (
        <div className="ps-options">
          {options.map((o, k) => {
            const on = picked.has(o.id)
            return (
              <div key={o.id} className={`ps-opt${on ? ' ps-opt--picked' : ''}`}>
                {/* an X in a drawn box: prints the same on every printer and needs no symbol font */}
                <span className="ps-box">{on ? 'X' : ''}</span>
                <span>
                  {OPTION_LETTERS[k] ?? k + 1}) {o.text}
                </span>
              </div>
            )
          })}
          {picked.size === 0 && <div className="ps-none">No answer selected.</div>}
        </div>
      )}
    </div>
  )
}

const PrintSheet = ({ data, submission }) => {
  const answerByQ = Object.fromEntries(submission.answers.map((a) => [a.questionId, a]))
  const questions = [...data.questions].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <table className="ps-sheet">
      <thead>
        <tr>
          <td>
            <div className="ps-head">
              <span>
                Applicant Code: <strong>{submission.applicantCode}</strong>
              </span>
              <span>
                Position Applying For: <strong>{submission.positionAppliedFor || '—'}</strong>
              </span>
              <span>
                Exam Date: <strong>{formatExamDate(data.examDate)}</strong>
              </span>
            </div>
          </td>
        </tr>
      </thead>
      {/* One table row per question: rows are the natural places for a page to end, and
          browsers repeat the header row reliably when a table continues between rows. */}
      <tbody>
        <tr className="ps-row--keep">
          <td>
            <h1 className="ps-title">{data.examTitle}</h1>
          </td>
        </tr>
        {questions.map((q, i) => (
          <tr key={q.id} className={q.type === 'essay' ? undefined : 'ps-row--keep'}>
            <td>
              <PrintQuestion index={i} question={q} answer={answerByQ[q.id]} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Mounts the sheets, opens the print dialog once, and unmounts when the dialog closes.
const PrintLayer = ({ data, onDone }) => {
  useEffect(() => {
    const finish = () => onDone()
    window.addEventListener('afterprint', finish, { once: true })
    // let the browser lay the sheets out first
    const timer = setTimeout(() => window.print(), 150)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('afterprint', finish)
    }
  }, [onDone])

  return createPortal(
    <div className="print-root">
      <style>{PRINT_CSS}</style>
      {data.submissions.map((s) => (
        <PrintSheet key={s.examEnrollmentId} data={data} submission={s} />
      ))}
    </div>,
    document.body,
  )
}

export const usePrintSubmissions = () => {
  const { authedFetch } = useAuthedFetch() // the print endpoint is role-protected (Administrator / Proctor / Checker)
  const [job, setJob] = useState(null)
  const [printing, setPrinting] = useState(false) // true while the data is being fetched
  const [notice, setNotice] = useState(null) // { color, text }

  const print = useCallback(async (examId, examEnrollmentIds = []) => {
    setPrinting(true)
    setNotice(null)
    try {
      const response = await authedFetch(printDataEndpoint(examId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examEnrollmentIds }),
      })
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response, 'Failed to prepare the printout.'))
      }
      const data = await response.json()
      if (data.submissions.length === 0) {
        setNotice({
          color: 'warning',
          text: 'Nothing to print: none of these applicants has submitted the exam yet.',
        })
        return
      }
      if (data.skipped > 0) {
        setNotice({
          color: 'info',
          text: `${data.skipped} applicant${data.skipped === 1 ? '' : 's'} who haven't submitted ${
            data.skipped === 1 ? 'was' : 'were'
          } left out.`,
        })
      }
      setJob(data)
    } catch (error) {
      console.error('Failed to prepare printout:', error)
      setNotice({ color: 'danger', text: error.message || 'Failed to prepare the printout.' })
    } finally {
      setPrinting(false)
    }
  }, [authedFetch])

  const handleDone = useCallback(() => setJob(null), [])
  const clearNotice = useCallback(() => setNotice(null), [])

  const printHost = job ? <PrintLayer data={job} onDone={handleDone} /> : null

  return { print, printing, notice, clearNotice, printHost }
}
