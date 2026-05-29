/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Premium access management via Memberstack (parent Webflow page)
 *
 * Flow:
 *   1. Iframe loads → starts in PENDING state (skeleton shown, body has .is-loading-premium)
 *   2. Iframe sends 'getAccess' to parent + listens for premium token
 *   3. Parent (Webflow) checks Memberstack and posts { type: PREMIUM_TOKEN } if premium
 *   4. On token reception → PREMIUM (body .is-premium-user)
 *   5. On timeout → FREE (body .is-free-user, sidebar grayed + Upgrade CTA)
 *
 * Local override: ?premium=true / ?premium=false in URL skips the parent handshake.
 */

class PremiumManager {
  constructor() {
    this.isPremium = false;
    this.isResolved = false;
    this.PLANS_URL = "https://www.prehistoricdomain.com/plans";
    this.PREMIUM_TOKEN = "v4j9kjxzwmjsrlnfbq2ndu68z";
    this.TIMEOUT_MS = 5000;
    this.subscribers = [];

    this.init();
  }

  init() {
    // Local override via URL params for dev/testing
    const params = new URLSearchParams(window.location.search);
    const override = params.get("premium");
    if (override === "true") {
      console.log("Premium: forced PREMIUM via URL param");
      this.resolve(true);
      return;
    }
    if (override === "false") {
      console.log("Premium: forced FREE via URL param");
      this.resolve(false);
      return;
    }

    // Start in pending state (skeleton visible, no interactions yet)
    document.body.classList.add("is-loading-premium");

    // Listen for premium token from parent — kept active even after resolution
    // so a late Memberstack response can still promote free → premium.
    window.addEventListener("message", (event) => this.handleMessage(event));

    // Proactively request access (parent may also push without waiting)
    try {
      window.parent.postMessage("getAccess", "*");
      console.log("Premium: access request sent to parent");
    } catch (e) {
      console.log("Premium: not in iframe, defaulting to free");
      this.resolve(false);
      return;
    }

    // Default to free after timeout if no parent response
    this.timeoutId = setTimeout(() => {
      if (!this.isResolved) {
        console.log(`Premium: timeout after ${this.TIMEOUT_MS}ms → FREE`);
        this.resolve(false);
      }
    }, this.TIMEOUT_MS);
  }

  handleMessage(event) {
    if (event.data && event.data.type === this.PREMIUM_TOKEN) {
      console.log("Premium: token received from parent → PREMIUM");
      this.resolve(true);
    }
  }

  resolve(isPremium) {
    // Allow free → premium upgrade after initial resolution (slow Memberstack)
    // but never downgrade from premium → free.
    if (this.isResolved && this.isPremium) return;

    this.isResolved = true;
    this.isPremium = isPremium;
    clearTimeout(this.timeoutId);

    document.body.classList.remove("is-loading-premium");
    if (isPremium) {
      document.body.classList.remove("is-free-user");
      document.body.classList.add("is-premium-user");
    } else {
      document.body.classList.add("is-free-user");
      document.body.classList.remove("is-premium-user");
    }

    this.subscribers.forEach((cb) => cb(isPremium));
    console.log(`Premium: status → ${isPremium ? "PREMIUM" : "FREE"}`);
  }

  onChange(cb) {
    this.subscribers.push(cb);
    if (this.isResolved) cb(this.isPremium);
  }

  /**
   * Gate a premium action. Premium → run callback. Free/pending → redirect to plans.
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
