export function toDurationSeconds(value: number, unit: string) {
  const multipliers: Record<string, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
  };
  return value * (multipliers[unit] ?? 1);
}

export function fromDurationSeconds(seconds: number, unit: string) {
  const divisors: Record<string, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
  };
  return seconds / (divisors[unit] ?? 1);
}
