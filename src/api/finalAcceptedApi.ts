import { apiClient, ApiClientError } from './apiClient';

export type FinalAcceptedPreferencePriority = 1 | 2 | 3;

export type FinalAcceptedItem = {
  acceptanceId: string;
  applicantId: string;
  arabicName: string | null;
  studentId: string;
  contact: {
    email: string | null;
    phoneNumber: string | null;
  };
  team: {
    id: string;
    name: string;
  };
  preferencePriority: FinalAcceptedPreferencePriority | null;
  acceptedAt: number;
};

export type FinalAcceptedPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type FinalAcceptedResponse = {
  items: readonly FinalAcceptedItem[];
  pagination: FinalAcceptedPagination;
};

export type FinalAcceptedQuery = {
  search: string;
  page: number;
  pageSize: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isPreferencePriority(
  value: unknown,
): value is FinalAcceptedPreferencePriority {
  return value === 1 || value === 2 || value === 3;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parsePagination(value: unknown): FinalAcceptedPagination | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.page) ||
    !isFiniteNumber(value.pageSize) ||
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

function parseItem(value: unknown): FinalAcceptedItem | null {
  if (
    !isRecord(value) ||
    typeof value.acceptanceId !== 'string' ||
    typeof value.applicantId !== 'string' ||
    !isStringOrNull(value.arabicName) ||
    typeof value.studentId !== 'string' ||
    !isRecord(value.contact) ||
    !isStringOrNull(value.contact.email) ||
    !isStringOrNull(value.contact.phoneNumber) ||
    !isRecord(value.team) ||
    typeof value.team.id !== 'string' ||
    typeof value.team.name !== 'string' ||
    !(value.preferencePriority === null || isPreferencePriority(value.preferencePriority)) ||
    !isFiniteNumber(value.acceptedAt)
  ) {
    return null;
  }

  return {
    acceptanceId: value.acceptanceId,
    applicantId: value.applicantId,
    arabicName: value.arabicName,
    studentId: value.studentId,
    contact: {
      email: value.contact.email,
      phoneNumber: value.contact.phoneNumber,
    },
    team: {
      id: value.team.id,
      name: value.team.name,
    },
    preferencePriority: value.preferencePriority,
    acceptedAt: value.acceptedAt,
  };
}

function parseResponse(value: unknown): FinalAcceptedResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const pagination = parsePagination(value.pagination);

  if (!pagination) {
    return null;
  }

  const items: FinalAcceptedItem[] = [];

  for (const item of value.items) {
    const parsedItem = parseItem(item);

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

function buildPath(query: FinalAcceptedQuery): string {
  const searchParams = new URLSearchParams();

  if (query.search.trim().length > 0) {
    searchParams.set('search', query.search.trim());
  }

  searchParams.set('page', String(query.page));
  searchParams.set('pageSize', String(query.pageSize));

  return `/final-accepted?${searchParams.toString()}`;
}

export async function getFinalAccepted(
  query: FinalAcceptedQuery,
  signal: AbortSignal,
): Promise<FinalAcceptedResponse> {
  const payload = await apiClient.requestJson(buildPath(query), {
    signal,
    authentication: 'required',
  });

  const response = parseResponse(payload);

  if (!response) {
    throw new ApiClientError({
      kind: 'invalid-response',
    });
  }

  return response;
}
