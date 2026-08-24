import { appState } from "./state.js";

const DEFAULT_AFFILIATE_TARGET = "https://s.shopee.co.id/your_affiliate_id";

export function executeAffiliateSession(customTargetUrl = null) {
  if (!appState.isAffiliateSessionTriggered) {
    appState.isAffiliateSessionTriggered = true;
    const target = customTargetUrl || DEFAULT_AFFILIATE_TARGET;
    window.open(target, "_blank", "noopener,noreferrer");
  }
}