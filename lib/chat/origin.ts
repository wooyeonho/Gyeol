export function getAllowedChatOrigin(origin: string | null, requestOrigin: string): string | null {
  if (!origin) return null;
  if (origin === requestOrigin) return origin;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    return new URL(origin).origin === new URL(appUrl).origin ? origin : null;
  } catch {
    return null;
  }
}
