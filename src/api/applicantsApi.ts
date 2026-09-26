import { apiClient, ApiClientError } from './apiClient';
import type { UserRole } from '../auth/AuthProvider';
import type {
  ActiveTeam,
  ActiveNomination,
  ApplicantAcademic,
  ApplicantContact,
  ApplicantDetail,
  ApplicantListItem,
  ApplicantListResponse,
  ApplicantPagination,
  ApplicantPreferenceDetail,
  ApplicantPreferenceSummary,
  ApplicantPriority,
  ApplicantResponseItem,
  ApplicantLinks,
  ActionRequestActionType,
  DeputySuggestionReviewRequest,
  DeputySuggestionUpdateRequest,
  DeputySuggestionUpdateResponse,
  PendingDeputySuggestion,
  PendingActionRequest,
  ProjectApplicantDetail,
  ProjectApplicantListItem,
  ProjectDecisionDetail,
  ProjectDecisionStatus,
  ProjectDecisionSummary,
  ProjectDecisionUpdateRequest,
  ProjectDecisionUpdateResponse,
  TeamApplicantDetail,
  TeamApplicantListItem,
  TeamDecision,
  TeamDecisionStatus,
  TeamDecisionUpdateRequest,
  TeamDecisionUpdateResponse,
  ViewerApplicantDetail,
  ViewerApplicantListItem,
} from '../types/applicants';
type ApplicantsListQuery = {
  search: string;
  priority: ApplicantPriority | null;
  page: number;
  pageSize: number;
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}
function isNumberOrNull(value: unknown): value is number | null {
  return typeof value === 'number' || value === null;
}
function isPriority(value: unknown): value is ApplicantPriority {
  return value === 1 || value === 2 || value === 3;
}
function isProjectStatus(value: unknown): value is ProjectDecisionStatus {
  return (
    value === 'UNREVIEWED' ||
    value === 'PRELIMINARY' ||
    value === 'FINAL_NOMINATION' ||
    value === 'REJECTED'
  );
}
function isTeamStatus(value: unknown): value is TeamDecisionStatus {
  return (
    value === 'PENDING' ||
    value === 'PRELIMINARY_ACCEPTED' ||
    value === 'FINAL_ACCEPTED' ||
    value === 'REJECTED'
  );
}

function isDeputySuggestedStatus(
  value: unknown,
): value is Exclude<TeamDecisionStatus, 'PENDING'> {
  return (
    value === 'PRELIMINARY_ACCEPTED' ||
    value === 'FINAL_ACCEPTED' ||
    value === 'REJECTED'
  );
}

function isActionRequestActionType(
  value: unknown,
): value is ActionRequestActionType {
  return (
    value === 'PRELIMINARY' ||
    value === 'FINAL_NOMINATION' ||
    value === 'REJECTED'
  );
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}
function isProjectRole(role: UserRole): boolean {
  return role === 'PROJECT_LEAD' || role === 'PROJECT_MEMBER';
}
function isTeamRole(role: UserRole): boolean {
  return role === 'TEAM_LEADER' || role === 'TEAM_DEPUTY';
}
function parsePreferenceSummary(value: unknown): ApplicantPreferenceSummary | null {
  if (
    !isRecord(value) ||
    typeof value.teamId !== 'string' ||
    typeof value.teamName !== 'string' ||
    !isPriority(value.priority)
  ) {
    return null;
  }
  return {
    teamId: value.teamId,
    teamName: value.teamName,
    priority: value.priority,
  };
}
function parsePreferenceDetail(value: unknown): ApplicantPreferenceDetail | null {
  const summary = parsePreferenceSummary(value);
  if (!summary || !isRecord(value) || !isStringOrNull(value.reason)) {
    return null;
  }
  return {
    ...summary,
    reason: value.reason,
  };
}
function parsePreferences<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): readonly T[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsedItems: T[] = [];
  for (const item of value) {
    const parsedItem = parseItem(item);
    if (parsedItem === null) {
      return null;
    }
    parsedItems.push(parsedItem);
  }
  return parsedItems;
}
function parseProjectDecisionSummary(
  value: unknown,
): ProjectDecisionSummary | null {
  if (
    !isRecord(value) ||
    !isProjectStatus(value.status) ||
    !isNumberOrNull(value.version)
  ) {
    return null;
  }
  return {
    status: value.status,
    version: value.version,
  };
}
function parseProjectDecisionDetail(
  value: unknown,
): ProjectDecisionDetail | null {
  const summary = parseProjectDecisionSummary(value);
  if (
    !summary ||
    !isRecord(value) ||
    !isStringOrNull(value.id) ||
    !isStringOrNull(value.note)
  ) {
    return null;
  }
  return {
    ...summary,
    id: value.id,
    note: value.note,
  };
}
function parseTeamDecision(value: unknown): TeamDecision | null {
  if (
    !isRecord(value) ||
    !isStringOrNull(value.id) ||
    !isTeamStatus(value.status) ||
    !isStringOrNull(value.note) ||
    !isNumberOrNull(value.version)
  ) {
    return null;
  }
  return {
    id: value.id,
    status: value.status,
    note: value.note,
    version: value.version,
  };
}
function parsePagination(value: unknown): ApplicantPagination | null {
  if (
    !isRecord(value) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.total !== 'number' ||
    typeof value.totalPages !== 'number'
  ) {
    return null;
  }
  return {
    page: value.page,
    pageSize: value.pageSize,
    total: value.total,
    totalPages: value.totalPages,
  };
}
function parseListItem(
  value: unknown,
  role: UserRole,
): ApplicantListItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStringOrNull(value.arabicName)
  ) {
    return null;
  }
  const preferences = parsePreferences(value.preferences, parsePreferenceSummary);
  if (!preferences) {
    return null;
  }
  if (isProjectRole(role)) {
    const projectDecision = parseProjectDecisionSummary(value.projectDecision);
    if (
      !projectDecision ||
      !isStringOrNull(value.studentId) ||
      !isStringOrNull(value.major) ||
      !isStringOrNull(value.academicYear)
    ) {
      return null;
    }
    const item: ProjectApplicantListItem = {
      projection: 'project',
      id: value.id,
      arabicName: value.arabicName,
      studentId: value.studentId,
      major: value.major,
      academicYear: value.academicYear,
      preferences,
      projectDecision,
    };
    return item;
  }
  if (isTeamRole(role)) {
    const teamDecision = parseTeamDecision(value.teamDecision);
    if (
      !teamDecision ||
      !isStringOrNull(value.studentId) ||
      !isStringOrNull(value.major) ||
      !isStringOrNull(value.academicYear)
    ) {
      return null;
    }
    const item: TeamApplicantListItem = {
      projection: 'team',
      id: value.id,
      arabicName: value.arabicName,
      studentId: value.studentId,
      major: value.major,
      academicYear: value.academicYear,
      preferences,
      teamDecision,
    };
    return item;
  }
  if (!isRecord(value.academic)) {
    return null;
  }
  if (
    !isStringOrNull(value.academic.major) ||
    !isStringOrNull(value.academic.academicYear)
  ) {
    return null;
  }
  const item: ViewerApplicantListItem = {
    projection: 'viewer',
    id: value.id,
    arabicName: value.arabicName,
    academic: {
      major: value.academic.major,
      academicYear: value.academic.academicYear,
    },
    preferences,
  };
  return item;
}
function parseListResponse(
  value: unknown,
  role: UserRole,
): ApplicantListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }
  const pagination = parsePagination(value.pagination);
  if (!pagination) {
    return null;
  }
  const items: ApplicantListItem[] = [];
  for (const item of value.items) {
    const parsedItem = parseListItem(item, role);
    if (!parsedItem) {
      return null;
    }
    items.push(parsedItem);
  }
  return {
    items,
    pagination,
  };
}
function parseContact(value: unknown): ApplicantContact | null {
  if (!isRecord(value) || !isStringOrNull(value.email)) {
    return null;
  }
  return { email: value.email };
}
function parseAcademic(value: unknown): ApplicantAcademic | null {
  if (
    !isRecord(value) ||
    !isStringOrNull(value.gender) ||
    !isStringOrNull(value.major) ||
    !isStringOrNull(value.academicYear)
  ) {
    return null;
  }
  return {
    gender: value.gender,
    major: value.major,
    academicYear: value.academicYear,
  };
}
function parseLinks(value: unknown): ApplicantLinks | null {
  if (
    !isRecord(value) ||
    !isStringOrNull(value.portfolioUrl) ||
    !isStringOrNull(value.linkedinUrl)
  ) {
    return null;
  }
  return {
    portfolioUrl: value.portfolioUrl,
    linkedinUrl: value.linkedinUrl,
  };
}
function parseResponses(value: unknown): readonly ApplicantResponseItem[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const responses: ApplicantResponseItem[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.key !== 'string' ||
      typeof item.label !== 'string' ||
      !('answer' in item)
    ) {
      return null;
    }
    responses.push({
      key: item.key,
      label: item.label,
      answer: item.answer,
    });
  }
  return responses;
}
function parseNominations(value: unknown): readonly ActiveNomination[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const nominations: ActiveNomination[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.teamId !== 'string' ||
      typeof item.teamName !== 'string' ||
      !isNumberOrNull(item.version) ||
      !(item.priority === null || isPriority(item.priority))
    ) {
      return null;
    }
    const teamDecision = parseTeamDecision(item.teamDecision);
    if (!teamDecision) {
      return null;
    }
    nominations.push({
      id: item.id,
      teamId: item.teamId,
      teamName: item.teamName,
      version: item.version,
      priority: item.priority,
      teamDecision,
    });
  }
  return nominations;
}

function parseProjectDecisionUpdateResponse(
  value: unknown,
): ProjectDecisionUpdateResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const projectDecision = parseProjectDecisionDetail(value.projectDecision);
  const activeNominations = parseNominations(value.activeNominations);

  if (!projectDecision || !activeNominations) {
    return null;
  }

  return {
    projectDecision,
    activeNominations,
  };
}

function parseTeamDecisionUpdateResponse(
  value: unknown,
): TeamDecisionUpdateResponse | null {
  if (!isRecord(value) || !isRecord(value.teamDecision)) {
    return null;
  }

  const teamDecision = parseTeamDecision(value.teamDecision);

  if (!teamDecision || typeof value.teamDecision.teamId !== 'string') {
    return null;
  }

  return {
    teamDecision: {
      ...teamDecision,
      teamId: value.teamDecision.teamId,
    },
  };
}

function parseActiveTeams(value: unknown): readonly ActiveTeam[] | null {
  if (!isRecord(value) || !Array.isArray(value.teams)) {
    return null;
  }

  const teams: ActiveTeam[] = [];

  for (const item of value.teams) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      item.isActive !== true
    ) {
      return null;
    }

    teams.push({
      id: item.id,
      name: item.name,
      isActive: item.isActive,
    });
  }

  return teams;
}
function parseDeputySuggestion(value: unknown): PendingDeputySuggestion | null | undefined {
  if (value === null) {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isDeputySuggestedStatus(value.suggestedStatus) ||
    !isStringOrNull(value.note) ||
    !isNumberOrNull(value.version) ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt)
  ) {
    return undefined;
  }
  return {
    id: value.id,
    suggestedStatus: value.suggestedStatus,
    note: value.note,
    version: value.version,
    createdAt: value.createdAt,
  };
}

function parseDeputySuggestionUpdateResponse(
  value: unknown,
): DeputySuggestionUpdateResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const deputySuggestion = parseDeputySuggestion(value.deputySuggestion);

  if (!deputySuggestion) {
    return null;
  }

  return {
    deputySuggestion,
  };
}

function parseStringArray(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }

    items.push(item);
  }

  return items;
}

function parsePendingActionRequest(
  value: unknown,
): PendingActionRequest | null | undefined {
  if (value === null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isActionRequestActionType(value.actionType) ||
    !isStringOrNull(value.note) ||
    value.status !== 'PENDING' ||
    !isPositiveInteger(value.version) ||
    !(value.baseProjectDecisionVersion === null ||
      isPositiveInteger(value.baseProjectDecisionVersion))
  ) {
    return undefined;
  }

  const teamIds = parseStringArray(value.teamIds);

  if (!teamIds) {
    return undefined;
  }

  return {
    id: value.id,
    actionType: value.actionType,
    teamIds,
    note: value.note,
    status: value.status,
    version: value.version,
    baseProjectDecisionVersion: value.baseProjectDecisionVersion,
  };
}

function parseDetail(value: unknown, role: UserRole): ApplicantDetail | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isStringOrNull(value.arabicName)
  ) {
    return null;
  }
  const preferences = parsePreferences(value.preferences, parsePreferenceDetail);
  const responses = parseResponses(value.responses);
  if (!preferences || !responses) {
    return null;
  }
  if (isProjectRole(role)) {
    const contact = parseContact(value.contact);
    const academic = parseAcademic(value.academic);
    const links = parseLinks(value.links);
    const projectDecision = parseProjectDecisionDetail(value.projectDecision);
    const activeNominations = parseNominations(value.activeNominations);
    if (
      !contact ||
      !academic ||
      !links ||
      !projectDecision ||
      !activeNominations ||
      !isStringOrNull(value.studentId)
    ) {
      return null;
    }
    const detail: ProjectApplicantDetail = {
      projection: 'project',
      id: value.id,
      arabicName: value.arabicName,
      studentId: value.studentId,
      contact,
      academic,
      links,
      preferences,
      responses,
      projectDecision,
      activeNominations,
    };
    return detail;
  }
  if (isTeamRole(role)) {
    const contact = parseContact(value.contact);
    const academic = parseAcademic(value.academic);
    const links = parseLinks(value.links);
    const teamDecision = parseTeamDecision(value.teamDecision);
    const pendingDeputySuggestion = parseDeputySuggestion(
      value.pendingDeputySuggestion,
    );
    if (
      !contact ||
      !academic ||
      !links ||
      !teamDecision ||
      pendingDeputySuggestion === undefined ||
      !isStringOrNull(value.studentId)
    ) {
      return null;
    }
    const detail: TeamApplicantDetail = {
      projection: 'team',
      id: value.id,
      arabicName: value.arabicName,
      studentId: value.studentId,
      contact,
      academic,
      links,
      preferences,
      responses,
      teamDecision,
      pendingDeputySuggestion,
    };
    return detail;
  }
  if (
    !isRecord(value.academic) ||
    !isStringOrNull(value.academic.major) ||
    !isStringOrNull(value.academic.academicYear)
  ) {
    return null;
  }
  const pendingActionRequest = parsePendingActionRequest(
    value.pendingActionRequest,
  );

  if (pendingActionRequest === undefined) {
    return null;
  }

  const detail: ViewerApplicantDetail = {
    projection: 'viewer',
    id: value.id,
    arabicName: value.arabicName,
    academic: {
      major: value.academic.major,
      academicYear: value.academic.academicYear,
    },
    preferences,
    responses,
    pendingActionRequest,
  };
  return detail;
}
function buildListPath(role: UserRole, query: ApplicantsListQuery): string {
  const searchParams = new URLSearchParams();
  if (query.search.trim().length > 0) {
    searchParams.set('search', query.search.trim());
  }
  if (query.priority !== null && role !== 'VIEWER') {
    searchParams.set('priority', String(query.priority));
  }
  searchParams.set('page', String(query.page));
  searchParams.set('pageSize', String(query.pageSize));
  return `/applicants?${searchParams.toString()}`;
}
export async function getApplicants(
  role: UserRole,
  query: ApplicantsListQuery,
  signal: AbortSignal,
): Promise<ApplicantListResponse> {
  const payload = await apiClient.requestJson(buildListPath(role, query), {
    signal,
    authentication: 'required',
  });
  const response = parseListResponse(payload, role);
  if (!response) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }
  return response;
}
export async function getApplicantDetails(
  role: UserRole,
  applicantId: string,
  signal: AbortSignal,
): Promise<ApplicantDetail> {
  const payload = await apiClient.requestJson(
    `/applicants/${encodeURIComponent(applicantId)}`,
    {
      signal,
      authentication: 'required',
    },
  );
  const detail = parseDetail(payload, role);
  if (!detail) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }
  return detail;
}

export async function getActiveTeams(
  signal: AbortSignal,
): Promise<readonly ActiveTeam[]> {
  const payload = await apiClient.requestJson('/teams', {
    signal,
    authentication: 'required',
  });

  const teams = parseActiveTeams(payload);

  if (!teams) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }

  return teams;
}

export async function updateProjectDecision(
  applicantId: string,
  request: ProjectDecisionUpdateRequest,
): Promise<ProjectDecisionUpdateResponse> {
  const payload = await apiClient.requestJson(
    `/applicants/${encodeURIComponent(applicantId)}/project-decision`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );

  const response = parseProjectDecisionUpdateResponse(payload);

  if (!response) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }

  return response;
}

export async function updateTeamDecision(
  applicantId: string,
  request: TeamDecisionUpdateRequest,
): Promise<TeamDecisionUpdateResponse> {
  const payload = await apiClient.requestJson(
    `/applicants/${encodeURIComponent(applicantId)}/team-decision`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );

  const response = parseTeamDecisionUpdateResponse(payload);

  if (!response) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }

  return response;
}

export async function updateDeputySuggestion(
  applicantId: string,
  request: DeputySuggestionUpdateRequest,
): Promise<DeputySuggestionUpdateResponse> {
  const payload = await apiClient.requestJson(
    `/applicants/${encodeURIComponent(applicantId)}/deputy-suggestion`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );

  const response = parseDeputySuggestionUpdateResponse(payload);

  if (!response) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }

  return response;
}

export async function reviewDeputySuggestion(
  suggestionId: string,
  request: DeputySuggestionReviewRequest,
): Promise<void> {
  await apiClient.requestJson(
    `/deputy-suggestions/${encodeURIComponent(suggestionId)}/review`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );
}
