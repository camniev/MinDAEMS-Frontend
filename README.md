# ExamSphere – Examination Management System (CoreUI React prototype)

The original HTML/Tailwind prototype ported onto the **CoreUI Free React Admin Template** (Vite + React + @coreui/react).

## Run
```bash
npm install
npm start        # http://localhost:3000
npm run build    # production build -> ./build
```

## Where things live
| Prototype feature | Location |
|---|---|
| Dashboard (stats, active exam, quick tasks, schedule preview) | `src/views/exam/Dashboard.jsx` |
| Exam Schedules (filters, cards, delete) | `src/views/exam/Schedules.jsx` |
| Question Builder (MCQ, checkbox, true/false, essay) | `src/views/exam/Builder.jsx` |
| Examinees Directory (search, status filter, table) | `src/views/exam/Examinees.jsx` |
| Create Exam / Add Examinees (single + bulk) / Student Live Preview modals | `src/exam/ExamModals.jsx` |
| Shared state, actions, toasts (replaces the prototype's global `state`) | `src/exam/ExamContext.jsx` |
| Demo dataset (3 exams, questions, examinees) | `src/exam/data.js` |
| Sidebar nav / routes | `src/_nav.jsx`, `src/routes.js` |

Data is in-memory only (resets on refresh), same as the prototype. To persist, replace the `useState(seedExams)` in `ExamContext.jsx` with API calls or localStorage.
