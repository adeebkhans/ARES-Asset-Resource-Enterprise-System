const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses short durations like "15m", "7d" used for JWT expiry / token TTLs. */
export function parseDurationMs(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}"`);
  }
  return Number(match[1]) * UNIT_MS[match[2]];
}

export function addDuration(from: Date, duration: string): Date {
  return new Date(from.getTime() + parseDurationMs(duration));
}
