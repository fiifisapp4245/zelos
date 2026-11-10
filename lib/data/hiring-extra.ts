import { DEFAULT_OFFER_TEMPLATE } from "../offers"
import type {
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
    prompt: "Which of these HTTP methods are idempotent? Choose all that apply.",
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
    prompt: "In a few sentences, what is the difference between a process and a thread?",
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
    prompt: "Upload a one-page diagram of a system you built or worked on, with a short caption.",
    skill: "System design",
    level: "mid",
    marks: 5,
    guide: "Is it clear? Does it show boundaries, data stores and what talks to what?",
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
        { args: ["A man, a plan, a canal: Panama"], expected: true, hidden: true },
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
      "Write `fizzBuzz(n)` returning an array for 1..n: \"Fizz\" for multiples of 3, \"Buzz\" for 5, \"FizzBuzz\" for both, otherwise the number.",
    skill: "JavaScript",
    level: "junior",
    marks: 8,
    code: {
      language: "javascript",
      fn: "fizzBuzz",
      starter: "function fizzBuzz(n) {\n  // your code here\n}\n",
      tests: [
        { args: [5], expected: [1, 2, "Fizz", 4, "Buzz"], hidden: false },
        { args: [15], expected: [1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"], hidden: true },
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
