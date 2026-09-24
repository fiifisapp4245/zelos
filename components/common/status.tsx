"use client"

import { Pill, type Tone } from "./index"
import {
  ATTENDANCE_LABEL,
  CASE_STATE_LABEL,
  DOC_STATUS_LABEL,
  LIFECYCLE_LABEL,
  REQUEST_STATUS_LABEL,
  REQ_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  STAGE_LABEL,
} from "@/lib/format"
import type {
  AttendanceStatus,
  CandidateStage,
  CaseState,
  DocumentStatus,
  LifecycleState,
  RequestStatus,
  RequisitionStatus,
  ReviewStatus,
} from "@/lib/types"

const LIFECYCLE_TONE: Record<LifecycleState, Tone> = {
  pre_hire: "info",
  probation: "warning",
  active: "success",
  on_leave: "info",
  suspended: "danger",
  notice: "warning",
  resigned: "neutral",
  terminated: "danger",
  retired: "neutral",
}

export function LifecycleBadge({ state }: { state: LifecycleState }) {
  return (
    <Pill tone={LIFECYCLE_TONE[state]} dot>
      {LIFECYCLE_LABEL[state]}
    </Pill>
  )
}

const REQUEST_TONE: Record<RequestStatus, Tone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
}

export function RequestBadge({ status }: { status: RequestStatus }) {
  return <Pill tone={REQUEST_TONE[status]}>{REQUEST_STATUS_LABEL[status]}</Pill>
}

const DOC_TONE: Record<DocumentStatus, Tone> = {
  verified: "success",
  pending: "info",
  expiring: "warning",
  expired: "danger",
  missing: "danger",
}

export function DocumentBadge({ status }: { status: DocumentStatus }) {
  return <Pill tone={DOC_TONE[status]}>{DOC_STATUS_LABEL[status]}</Pill>
}

const ATTENDANCE_TONE: Record<AttendanceStatus, Tone> = {
  present: "success",
  remote: "info",
  late: "warning",
  no_record: "danger",
  on_leave: "info",
  holiday: "neutral",
  weekend: "neutral",
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Pill tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_LABEL[status]}</Pill>
}

const STAGE_TONE: Record<CandidateStage, Tone> = {
  applied: "neutral",
  screening: "info",
  interview: "info",
  assessment: "warning",
  offer: "success",
  hired: "success",
  rejected: "danger",
}

export function StageBadge({ stage }: { stage: CandidateStage }) {
  return <Pill tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Pill>
}

const REQ_TONE: Record<RequisitionStatus, Tone> = {
  draft: "neutral",
  open: "success",
  on_hold: "warning",
  filled: "info",
  closed: "neutral",
}

export function RequisitionBadge({ status }: { status: RequisitionStatus }) {
  return <Pill tone={REQ_TONE[status]}>{REQ_STATUS_LABEL[status]}</Pill>
}

const REVIEW_TONE: Record<ReviewStatus, Tone> = {
  not_started: "neutral",
  self_review: "info",
  manager_review: "warning",
  calibration: "warning",
  shared: "info",
  complete: "success",
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return <Pill tone={REVIEW_TONE[status]}>{REVIEW_STATUS_LABEL[status]}</Pill>
}

const CASE_TONE: Record<CaseState, Tone> = {
  open: "warning",
  investigation: "warning",
  hearing: "danger",
  finalised: "neutral",
  dismissed: "neutral",
}

export function CaseBadge({ state }: { state: CaseState }) {
  return <Pill tone={CASE_TONE[state]}>{CASE_STATE_LABEL[state]}</Pill>
}
