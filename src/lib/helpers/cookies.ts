const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function setCookie(
  name: string,
  value: string,
  maxAge = ONE_YEAR_IN_SECONDS,
) {
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};samesite=lax`;
}
