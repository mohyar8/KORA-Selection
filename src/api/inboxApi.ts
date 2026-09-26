import { ApiClientError, apiClient } from './apiClient';

export type InboxFolder = 'inbox' | 'sent';
export type InboxUser = { id: string; name: string };
export type InboxMessage = { id: string; sender: InboxUser; recipient: InboxUser; content: string; readAt: number | null; createdAt: number };
export type InboxResponse = { items: readonly InboxMessage[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isFiniteNumber(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function parseUser(value: unknown): InboxUser | null { return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' ? { id: value.id, name: value.name } : null; }
function parseMessage(value: unknown): InboxMessage | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.content !== 'string' || !(value.readAt === null || isFiniteNumber(value.readAt)) || !isFiniteNumber(value.createdAt)) return null;
  const sender = parseUser(value.sender); const recipient = parseUser(value.recipient);
  return sender && recipient ? { id: value.id, sender, recipient, content: value.content, readAt: value.readAt, createdAt: value.createdAt } : null;
}
function parseResponse(value: unknown): InboxResponse | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || !isFiniteNumber(value.pagination.page) || !isFiniteNumber(value.pagination.pageSize) || !isFiniteNumber(value.pagination.total) || !isFiniteNumber(value.pagination.totalPages)) return null;
  const items: InboxMessage[] = [];
  for (const item of value.items) { const message = parseMessage(item); if (!message) return null; items.push(message); }
  return { items, pagination: { page: value.pagination.page, pageSize: value.pagination.pageSize, total: value.pagination.total, totalPages: value.pagination.totalPages } };
}
function path(folder: InboxFolder, page: number, pageSize: number): string { const params = new URLSearchParams({ folder, page: String(page), pageSize: String(pageSize) }); return `/inbox?${params.toString()}`; }

export async function getInbox(folder: InboxFolder, page: number, pageSize: number, signal: AbortSignal): Promise<InboxResponse> { const payload = await apiClient.requestJson(path(folder, page, pageSize), { signal, authentication: 'required' }); const response = parseResponse(payload); if (!response) throw new ApiClientError({ kind: 'invalid-response' }); return response; }
export async function getMessageRecipients(signal: AbortSignal): Promise<readonly InboxUser[]> { const payload = await apiClient.requestJson('/message-recipients', { signal, authentication: 'required' }); if (!isRecord(payload) || !Array.isArray(payload.users)) throw new ApiClientError({ kind: 'invalid-response' }); const users: InboxUser[] = []; for (const item of payload.users) { const user = parseUser(item); if (!user) throw new ApiClientError({ kind: 'invalid-response' }); users.push(user); } return users; }
export async function sendMessage(recipientId: string, content: string): Promise<void> { await apiClient.requestJson('/messages', { method: 'POST', jsonBody: { recipientId, content }, authentication: 'required' }); }
export async function markMessageRead(messageId: string): Promise<void> { await apiClient.requestJson(`/messages/${encodeURIComponent(messageId)}/read`, { method: 'PUT', authentication: 'required' }); }
export async function archiveMessage(messageId: string): Promise<void> { await apiClient.requestJson(`/messages/${encodeURIComponent(messageId)}/archive`, { method: 'PUT', authentication: 'required' }); }
