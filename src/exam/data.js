const tf = (c) => [
  { text: 'True', isCorrect: c },
  { text: 'False', isCorrect: !c },
]
const o = (text, isCorrect = false) => ({ text, isCorrect })
const ex = (id, name, email, studentId, department, status, score = null) => ({
  id,
  name,
  email,
  studentId,
  department,
  status,
  score,
})

export const seedExams = [
  {
    id: 'exam-1',
    title: 'CS-301: Advanced Data Structures & Algorithms',
    subject: 'Computer Science',
    date: '2026-09-25',
    startTime: '09:00',
    duration: 90,
    passingScore: 70,
    instructions:
      'Calculators are allowed. No outside reference materials permitted. Complete all multiple choice and code analysis questions.',
    accessType: 'Private',
    accessCode: 'CS301-MID',
    status: 'Active',
    questions: [
      {
        id: 'q-1',
        type: 'mcq',
        points: 5,
        required: true,
        text: 'What is the worst-case time complexity of QuickSort algorithm?',
        options: [o('O(N log N)'), o('O(N²)', true), o('O(N)'), o('O(log N)')],
      },
      {
        id: 'q-2',
        type: 'checkbox',
        points: 10,
        required: true,
        text: 'Select all self-balancing binary search tree data structures:',
        options: [
          o('AVL Tree', true),
          o('Red-Black Tree', true),
          o('Binary Heap'),
          o('B-Tree', true),
        ],
      },
      {
        id: 'q-3',
        type: 'truefalse',
        points: 5,
        required: true,
        text: 'In a directed acyclic graph (DAG), topological sorting is always unique.',
        options: tf(false),
      },
      {
        id: 'q-4',
        type: 'essay',
        points: 15,
        required: true,
        text: 'Briefly explain the fundamental difference between BFS (Breadth-First Search) and DFS (Depth-First Search) and state an appropriate use case for each.',
        options: [],
      },
    ],
    examinees: [
      ex(
        'ex-101',
        'Sophia Martinez',
        'sophia.m@university.edu',
        'STU-9021',
        'Computer Science',
        'Completed',
        92,
      ),
      ex(
        'ex-102',
        'Liam Chen',
        'liam.chen@university.edu',
        'STU-9022',
        'Software Engineering',
        'Completed',
        68,
      ),
      ex(
        'ex-103',
        'Emma Watson',
        'emma.w@university.edu',
        'STU-9023',
        'Computer Science',
        'Registered',
      ),
      ex(
        'ex-104',
        'Noah Miller',
        'noah.m@university.edu',
        'STU-9024',
        'Information Tech',
        'Invited',
      ),
      ex(
        'ex-105',
        'Olivia Davis',
        'olivia.d@university.edu',
        'STU-9025',
        'Computer Science',
        'Registered',
      ),
    ],
  },
  {
    id: 'exam-2',
    title: 'ENG-102: Business Communication & Ethics Final',
    subject: 'Humanities',
    date: '2026-10-02',
    startTime: '13:00',
    duration: 60,
    passingScore: 65,
    instructions: 'Read case studies carefully before submitting essay responses.',
    accessType: 'Public',
    accessCode: 'ENG102-PUB',
    status: 'Upcoming',
    questions: [
      {
        id: 'q-201',
        type: 'truefalse',
        points: 10,
        required: true,
        text: 'Active listening requires providing verbal and non-verbal feedback during a conversation.',
        options: tf(true),
      },
    ],
    examinees: [
      ex('ex-201', 'Ethan Thomas', 'ethan.t@univ.edu', 'STU-8810', 'Business', 'Invited'),
      ex('ex-202', 'Ava Taylor', 'ava.t@univ.edu', 'STU-8811', 'Business', 'Registered'),
    ],
  },
  {
    id: 'exam-3',
    title: 'MATH-204: Linear Algebra & Differential Equations',
    subject: 'Mathematics',
    date: '2026-09-18',
    startTime: '10:00',
    duration: 120,
    passingScore: 75,
    instructions:
      'Comprehensive exam covering matrix inversions, eigenvalues, and second-order ODEs.',
    accessType: 'Private',
    accessCode: 'MATH204-FIN',
    status: 'Completed',
    questions: [
      {
        id: 'q-301',
        type: 'mcq',
        points: 5,
        required: true,
        text: 'What is the determinant of an identity matrix of size 4x4?',
        options: [o('0'), o('1', true), o('4'), o('Undefined')],
      },
    ],
    examinees: [
      ex('ex-301', 'James Anderson', 'james.a@univ.edu', 'STU-7701', 'Physics', 'Completed', 88),
      ex(
        'ex-302',
        'Isabella White',
        'isabella.w@univ.edu',
        'STU-7702',
        'Mathematics',
        'Completed',
        94,
      ),
    ],
  },
]

export const QUESTION_TYPES = {
  mcq: 'Multiple Choice',
  checkbox: 'Checkboxes',
  truefalse: 'True / False',
  essay: 'Short Answer / Essay',
}

export const STATUS_COLOR = { Active: 'success', Upcoming: 'primary', Completed: 'secondary' }
export const EXAMINEE_COLOR = {
  Completed: 'success',
  Registered: 'primary',
  Disqualified: 'danger',
  Invited: 'secondary',
}
