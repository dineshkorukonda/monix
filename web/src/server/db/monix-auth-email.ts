import { verifyAccessToken } from "@/server/auth/jwt";

export async function emailFromBearer(bearerJwt: string): Promise<string> {
  const payload = await verifyAccessToken(bearerJwt);
  return typeof payload.email === "string" ? payload.email : "";
}
