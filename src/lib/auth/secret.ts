export const authSecret =
  process.env.NEXTAUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : " pinf-dev-nextauth-secret");
