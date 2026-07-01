/**
 * Money helpers. Amounts are stored as integer minor units (BIGINT).
 * JS numbers are safe here: 2^53 minor units far exceeds any realistic total.
 */

/** Currencies without minor units (amounts are stored 1:1). */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "IRR", "IRT"]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

/** Convert a BigInt (or number) DB value to a plain number for transport. */
export function asNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

/** Major units (e.g. 12.5 USD) → minor units (1250). */
export function toMinor(major: number, currency: string): number {
  return Math.round(major * minorUnitFactor(currency));
}

/** Minor units → major units. */
export function toMajor(minor: bigint | number, currency: string): number {
  return asNumber(minor) / minorUnitFactor(currency);
}

/** Locale-aware currency formatting from minor units. */
export function formatMinor(
  minor: bigint | number | null | undefined,
  currency: string,
  locale = "en-US",
): string {
  const amount = toMajor(asNumber(minor), currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: minorUnitFactor(currency) === 1 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}
