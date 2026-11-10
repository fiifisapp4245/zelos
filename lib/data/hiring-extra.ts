import { DEFAULT_OFFER_TEMPLATE } from "../offers"
import type {
  Announcement,
  AnnouncementRead,
  Asset,
  Survey,
  SurveyParticipation,
  SurveyResponse,
  OfferSignature,
  OfferTemplate,
  Availability,
  AssessmentTest,
  Booking,
  BookingPage,
  EmailMessage,
  Question,
  TestInvitation,
} from "../types"

export const BOOKING_PAGES: BookingPage[] = [
  {
    id: "bp-phone",
    name: "Phone screen",
    requisitionId: null,
    kind: "phone",
    durationMin: 30,
    bufferMin: 10,
    advanceDays: 14,
    minNoticeHours: 24,
    dailyLimit: 6,
    interviewerIds: ["fiifi", "serwa"],
    assign: "round_robin",
    video: "zelos_meet",
    videoLink: "",
    questions: ["Phone number", "Notice period"],
    cancelCutoffHours: 12,
    active: true,
  },
  {
    id: "bp-tech-014",
    name: "Technical interview — Senior Backend Engineer",
    requisitionId: "REQ-014",
    kind: "technical",
    durationMin: 60,
    bufferMin: 15,
    advanceDays: 14,
    minNoticeHours: 24,
    dailyLimit: 4,
    interviewerIds: ["adwoa", "selorm"],
    assign: "round_robin",
    video: "zelos_meet",
    videoLink: "",
    questions: ["Link to your portfolio or GitHub", "Notice period"],
    cancelCutoffHours: 24,
    active: true,
  },
  {
    id: "bp-final",
    name: "Final interview",
    requisitionId: null,
    kind: "final",
    durationMin: 45,
    bufferMin: 15,
    advanceDays: 21,
    minNoticeHours: 48,
    dailyLimit: 3,
    interviewerIds: ["kwesi"],
    assign: "fixed",
    video: "external",
    videoLink: "https://meet.google.com/zel-final-room",
    questions: [],
    cancelCutoffHours: 24,
    active: true,
  },
]

const week = [1, 2, 3, 4, 5]

export const AVAILABILITY: Availability[] = [
  { employeeId: "fiifi", days: week, start: "09:00", end: "17:00" },
  { employeeId: "serwa", days: week, start: "09:00", end: "16:00" },
  { employeeId: "adwoa", days: [2, 3, 4], start: "10:00", end: "16:00" },
  { employeeId: "selorm", days: week, start: "10:00", end: "17:00" },
  { employeeId: "kwesi", days: [1, 3, 5], start: "09:00", end: "15:00" },
]

export const BOOKINGS: Booking[] = []
export const OUTBOX: EmailMessage[] = []
export const INVITATIONS: TestInvitation[] = []

export const QUESTION_BANK: Question[] = [
  {
    id: "q-typeof",
    kind: "mcq",
    prompt: "What does `typeof null` return in JavaScript?",
    skill: "JavaScript",
    level: "junior",
    marks: 2,
    options: ['"null"', '"object"', '"undefined"', '"number"'],
    correct: [1],
  },
  {
    id: "q-201",
    kind: "mcq",
    prompt: "Which HTTP status code means a resource was created?",
    skill: "APIs",
    level: "junior",
    marks: 2,
    options: ["200", "201", "204", "301"],
    correct: [1],
  },
  {
    id: "q-idempotent",
    kind: "multi",
    prompt:
      "Which of these HTTP methods are idempotent? Choose all that apply.",
    skill: "APIs",
    level: "mid",
    marks: 3,
    options: ["GET", "POST", "PUT", "DELETE"],
    correct: [0, 2, 3],
  },
  {
    id: "q-having",
    kind: "mcq",
    prompt: "Which SQL clause filters groups after aggregation?",
    skill: "SQL",
    level: "junior",
    marks: 2,
    options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
    correct: [1],
  },
  {
    id: "q-thread",
    kind: "short",
    prompt:
      "In a few sentences, what is the difference between a process and a thread?",
    skill: "Fundamentals",
    level: "mid",
    marks: 5,
    guide:
      "Look for: separate memory vs shared memory; cost of creation and switching; isolation and failure; an example of when to use each.",
  },
  {
    id: "q-ratelimit",
    kind: "long",
    prompt:
      "Describe how you would add rate limiting to a public API used by thousands of clients. Cover where it runs, the algorithm, and what a limited client sees.",
    skill: "System design",
    level: "senior",
    marks: 10,
    guide:
      "Strong answers: token bucket or sliding window; a shared store (Redis) for counts across instances; keyed by client/API key; 429 with Retry-After; headers showing the limit; burst vs sustained; abuse of unauthenticated routes.",
  },
  {
    id: "q-diagram",
    kind: "upload",
    prompt:
      "Upload a one-page diagram of a system you built or worked on, with a short caption.",
    skill: "System design",
    level: "mid",
    marks: 5,
    guide:
      "Is it clear? Does it show boundaries, data stores and what talks to what?",
  },
  {
    id: "q-sum-even",
    kind: "code",
    prompt:
      "Write `sumEven(nums)` that returns the sum of the even numbers in an array of integers. An empty array gives 0.",
    skill: "JavaScript",
    level: "junior",
    marks: 8,
    code: {
      language: "javascript",
      fn: "sumEven",
      starter: "function sumEven(nums) {\n  // your code here\n}\n",
      tests: [
        { args: [[1, 2, 3, 4]], expected: 6, hidden: false },
        { args: [[]], expected: 0, hidden: false },
        { args: [[7, 9, 11]], expected: 0, hidden: true },
        { args: [[-2, -4, 5]], expected: -6, hidden: true },
        { args: [[0, 10, 20]], expected: 30, hidden: true },
      ],
    },
  },
  {
    id: "q-palindrome",
    kind: "code",
    prompt:
      "Write `isPalindrome(text)` that returns true when the text reads the same backwards, ignoring case, spaces and punctuation.",
    skill: "JavaScript",
    level: "mid",
    marks: 10,
    code: {
      language: "javascript",
      fn: "isPalindrome",
      starter: "function isPalindrome(text) {\n  // your code here\n}\n",
      tests: [
        { args: ["Racecar"], expected: true, hidden: false },
        { args: ["hello"], expected: false, hidden: false },
        {
          args: ["A man, a plan, a canal: Panama"],
          expected: true,
          hidden: true,
        },
        { args: [""], expected: true, hidden: true },
        { args: ["No lemon, no melon!"], expected: true, hidden: true },
        { args: ["ab"], expected: false, hidden: true },
      ],
    },
  },
  {
    id: "q-fizz",
    kind: "code",
    prompt:
      'Write `fizzBuzz(n)` returning an array for 1..n: "Fizz" for multiples of 3, "Buzz" for 5, "FizzBuzz" for both, otherwise the number.',
    skill: "JavaScript",
    level: "junior",
    marks: 8,
    code: {
      language: "javascript",
      fn: "fizzBuzz",
      starter: "function fizzBuzz(n) {\n  // your code here\n}\n",
      tests: [
        { args: [5], expected: [1, 2, "Fizz", 4, "Buzz"], hidden: false },
        {
          args: [15],
          expected: [
            1,
            2,
            "Fizz",
            4,
            "Buzz",
            "Fizz",
            7,
            8,
            "Fizz",
            "Buzz",
            11,
            "Fizz",
            13,
            14,
            "FizzBuzz",
          ],
          hidden: true,
        },
        { args: [0], expected: [], hidden: true },
        { args: [3], expected: [1, 2, "Fizz"], hidden: true },
      ],
    },
  },
]

export const TESTS: AssessmentTest[] = [
  {
    id: "test-backend",
    name: "Backend engineer screen",
    requisitionId: "REQ-014",
    questionIds: [
      "q-typeof",
      "q-201",
      "q-idempotent",
      "q-having",
      "q-thread",
      "q-ratelimit",
      "q-sum-even",
      "q-palindrome",
    ],
    pickCount: null,
    shuffle: false,
    durationMin: 60,
    passMarkPct: 60,
    windowDays: 5,
    requiredForOffer: true,
    active: true,
  },
  {
    id: "test-quick",
    name: "Quick knowledge check",
    requisitionId: null,
    questionIds: ["q-typeof", "q-201", "q-idempotent", "q-having", "q-thread"],
    pickCount: 3,
    shuffle: true,
    durationMin: 15,
    passMarkPct: 50,
    windowDays: 7,
    requiredForOffer: false,
    active: true,
  },
]

export const OFFER_TEMPLATES: OfferTemplate[] = [
  { id: "ot-standard", name: "Standard offer", body: DEFAULT_OFFER_TEMPLATE },
]

export const OFFER_SIGNATURES: OfferSignature[] = []

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an-conduct",
    title: "Code of conduct, updated September 2026",
    body: "We have updated our code of conduct. The main changes: a clearer policy on handling confidential records (access is logged and has to have a business reason), a section on social media, and how to raise a concern.\n\nPlease read the full policy and confirm you have understood it. Everyone has until 30 September.",
    audience: { kind: "all", value: "" },
    postedBy: "fiifi",
    postedOn: "2026-09-10T09:00:00.000Z",
    pinned: true,
    requiresAck: true,
    archived: false,
  },
  {
    id: "an-holiday",
    title: "Office closed on Monday 21 September",
    body: "The Accra HQ office will be closed on Monday 21 September for the Founders' Day observance. Payroll and approvals continue as normal; please plan any deadlines around it.",
    audience: { kind: "branch", value: "Accra HQ" },
    postedBy: "fiifi",
    postedOn: "2026-09-14T11:30:00.000Z",
    pinned: false,
    requiresAck: false,
    archived: false,
  },
  {
    id: "an-eng",
    title: "Engineering: on-call rota for Q4",
    body: "The Q4 on-call rota is published. Swaps need to be agreed with the person you are swapping with and noted in the channel by Friday. Thank you to everyone who covered the migration weekend.",
    audience: { kind: "department", value: "Engineering" },
    postedBy: "adwoa",
    postedOn: "2026-09-16T15:00:00.000Z",
    pinned: false,
    requiresAck: false,
    archived: false,
  },
]

export const ANNOUNCEMENT_READS: AnnouncementRead[] = [
  {
    announcementId: "an-conduct",
    employeeId: "kofi",
    readOn: "2026-09-11",
    acknowledgedOn: "2026-09-11",
  },
  {
    announcementId: "an-conduct",
    employeeId: "ama",
    readOn: "2026-09-12",
    acknowledgedOn: "2026-09-12",
  },
  {
    announcementId: "an-conduct",
    employeeId: "selorm",
    readOn: "2026-09-12",
    acknowledgedOn: null,
  },
  {
    announcementId: "an-conduct",
    employeeId: "adwoa",
    readOn: "2026-09-10",
    acknowledgedOn: "2026-09-10",
  },
  {
    announcementId: "an-holiday",
    employeeId: "kofi",
    readOn: "2026-09-15",
    acknowledgedOn: null,
  },
]

export const ASSETS: Asset[] = [
  {
    id: "as-1",
    tag: "ZEL-LT-0182",
    kind: "laptop",
    name: "Dell Latitude 5440",
    serial: "DL5440-77A1",
    status: "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [
      { at: "2023-02-01", text: "Assigned to Kojo Antwi." },
      { at: "2026-09-12", text: "Returned by Kojo Antwi." },
    ],
  },
  {
    id: "as-2",
    tag: "AC-4471",
    kind: "card",
    name: "Access card",
    serial: "",
    status: "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [
      { at: "2023-02-01", text: "Assigned to Kojo Antwi." },
      { at: "2026-09-12", text: "Returned by Kojo Antwi." },
    ],
  },
  {
    id: "as-3",
    tag: "ZEL-SIM-0031",
    kind: "sim",
    name: "MTN SIM (work line)",
    serial: "233244000031",
    status: "assigned",
    assignedTo: "kojo",
    assignedOn: "2023-02-01",
    history: [{ at: "2023-02-01", text: "Assigned to Kojo Antwi." }],
  },
  {
    id: "as-4",
    tag: "ZEL-LT-0201",
    kind: "laptop",
    name: "MacBook Pro 14",
    serial: "C02XK1ABJG5H",
    status: "assigned",
    assignedTo: "adwoa",
    assignedOn: "2024-01-15",
    history: [{ at: "2024-01-15", text: "Assigned to Adwoa Bediako." }],
  },
  {
    id: "as-5",
    tag: "ZEL-LT-0233",
    kind: "laptop",
    name: "MacBook Pro 14",
    serial: "C02ZL8CDJG5H",
    status: "assigned",
    assignedTo: "kofi",
    assignedOn: "2024-03-04",
    history: [{ at: "2024-03-04", text: "Assigned to Kofi Mensah." }],
  },
  {
    id: "as-6",
    tag: "ZEL-PH-0044",
    kind: "phone",
    name: "Samsung Galaxy A54",
    serial: "R5CW31XY9QZ",
    status: "assigned",
    assignedTo: "kofi",
    assignedOn: "2024-03-04",
    history: [{ at: "2024-03-04", text: "Assigned to Kofi Mensah." }],
  },
  {
    id: "as-7",
    tag: "ZEL-LT-0250",
    kind: "laptop",
    name: "Dell Latitude 5440",
    serial: "DL5440-81C9",
    status: "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [{ at: "2026-08-20", text: "Added to stock." }],
  },
  {
    id: "as-8",
    tag: "ZEL-LT-0251",
    kind: "laptop",
    name: "Dell Latitude 5440",
    serial: "DL5440-81D2",
    status: "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [{ at: "2026-08-20", text: "Added to stock." }],
  },
  {
    id: "as-9",
    tag: "AC-5002",
    kind: "card",
    name: "Access card",
    serial: "",
    status: "in_stock",
    assignedTo: null,
    assignedOn: null,
    history: [{ at: "2026-08-20", text: "Added to stock." }],
  },
  {
    id: "as-10",
    tag: "ZEL-LT-0090",
    kind: "laptop",
    name: "HP ProBook 450",
    serial: "HP450-1190",
    status: "retired",
    assignedTo: null,
    assignedOn: null,
    history: [
      { at: "2022-04-01", text: "Assigned to Nii Lartey." },
      { at: "2025-12-31", text: "Returned by Nii Lartey." },
      { at: "2026-02-10", text: "Retired: end of life." },
    ],
  },
]

export const SURVEYS: Survey[] = [
  {
    id: "sv-q3",
    title: "Q3 pulse",
    intro:
      "Five minutes, anonymous. We read the results as a team and share what we will change.",
    questions: [
      {
        id: "q1",
        kind: "enps",
        prompt: "How likely are you to recommend working here to a friend?",
      },
      {
        id: "q2",
        kind: "scale",
        prompt: "I know what is expected of me in my role.",
      },
      {
        id: "q3",
        kind: "scale",
        prompt: "My manager gives me useful feedback.",
      },
      {
        id: "q4",
        kind: "scale",
        prompt: "I have the tools I need to do my job well.",
      },
      { id: "q5", kind: "text", prompt: "What is one thing we should change?" },
    ],
    audience: { kind: "all", value: "" },
    status: "open",
    createdBy: "fiifi",
    createdOn: "2026-09-08",
    closesOn: "2026-09-30",
  },
]

const mk = (
  i: number,
  dept: string,
  e: number,
  a: number,
  b: number,
  c: number,
  t: string
): SurveyResponse => ({
  id: `sr-${i}`,
  surveyId: "sv-q3",
  department: dept,
  answers: { q1: e, q2: a, q3: b, q4: c, ...(t ? { q5: t } : {}) },
  on: "2026-09-1" + (i % 8),
})

export const SURVEY_RESPONSES: SurveyResponse[] = [
  mk(1, "Engineering", 9, 5, 4, 4, "Fewer meetings on Wednesdays."),
  mk(2, "Engineering", 8, 4, 4, 3, ""),
  mk(3, "Marketing", 10, 5, 5, 4, "Keep the quarterly offsite."),
  mk(4, "Product", 6, 4, 3, 3, "Clearer priorities between teams."),
  mk(5, "Finance", 9, 5, 4, 5, ""),
  mk(6, "Operations", 7, 3, 3, 2, "Better laptops for the Kumasi team."),
  mk(7, "People", 9, 4, 5, 4, ""),
]

export const SURVEY_PARTICIPATION: SurveyParticipation[] = [
  { surveyId: "sv-q3", employeeId: "ama" },
  { surveyId: "sv-q3", employeeId: "selorm" },
  { surveyId: "sv-q3", employeeId: "abena" },
  { surveyId: "sv-q3", employeeId: "kwame" },
  { surveyId: "sv-q3", employeeId: "akwasi" },
  { surveyId: "sv-q3", employeeId: "serwa" },
  { surveyId: "sv-q3", employeeId: "yaw" },
]
