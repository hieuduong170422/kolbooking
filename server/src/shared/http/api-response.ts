import type { Response } from 'express';
import type { ApiErrorDetail } from '../errors/api-error.js';

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ApiSuccessBody<T> {
  readonly success: true;
  readonly data: T;
  readonly error: null;
  readonly meta?: PaginationMeta;
}

export interface ApiErrorBody {
  readonly success: false;
  readonly data: null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ApiErrorDetail[];
  };
}

export const sendOk = <T>(res: Response, data: T, meta?: PaginationMeta): void => {
  const body: ApiSuccessBody<T> = meta
    ? { success: true, data, error: null, meta }
    : { success: true, data, error: null };
  res.status(200).json(body);
};

export const sendCreated = <T>(res: Response, data: T): void => {
  const body: ApiSuccessBody<T> = { success: true, data, error: null };
  res.status(201).json(body);
};

export const buildErrorBody = (
  code: string,
  message: string,
  details?: readonly ApiErrorDetail[],
): ApiErrorBody => ({
  success: false,
  data: null,
  error: details ? { code, message, details } : { code, message },
});

export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});
