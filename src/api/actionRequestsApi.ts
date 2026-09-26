import { ApiClientError, apiClient } from './apiClient';
import type { ActionRequestActionType } from '../types/applicants';

export type ActionRequestReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ViewerActionRequestUpdate =
  | {
      actionType: 'PRELIMINARY' | 'REJECTED';
      note: string | null;
      expectedVersion: number | null;
    }
  | {
      actionType: 'FINAL_NOMINATION';
      teamIds: readonly string[];
      note: string | null;
      expectedVersion: number | null;
    };

export type ActionRequestReview = {
  reviewStatus: 'APPROVED' | 'REJECTED';
  expectedVersion: number;
};

export type ActionRequestListQuery = {
  status: ActionRequestReviewStatus | null;
  page: number;
  pageSize: number;
};

export type ActionRequestListItem = {
  id: string;
  applicantId: string;
  requester: {
    id: string;
    name: string;
  };
  actionType: ActionRequestActionType;
  teamIds: readonly string[];
  note: string | null;
  status: ActionRequestReviewStatus;
  version: number;
  baseProjectDecisionVersion: number | null;
  createdAt: number;
  updatedAt: number;
};

export type ActionRequestPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ActionRequestListResponse = {
  items: readonly ActionRequestListItem[];
  pagination: ActionRequestPagination;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isActionType(value: unknown): value is ActionRequestActionType {
  return (
    value === 'PRELIMINARY' ||
    value === 'FINAL_NOMINATION' ||
    value === 'REJECTED'
  );
}

function isReviewStatus(value: unknown): value is ActionRequestReviewStatus {
  return value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
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

function parseListItem(value: unknown): ActionRequestListItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.applicantId !== 'string' ||
    !isRecord(value.requester) ||
    typeof value.requester.id !== 'string' ||
    typeof value.requester.name !== 'string' ||
    !isActionType(value.actionType) ||
    !isNullableString(value.note) ||
    !isReviewStatus(value.status) ||
    !isPositiveInteger(value.version) ||
    !(value.baseProjectDecisionVersion === null ||
      isPositiveInteger(value.baseProjectDecisionVersion)) ||
    !isFiniteNumber(value.createdAt) ||
    !isFiniteNumber(value.updatedAt)
  ) {
    return null;
  }

  const teamIds = parseStringArray(value.teamIds);

  if (!teamIds) {
    return null;
  }

  return {
    id: value.id,
    applicantId: value.applicantId,
    requester: {
      id: value.requester.id,
      name: value.requester.name,
    },
    actionType: value.actionType,
    teamIds,
    note: value.note,
    status: value.status,
    version: value.version,
    baseProjectDecisionVersion: value.baseProjectDecisionVersion,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function parsePagination(value: unknown): ActionRequestPagination | null {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value.page) ||
    !isPositiveInteger(value.pageSize) ||
    !isFiniteNumber(value.total) ||
    !isFiniteNumber(value.totalPages)
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

function parseListResponse(value: unknown): ActionRequestListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const pagination = parsePagination(value.pagination);

  if (!pagination) {
    return null;
  }

  const items: ActionRequestListItem[] = [];

  for (const item of value.items) {
    const parsedItem = parseListItem(item);

    if (!parsedItem) {
      return null;
    }

    items.push(parsedItem);
  }

  return { items, pagination };
}

function buildListPath(query: ActionRequestListQuery): string {
  const searchParams = new URLSearchParams();

  if (query.status !== null) {
    searchParams.set('status', query.status);
  }

  searchParams.set('page', String(query.page));
  searchParams.set('pageSize', String(query.pageSize));

  return `/action-requests?${searchParams.toString()}`;
}

export async function updateViewerActionRequest(
  applicantId: string,
  request: ViewerActionRequestUpdate,
): Promise<void> {
  await apiClient.requestJson(
    `/applicants/${encodeURIComponent(applicantId)}/action-request`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );
}

export async function getActionRequests(
  query: ActionRequestListQuery,
  signal: AbortSignal,
): Promise<ActionRequestListResponse> {
  const payload = await apiClient.requestJson(buildListPath(query), {
    signal,
    authentication: 'required',
  });

  const response = parseListResponse(payload);

  if (!response) {
    throw new ApiClientError({ kind: 'invalid-response' });
  }

  return response;
}

export async function reviewActionRequest(
  requestId: string,
  request: ActionRequestReview,
): Promise<void> {
  await apiClient.requestJson(
    `/action-requests/${encodeURIComponent(requestId)}/review`,
    {
      method: 'PUT',
      jsonBody: request,
      authentication: 'required',
    },
  );
}
