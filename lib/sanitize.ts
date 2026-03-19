/**
 * Sanitize user input — strip HTML tags, control characters, and limit length.
 */
export function sanitizeText(input: string, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")         // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control chars (keep \n, \r, \t)
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize an ID field — alphanumeric, hyphens, underscores only.
 */
export function sanitizeId(input: string, maxLength = 100): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a batch of fields on an object.
 */
export function sanitizeFields<T extends Record<string, any>>(
  obj: T,
  textFields: string[],
  idFields: string[] = []
): T {
  const result = { ...obj };
  for (const field of textFields) {
    if (typeof result[field] === "string") {
      (result as any)[field] = sanitizeText(result[field]);
    }
  }
  for (const field of idFields) {
    if (typeof result[field] === "string") {
      (result as any)[field] = sanitizeId(result[field]);
    }
  }
  return result;
}
