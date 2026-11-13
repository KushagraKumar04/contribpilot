import { AppError, AppErrorCode } from '@contribpilot/shared';

export function aiInvalidOutput(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(AppErrorCode.AI_INVALID_OUTPUT, message, details);
}

export function aiUnavailable(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(AppErrorCode.AI_UNAVAILABLE, message, details);
}

export function aiBudgetExceeded(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(AppErrorCode.AI_BUDGET_EXCEEDED, message, details);
}