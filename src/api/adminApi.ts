import { apiClient, ApiClientError } from './apiClient';

export const adminUserRoles = [
  'PROJECT_LEAD',
  'PROJECT_MEMBER',
  'TEAM_LEADER',
  'TEAM_DEPUTY',
  'VIEWER',
] as const;

export type AdminUserRole = (typeof adminUserRoles)[number];

export type AdminTeam = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  role: AdminUserRole;
  teamId: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CreateTeamRequest = {
  name: string;
};

export type UpdateTeamRequest = {
  name?: string;
  isActive?: boolean;
};

export type CreateUserRequest = {
  name: string;
  username: string;
  password: string;
  role: AdminUserRole;
  teamId: string | null;
};

export type UpdateUserRequest = {
  name?: string;
  username?: string;
  role?: AdminUserRole;
  teamId?: string | null;
  isActive?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAdminUserRole(value: unknown): value is AdminUserRole {
  return (
    typeof value === 'string' &&
    adminUserRoles.some((role) => role === value)
  );
}

function isAdminTeam(value: unknown): value is AdminTeam {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    typeof value.isActive === 'boolean' &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt)
  );
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.username) &&
    isAdminUserRole(value.role) &&
    (isString(value.teamId) || value.teamId === null) &&
    typeof value.isActive === 'boolean' &&
    isFiniteNumber(value.createdAt) &&
    isFiniteNumber(value.updatedAt)
  );
}

function invalidResponse(): ApiClientError {
  return new ApiClientError({ kind: 'invalid-response' });
}

function parseTeams(payload: unknown): readonly AdminTeam[] {
  if (!isRecord(payload) || !Array.isArray(payload.teams)) {
    throw invalidResponse();
  }

  if (!payload.teams.every(isAdminTeam)) {
    throw invalidResponse();
  }

  return payload.teams;
}

function parseUsers(payload: unknown): readonly AdminUser[] {
  if (!isRecord(payload) || !Array.isArray(payload.users)) {
    throw invalidResponse();
  }

  if (!payload.users.every(isAdminUser)) {
    throw invalidResponse();
  }

  return payload.users;
}

export async function getAdminTeams(signal?: AbortSignal): Promise<readonly AdminTeam[]> {
  const payload = await apiClient.requestJson('/admin/teams', {
    authentication: 'required',
    signal,
  });

  return parseTeams(payload);
}

export async function createAdminTeam(request: CreateTeamRequest): Promise<void> {
  await apiClient.requestJson('/admin/teams', {
    authentication: 'required',
    method: 'POST',
    jsonBody: request,
  });
}

export async function updateAdminTeam(
  teamId: string,
  request: UpdateTeamRequest,
): Promise<void> {
  await apiClient.requestJson(`/admin/teams/${teamId}`, {
    authentication: 'required',
    method: 'PATCH',
    jsonBody: request,
  });
}

export async function getAdminUsers(signal?: AbortSignal): Promise<readonly AdminUser[]> {
  const payload = await apiClient.requestJson('/admin/users', {
    authentication: 'required',
    signal,
  });

  return parseUsers(payload);
}

export async function createAdminUser(request: CreateUserRequest): Promise<void> {
  await apiClient.requestJson('/admin/users', {
    authentication: 'required',
    method: 'POST',
    jsonBody: request,
  });
}

export async function updateAdminUser(
  userId: string,
  request: UpdateUserRequest,
): Promise<void> {
  await apiClient.requestJson(`/admin/users/${userId}`, {
    authentication: 'required',
    method: 'PATCH',
    jsonBody: request,
  });
}
