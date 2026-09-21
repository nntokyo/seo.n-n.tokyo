export function tokenFromAuthorizationHeader(value?: string): string | undefined {
  if (!value) return undefined;

  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  const token = match?.[1]?.trim();
  return token || undefined;
}

export function tokenFromCookieHeader(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
