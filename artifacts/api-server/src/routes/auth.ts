import { Router, type IRouter } from "express";
import { db, emailAccessLogTable } from "@workspace/db";
import { SubmitEmailBody, SubmitEmailResponse } from "@workspace/api-zod";
import { sendAccessNotification } from "../lib/notify";

const ALLOWED_DOMAINS = ["lathropgpm.com", "kindredbravely.com"];

const router: IRouter = Router();

router.post("/auth/email", async (req, res): Promise<void> => {
  const parsed = SubmitEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email } = parsed.data;
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    res.status(403).json({
      error: "Access is restricted to authorized email domains.",
    });
    return;
  }

  await db.insert(emailAccessLogTable).values({ email });

  req.log.info({ email }, "Email access logged");

  // Send notification email without blocking the auth response
  sendAccessNotification(email).catch((err) => {
    req.log.error({ err }, "Unhandled error in access notification");
  });

  res.json(SubmitEmailResponse.parse({ success: true }));
});

export default router;
