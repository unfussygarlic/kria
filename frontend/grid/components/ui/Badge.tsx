import type { GigStatus, ApplicationStatus, AssignmentStatus } from "@/types";

const GIG_STATUS: Record<GigStatus, { label: string; classes: string }> = {
  draft:       { label: "Draft",       classes: "bg-white/10 text-text-muted" },
  open:        { label: "Open",        classes: "bg-primary/15 text-primary" },
  in_progress: { label: "In Progress", classes: "bg-secondary/15 text-secondary" },
  completed:   { label: "Completed",   classes: "bg-white/10 text-text-sub" },
  cancelled:   { label: "Cancelled",   classes: "bg-error/15 text-error" },
};

const APP_STATUS: Record<ApplicationStatus, { label: string; classes: string }> = {
  pending:   { label: "Pending",   classes: "bg-amber/15 text-amber" },
  accepted:  { label: "Accepted",  classes: "bg-primary/15 text-primary" },
  rejected:  { label: "Rejected",  classes: "bg-error/15 text-error" },
  withdrawn: { label: "Withdrawn", classes: "bg-white/10 text-text-muted" },
};

const ASGN_STATUS: Record<AssignmentStatus, { label: string; classes: string }> = {
  assigned:   { label: "Assigned",  classes: "bg-secondary/15 text-secondary" },
  checked_in: { label: "Checked In", classes: "bg-primary/15 text-primary" },
  completed:  { label: "Completed", classes: "bg-white/10 text-text-sub" },
  no_show:    { label: "No-Show",   classes: "bg-error/15 text-error" },
  left_early: { label: "Left Early","classes": "bg-amber/15 text-amber" },
  disputed:   { label: "Disputed",  classes: "bg-error/15 text-error" },
};

export function GigStatusBadge({ status }: { status: GigStatus }) {
  const { label, classes } = GIG_STATUS[status] ?? GIG_STATUS.draft;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${classes}`}>{label}</span>;
}

export function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, classes } = APP_STATUS[status] ?? APP_STATUS.pending;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${classes}`}>{label}</span>;
}

export function AsgnStatusBadge({ status }: { status: AssignmentStatus }) {
  const { label, classes } = ASGN_STATUS[status] ?? ASGN_STATUS.assigned;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${classes}`}>{label}</span>;
}
