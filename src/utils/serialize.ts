/**
 * Recursively converts Mongoose documents / plain objects into API-safe JSON:
 * - Replaces `_id` with `id` (stringified)
 * - Strips `__v`
 * - Recurses into nested objects, arrays, and populated sub-documents
 * - Converts Dates to ISO 8601 strings
 */
export function serialize<T = unknown>(input: unknown): T {
  if (input === null || input === undefined) return input as T;

  if (Array.isArray(input)) {
    return input.map((item) => serialize(item)) as unknown as T;
  }

  if (input instanceof Date) {
    return input.toISOString() as unknown as T;
  }

  if (typeof input === "object") {
    // Mongoose document -> plain object
    const anyInput = input as any;
    const plain =
      typeof anyInput.toObject === "function" ? anyInput.toObject({ virtuals: false }) : anyInput;

    if (plain && plain._bsontype === "ObjectID") {
      return plain.toString() as unknown as T;
    }

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(plain)) {
      if (key === "__v") continue;
      if (key === "passwordHash") continue;
      if (key === "_id") {
        out.id = plain._id?.toString?.() ?? plain._id;
        continue;
      }
      const value = plain[key];
      if (value && typeof value === "object" && value._bsontype === "ObjectID") {
        out[key] = value.toString();
      } else {
        out[key] = serialize(value);
      }
    }
    return out as unknown as T;
  }

  return input as T;
}
