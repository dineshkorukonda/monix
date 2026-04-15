/**
 * Placeholder DTO mapper boundary for transport-layer responses.
 * Keep route handlers mapped through this function so response contracts can be versioned centrally.
 */
export function asJson<T>(payload: T): T {
  return payload;
}
