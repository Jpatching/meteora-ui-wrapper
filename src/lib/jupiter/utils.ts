/**
 * Serialize value to string for API query parameters
 */
export function serializeValue(value: unknown): string {
  // String
  if (typeof value === 'string') {
    return value;
  }
  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  // Number
  if (typeof value === 'number') {
    return value.toString();
  }
  // BigInt
  if (typeof value === 'bigint') {
    return value.toString();
  }
  // Date
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Array, join with comma delimiter
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v)).join(',');
  }
  throw new Error(`Cannot serialize value: ${value}`);
}

/**
 * Serialize params to a new object with all values serialized to strings.
 * Used for preparing query parameters for API calls.
 */
export function serializeParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined) // Remove undefined values
      .map(([k, v]) => [k, serializeValue(v)])
  );
}
