import { apiClient, ApiClientError } from './apiClient';

export type ImportPreviewStatus =
  | 'NEW'
  | 'EXISTING'
  | 'DUPLICATE_IN_FILE'
  | 'INVALID';

export type ImportPreviewRow = {
  recordNumber: number;
  status: ImportPreviewStatus;
  studentId: string | null;
  errors: readonly string[];
};

export type ImportPreview = {
  batchId: string;
  status: 'VALIDATED';
  summary: {
    totalRows: number;
    newRows: number;
    existingRows: number;
    duplicateRows: number;
    invalidRows: number;
  };
  rows: readonly ImportPreviewRow[];
  rowsTruncated: boolean;
};

export type ImportConfirmation = {
  batchId: string;
  status: 'IMPORTED';
  summary: {
    importedRows: number;
    skippedRows: number;
    invalidRows: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isPreviewStatus(value: unknown): value is ImportPreviewStatus {
  return (
    value === 'NEW' ||
    value === 'EXISTING' ||
    value === 'DUPLICATE_IN_FILE' ||
    value === 'INVALID'
  );
}

function invalidResponse(): ApiClientError {
  return new ApiClientError({ kind: 'invalid-response' });
}

function isPreviewRow(value: unknown): value is ImportPreviewRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.recordNumber) &&
    isPreviewStatus(value.status) &&
    (typeof value.studentId === 'string' || value.studentId === null) &&
    Array.isArray(value.errors) &&
    value.errors.every((error) => typeof error === 'string')
  );
}

function parsePreview(payload: unknown): ImportPreview {
  if (!isRecord(payload) || !isRecord(payload.summary)) {
    throw invalidResponse();
  }

  const { summary } = payload;

  if (
    typeof payload.batchId !== 'string' ||
    payload.status !== 'VALIDATED' ||
    !Array.isArray(payload.rows) ||
    !payload.rows.every(isPreviewRow) ||
    typeof payload.rowsTruncated !== 'boolean' ||
    !isNonNegativeInteger(summary.totalRows) ||
    !isNonNegativeInteger(summary.newRows) ||
    !isNonNegativeInteger(summary.existingRows) ||
    !isNonNegativeInteger(summary.duplicateRows) ||
    !isNonNegativeInteger(summary.invalidRows)
  ) {
    throw invalidResponse();
  }

  return {
    batchId: payload.batchId,
    status: payload.status,
    summary: {
      totalRows: summary.totalRows,
      newRows: summary.newRows,
      existingRows: summary.existingRows,
      duplicateRows: summary.duplicateRows,
      invalidRows: summary.invalidRows,
    },
    rows: payload.rows,
    rowsTruncated: payload.rowsTruncated,
  };
}

function parseConfirmation(payload: unknown): ImportConfirmation {
  if (!isRecord(payload) || !isRecord(payload.summary)) {
    throw invalidResponse();
  }

  const { summary } = payload;

  if (
    typeof payload.batchId !== 'string' ||
    payload.status !== 'IMPORTED' ||
    !isNonNegativeInteger(summary.importedRows) ||
    !isNonNegativeInteger(summary.skippedRows) ||
    !isNonNegativeInteger(summary.invalidRows)
  ) {
    throw invalidResponse();
  }

  return {
    batchId: payload.batchId,
    status: payload.status,
    summary: {
      importedRows: summary.importedRows,
      skippedRows: summary.skippedRows,
      invalidRows: summary.invalidRows,
    },
  };
}

export async function previewApplicantImport(
  file: File,
  signal?: AbortSignal,
): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);

  const payload = await apiClient.requestJson('/imports/preview', {
    authentication: 'required',
    formData,
    method: 'POST',
    signal,
  });

  return parsePreview(payload);
}

export async function confirmApplicantImport(
  batchId: string,
): Promise<ImportConfirmation> {
  const payload = await apiClient.requestJson(`/imports/${batchId}/confirm`, {
    authentication: 'required',
    method: 'POST',
  });

  return parseConfirmation(payload);
}
