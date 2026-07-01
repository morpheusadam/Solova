"use client";

import { formatMinor } from "~/lib/money";
import { api } from "~/trpc/react";

/** Formats minor units with the workspace currency & locale from Settings. */
export function useMoney() {
  const { data: settings } = api.settings.get.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const currency = settings?.baseCurrency ?? "USD";
  const locale = settings?.locale ?? "en-US";
  return {
    currency,
    locale,
    format: (minor: number | bigint | null | undefined, currencyOverride?: string | null) =>
      formatMinor(minor ?? 0, currencyOverride ?? currency, locale),
  };
}

export function MoneyText({
  minor,
  currency,
  className,
}: {
  minor: number | bigint | null | undefined;
  currency?: string | null;
  className?: string;
}) {
  const money = useMoney();
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {money.format(minor, currency)}
    </span>
  );
}
