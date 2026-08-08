import { z } from "zod";
export const signInSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "assistant_commissioner", "commissioner"]),
});
export const leagueSettingsSchema = z.object({
  name: z.string().min(3).max(100),
  timezone: z.literal("America/Chicago"),
  salaryCap: z.coerce.number().positive().max(1_000_000),
});
