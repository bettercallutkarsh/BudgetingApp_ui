import { HttpErrorResponse } from '@angular/common/http';

export const EMPLOYMENT_TYPES = [
  'SALARIED',
  'STUDENT',
  'UNEMPLOYED',
  'SELF_EMPLOYED',
  'OTHER',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  SALARIED: 'Salaried',
  STUDENT: 'Student',
  UNEMPLOYED: 'Unemployed',
  SELF_EMPLOYED: 'Self-employed',
  OTHER: 'Other',
};

export type AccountStatus = 'ACTIVE' | 'DEACTIVATED';

export interface UserProfile {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  employmentType: EmploymentType;
  accountStatus: AccountStatus;
  createdAtUtc: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  employmentType: EmploymentType;
  password: string;
}

export interface CsrfTokenResponse {
  token: string;
  headerName: string;
  parameterName: string;
}

export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  fieldErrors?: ApiFieldError[] | null;
  traceId?: string;
}

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Check the form and try again.',
  401: 'Authentication failed. Please try again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This request conflicts with existing data.',
  429: 'Too many requests. Please wait a moment and try again.',
};

export function toAuthApiError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new AuthApiError(
        0,
        'NETWORK_ERROR',
        "Can't reach the server. Check your connection and try again.",
      );
    }

    const body = error.error;
    const apiBody: ApiErrorResponse | null =
      body !== null && typeof body === 'object' ? (body as ApiErrorResponse) : null;

    const code = typeof apiBody?.code === 'string' ? apiBody.code : `HTTP_${error.status}`;
    const fieldErrors = Array.isArray(apiBody?.fieldErrors) ? apiBody.fieldErrors : [];
    const serverMessage =
      typeof apiBody?.message === 'string' && apiBody.message.trim().length > 0
        ? apiBody.message
        : (FALLBACK_MESSAGES[error.status] ?? 'Something went wrong. Please try again.');

    return new AuthApiError(error.status, code, serverMessage, fieldErrors);
  }

  return new AuthApiError(0, 'UNKNOWN_ERROR', 'Something went wrong. Please try again.');
}

export function serverErrorMessage(error: unknown): string {
  return toAuthApiError(error).message;
}
