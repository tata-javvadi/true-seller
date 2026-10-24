export type IdentifierType = 'phone' | 'upi';

/** Strip spaces/dashes, then drop +91 (13 chars) or 91 (12 chars) for Indian mobiles. */
export function normalizePhone(input: string): string {
  let cleaned = input.trim().replace(/[\s\-().]/g, '');

  if (cleaned.length === 13 && cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }

  return cleaned;
}

export function normalizeUpi(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function detectType(identifier: string): IdentifierType {
  return identifier.includes('@') ? 'upi' : 'phone';
}

export function normalizeIdentifier(input: string, type?: IdentifierType): string {
  const trimmed = input.trim();
  const resolved = type ?? detectType(trimmed);
  return resolved === 'phone' ? normalizePhone(trimmed) : normalizeUpi(trimmed);
}

/** Indian mobile: exactly 10 digits, starting with 6–9. */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * UPI ID: local-part@handle (e.g. name@okaxis, 9876543210@ybl).
 * Local part: letters, digits, ., _, -
 * Handle: starts with a letter, then letters/digits
 */
export function isValidUpiId(upi: string): boolean {
  return /^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/i.test(upi);
}

export type ValidateResult =
  | { ok: true; value: string; type: IdentifierType }
  | { ok: false; error: string };

export function validateIdentifier(input: string, type?: IdentifierType): ValidateResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: type === 'upi' ? 'Please enter a UPI ID.' : 'Please enter a phone number.' };
  }

  const resolved = type ?? detectType(trimmed);
  const value = normalizeIdentifier(trimmed, resolved);

  if (resolved === 'phone') {
    if (!/^\d+$/.test(value)) {
      return {
        ok: false,
        error: 'Enter a valid Indian mobile number (10 digits). You can include +91 or 91.',
      };
    }
    if (!isValidIndianPhone(value)) {
      if (value.length !== 10) {
        return {
          ok: false,
          error: 'Indian mobile numbers must be 10 digits (after removing +91 / 91).',
        };
      }
      return {
        ok: false,
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
      };
    }
    return { ok: true, value, type: 'phone' };
  }

  if (!value.includes('@')) {
    return { ok: false, error: 'UPI ID must look like name@bank (e.g. seller@okaxis).' };
  }
  if (!isValidUpiId(value)) {
    return {
      ok: false,
      error: 'Enter a valid UPI ID (e.g. name@okaxis or 9876543210@ybl).',
    };
  }
  return { ok: true, value, type: 'upi' };
}
