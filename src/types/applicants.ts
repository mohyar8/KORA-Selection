export type ApplicantPriority = 1 | 2 | 3;

export type ProjectDecisionStatus =
  | 'UNREVIEWED'
  | 'PRELIMINARY'
  | 'FINAL_NOMINATION'
  | 'REJECTED';

export type TeamDecisionStatus =
  | 'PENDING'
  | 'PRELIMINARY_ACCEPTED'
  | 'FINAL_ACCEPTED'
  | 'REJECTED';

export type ApplicantPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApplicantPreferenceSummary = {
  teamId: string;
  teamName: string;
  priority: ApplicantPriority;
};

export type ApplicantPreferenceDetail = ApplicantPreferenceSummary & {
  reason: string | null;
};

export type ProjectDecisionSummary = {
  status: ProjectDecisionStatus;
  version: number | null;
};

export type ProjectDecisionDetail = ProjectDecisionSummary & {
  id: string | null;
  note: string | null;
};

export type ActiveTeam = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ProjectDecisionUpdateRequest =
  | {
      status: 'PRELIMINARY' | 'REJECTED';
      note: string | null;
      expectedVersion: number | null;
    }
  | {
      status: 'FINAL_NOMINATION';
      teamIds: readonly string[];
      note: null;
      expectedVersion: number | null;
    };

export type TeamDecision = {
  id: string | null;
  status: TeamDecisionStatus;
  note: string | null;
  version: number | null;
};

export type TeamDecisionUpdateRequest = {
  status: Exclude<TeamDecisionStatus, 'PENDING'>;
  note: string | null;
  expectedVersion: number | null;
};

export type TeamDecisionUpdateResponse = {
  teamDecision: TeamDecision & {
    teamId: string;
  };
};

export type ProjectApplicantListItem = {
  projection: 'project';
  id: string;
  arabicName: string | null;
  studentId: string | null;
  major: string | null;
  academicYear: string | null;
  preferences: readonly ApplicantPreferenceSummary[];
  projectDecision: ProjectDecisionSummary;
};

export type TeamApplicantListItem = {
  projection: 'team';
  id: string;
  arabicName: string | null;
  studentId: string | null;
  major: string | null;
  academicYear: string | null;
  preferences: readonly ApplicantPreferenceSummary[];
  teamDecision: TeamDecision;
};

export type ViewerApplicantListItem = {
  projection: 'viewer';
  id: string;
  arabicName: string | null;
  academic: {
    major: string | null;
    academicYear: string | null;
  };
  preferences: readonly ApplicantPreferenceSummary[];
};

export type ApplicantListItem =
  | ProjectApplicantListItem
  | TeamApplicantListItem
  | ViewerApplicantListItem;

export type ApplicantListResponse = {
  items: readonly ApplicantListItem[];
  pagination: ApplicantPagination;
};

export type ApplicantResponseItem = {
  key: string;
  label: string;
  answer: unknown;
};

export type ApplicantContact = {
  email: string | null;
};

export type ApplicantAcademic = {
  gender: string | null;
  major: string | null;
  academicYear: string | null;
};

export type ApplicantLinks = {
  portfolioUrl: string | null;
  linkedinUrl: string | null;
};

export type ActiveNomination = {
  id: string;
  teamId: string;
  teamName: string;
  version: number | null;
  priority: ApplicantPriority | null;
  teamDecision: TeamDecision;
};

export type ProjectDecisionUpdateResponse = {
  projectDecision: ProjectDecisionDetail;
  activeNominations: readonly ActiveNomination[];
};

export type PendingDeputySuggestion = {
  id: string;
  suggestedStatus: Exclude<TeamDecisionStatus, 'PENDING'>;
  note: string | null;
  version: number | null;
  createdAt: number;
};

export type ActionRequestActionType =
  | 'PRELIMINARY'
  | 'FINAL_NOMINATION'
  | 'REJECTED';

export type PendingActionRequest = {
  id: string;
  actionType: ActionRequestActionType;
  teamIds: readonly string[];
  note: string | null;
  status: 'PENDING';
  version: number;
  baseProjectDecisionVersion: number | null;
};

export type DeputySuggestionUpdateRequest = {
  suggestedStatus: Exclude<TeamDecisionStatus, 'PENDING'>;
  note: string | null;
  expectedVersion: number | null;
};

export type DeputySuggestionUpdateResponse = {
  deputySuggestion: PendingDeputySuggestion;
};

export type DeputySuggestionReviewRequest =
  | {
      reviewStatus: 'APPROVED';
      expectedVersion: number;
      expectedTeamDecisionVersion: number | null;
    }
  | {
      reviewStatus: 'REJECTED';
      expectedVersion: number;
    };

export type ProjectApplicantDetail = {
  projection: 'project';
  id: string;
  arabicName: string | null;
  studentId: string | null;
  contact: ApplicantContact;
  academic: ApplicantAcademic;
  links: ApplicantLinks;
  preferences: readonly ApplicantPreferenceDetail[];
  responses: readonly ApplicantResponseItem[];
  projectDecision: ProjectDecisionDetail;
  activeNominations: readonly ActiveNomination[];
};

export type TeamApplicantDetail = {
  projection: 'team';
  id: string;
  arabicName: string | null;
  studentId: string | null;
  contact: ApplicantContact;
  academic: ApplicantAcademic;
  links: ApplicantLinks;
  preferences: readonly ApplicantPreferenceDetail[];
  responses: readonly ApplicantResponseItem[];
  teamDecision: TeamDecision;
  pendingDeputySuggestion: PendingDeputySuggestion | null;
};

export type ViewerApplicantDetail = {
  projection: 'viewer';
  id: string;
  arabicName: string | null;
  academic: {
    major: string | null;
    academicYear: string | null;
  };
  preferences: readonly ApplicantPreferenceDetail[];
  responses: readonly ApplicantResponseItem[];
  pendingActionRequest: PendingActionRequest | null;
};

export type ApplicantDetail =
  | ProjectApplicantDetail
  | TeamApplicantDetail
  | ViewerApplicantDetail;
