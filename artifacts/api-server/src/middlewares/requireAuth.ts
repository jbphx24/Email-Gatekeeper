import type { Request, Response, NextFunction } from "express";

/**
 * Enforces server-side session authentication by checking the signed session
 * cookie set by POST /api/auth/email. Unauthenticated requests are redirected
 * to the gate page at "/".
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = req.signedCookies["eg_session"] as string | undefined;
  if (!session) {
    res.redirect(302, "/");
    return;
  }
  next();
}
