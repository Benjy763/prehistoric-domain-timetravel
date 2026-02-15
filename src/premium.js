/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Premium access management via Memberstack (parent Webflow page)
 *
 * Local bypass: add ?premium=true to URL to force premium mode
 *               add ?premium=false to force free mode
 */

class PremiumManager {
  constructor() {
    // Premium features disabled — all content is free and accessible
    this.isPremium = true;
    this.isResolved = true;
    this.PLANS_URL = "https://www.prehistoricdomain.com/plans";
    this.TIMEOUT_MS = 3000;

    this.init();
  }

  init() {
    // All features are now accessible to everyone
    console.log("Premium: all features accessible (premium disabled)");
    this.resolve(true);
  }

  requestAccess() {
    try {
      window.parent.postMessage("getAccess", "*");
      console.log("Premium: access request sent to parent");
    } catch (e) {
      console.log("Premium: not in iframe, defaulting to non-premium");
      this.resolve(false);
    }
  }

  handleMessage(event) {
    if (event.data && event.data.type === "premiumAccess") {
      console.log("Premium: access granted by parent");
      this.resolve(true);
    }
  }

  resolve(isPremium) {
    if (this.isResolved) return;
    this.isResolved = true;
    this.isPremium = isPremium;
    clearTimeout(this.timeoutId);

    if (isPremium) {
      document.body.classList.remove("is-free-user");
      document.body.classList.add("is-premium-user");
    } else {
      document.body.classList.add("is-free-user");
      document.body.classList.remove("is-premium-user");
    }

    console.log(`Premium: status → ${isPremium ? "PREMIUM" : "FREE"}`);
  }

  /**
   * Gate a premium action. If premium, execute callback. If not, redirect to plans.
   */
  gate(callback) {
    if (this.isPremium) {
      if (callback) callback();
      return true;
    }
    this.redirectToPlans();
    return false;
  }

  redirectToPlans() {
    console.log("Premium: redirecting to plans page");
    try {
      window.top.location.href = this.PLANS_URL;
    } catch (e) {
      window.open(this.PLANS_URL, "_blank");
    }
  }
}

window.PremiumManager = PremiumManager;
