/**
 * Tiny duration parser for strings like "15m", "30d", "1h", "45s".
 * Falls back to treating the input as milliseconds if it is a plain number.
 */
export default function ms(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(input.trim());
  if (!match) return Number(input) || 0;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || "ms").toLowerCase();
  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}
