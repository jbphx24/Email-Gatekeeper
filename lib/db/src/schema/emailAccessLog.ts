import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailAccessLogTable = pgTable("email_access_log", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailAccessLogSchema = createInsertSchema(emailAccessLogTable).omit({ id: true, accessedAt: true });
export type InsertEmailAccessLog = z.infer<typeof insertEmailAccessLogSchema>;
export type EmailAccessLog = typeof emailAccessLogTable.$inferSelect;
