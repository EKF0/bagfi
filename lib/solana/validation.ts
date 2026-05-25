import { PublicKey } from '@solana/web3.js';

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

export function isValidSolanaPublicKey(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    return false;
  }

  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function requireSolanaPublicKey(value: unknown, fieldName: string): string {
  if (!isValidSolanaPublicKey(value)) {
    throw new RequestValidationError(`${fieldName} must be a valid Solana public key`);
  }

  return value;
}

export function optionalSolanaPublicKey(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined || value === null || value === '') {
    return value as null | undefined;
  }

  return requireSolanaPublicKey(value, fieldName);
}

export function optionalBoolean(value: unknown, fieldName: string): boolean | null | undefined {
  if (value === undefined || value === null) {
    return value as null | undefined;
  }

  if (typeof value !== 'boolean') {
    throw new RequestValidationError(`${fieldName} must be a boolean`);
  }

  return value;
}

export function requireOneOf<T extends string>(value: unknown, fieldName: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new RequestValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }

  return value as T;
}

export function requireBoundedString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength: number; pattern?: RegExp } 
): string {
  if (typeof value !== 'string') {
    throw new RequestValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  const minLength = options.minLength ?? 1;

  if (trimmed.length < minLength || trimmed.length > options.maxLength) {
    throw new RequestValidationError(`${fieldName} must be between ${minLength} and ${options.maxLength} characters`);
  }

  if (options.pattern && !options.pattern.test(trimmed)) {
    throw new RequestValidationError(`${fieldName} has an invalid format`);
  }

  return trimmed;
}

export function optionalBoundedString(
  value: unknown,
  fieldName: string,
  options: { maxLength: number; pattern?: RegExp }
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return requireBoundedString(value, fieldName, { ...options, minLength: 1 });
}

export function optionalHttpUrl(value: unknown, fieldName: string, maxLength = 2048): string | undefined {
  const text = optionalBoundedString(value, fieldName, { maxLength });
  if (!text) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    throw new RequestValidationError(`${fieldName} must be a valid URL`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new RequestValidationError(`${fieldName} must use http or https`);
  }

  return text;
}

export function optionalNonNegativeIntegerString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new RequestValidationError(`${fieldName} must be a non-negative integer string`);
  }

  return value;
}
