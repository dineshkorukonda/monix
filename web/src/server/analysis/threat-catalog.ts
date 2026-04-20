import {
  HIGH_RISK_ENDPOINTS,
  MALICIOUS_BOT_SIGNATURES,
} from "@/server/analysis/traffic-reference";

export function threatInfoPayload(): Record<string, unknown> {
  return {
    high_risk_endpoints: [...HIGH_RISK_ENDPOINTS].slice(0, 20),
    malicious_bot_signatures: [...MALICIOUS_BOT_SIGNATURES].slice(0, 20),
    status: "success",
  };
}
