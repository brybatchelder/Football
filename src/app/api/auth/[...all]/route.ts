import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/auth/better-auth";
import { handleAuthRequestSafely } from "@/auth/safe-handler";
import { assertProductionConfig } from "@/config/production";

async function handler(request: Request) {
  return handleAuthRequestSafely(async () => {
    assertProductionConfig();
    return await getAuth().handler(request);
  });
}

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
