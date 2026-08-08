import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/domain/league-rules";
import type { AppRole } from "@/domain/types";

const allowed: AppRole[] = [
  "visitor",
  "owner",
  "assistant_commissioner",
  "commissioner",
  "system_administrator",
];
export async function currentRole(): Promise<AppRole> {
  const value = (await cookies()).get("football_dev_role")?.value as
    AppRole | undefined;
  return value && allowed.includes(value) ? value : "visitor";
}
export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
) {
  const role = await currentRole();
  if (!hasPermission(role, permission)) redirect(`/sign-in?reason=permission`);
  return { role, userId: "demo-current-user" };
}
