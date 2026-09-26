export type ApiErrorKind = 'http' | 'network' | 'invalid-response';

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor({
    kind,
    status = null,
    code = null,
  }: {
    kind: ApiErrorKind;
    status?: number | null;
    code?: string | null;
  }) {
    super('فشل طلب إلى واجهة النظام.');
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

type ApiRequestAuthentication = 'none' | 'required';

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  jsonBody?: unknown;
  signal?: AbortSignal;
  authentication?: ApiRequestAuthentication;
};

type ApiClientConfig = {
  basePath?: string;
};

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getBackendErrorCode(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.error !== 'string') {
    return null;
  }

  return payload.error;
}

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();

  if (trimmedBasePath.length === 0) {
    return '/api';
  }

  return trimmedBasePath.endsWith('/')
    ? trimmedBasePath.slice(0, -1)
    : trimmedBasePath;
}

function buildUrl(basePath: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${basePath}${normalizedPath}`;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (responseText.trim().length === 0) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(responseText);
    return parsedValue;
  } catch {
    return null;
  }
}

function createApiClient({ basePath = '/api' }: ApiClientConfig = {}) {
  const normalizedBasePath = normalizeBasePath(basePath);

  const requestJson = async (
    path: string,
    {
      method = 'GET',
      jsonBody,
      signal,
      authentication = 'none',
    }: ApiRequestOptions = {},
  ): Promise<unknown> => {
    let response: Response;

    try {
      response = await fetch(buildUrl(normalizedBasePath, path), {
        method,
        credentials: 'include',
        signal,
        headers:
          jsonBody === undefined
            ? undefined
            : {
                'Content-Type': 'application/json',
              },
        body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
      });
    } catch {
      throw new ApiClientError({
        kind: 'network',
      });
    }

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      if (response.status === 401 && authentication === 'required') {
        unauthorizedHandler?.();
      }

      throw new ApiClientError({
        kind: 'http',
        status: response.status,
        code: getBackendErrorCode(payload),
      });
    }

    return payload;
  };

  return {
    requestJson,
  };
}

export const apiClient = createApiClient();