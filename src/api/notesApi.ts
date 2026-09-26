import { ApiClientError, apiClient } from './apiClient';

export type ApplicantNote = {
  id: string;
  content: string;
  author: { id: string; name: string };
  teamId: string | null;
  createdAt: number;
  updatedAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseNote(value: unknown): ApplicantNote | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.content !== 'string' ||
    !isRecord(value.author) ||
    typeof value.author.id !== 'string' ||
    typeof value.author.name !== 'string' ||
    !(typeof value.teamId === 'string' || value.teamId === null) ||
    !isFiniteNumber(value.createdAt) ||
    !isFiniteNumber(value.updatedAt)
  ) return null;
  return { id: value.id, content: value.content, author: { id: value.author.id, name: value.author.name }, teamId: value.teamId, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

function parseNotes(value: unknown): readonly ApplicantNote[] | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const notes: ApplicantNote[] = [];
  for (const item of value.items) {
    const note = parseNote(item);
    if (!note) return null;
    notes.push(note);
  }
  return notes;
}

export async function getApplicantNotes(applicantId: string, signal: AbortSignal): Promise<readonly ApplicantNote[]> {
  const payload = await apiClient.requestJson(`/applicants/${encodeURIComponent(applicantId)}/notes`, { signal, authentication: 'required' });
  const notes = parseNotes(payload);
  if (!notes) throw new ApiClientError({ kind: 'invalid-response' });
  return notes;
}

export async function createApplicantNote(applicantId: string, content: string): Promise<void> {
  await apiClient.requestJson(`/applicants/${encodeURIComponent(applicantId)}/notes`, { method: 'POST', jsonBody: { content }, authentication: 'required' });
}

export async function updateApplicantNote(noteId: string, content: string): Promise<void> {
  await apiClient.requestJson(`/applicant-notes/${encodeURIComponent(noteId)}`, { method: 'PATCH', jsonBody: { content }, authentication: 'required' });
}
