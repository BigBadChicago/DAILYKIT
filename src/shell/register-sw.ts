/**
 * Layer 5. Service worker registration, called by the hub and by every game
 * page. Constraint 2.6.
 *
 * Production only, so `npm run dev` can never serve a bundle out of a cache the
 * developer forgot about. Registration is deferred to the load event because it
 * kicks off the precache fetches, and those must not compete with the first
 * paint or with the manifest chunk the player is actually waiting for.
 */

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const register = (): void => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* An unsupported or blocked worker costs offline play and nothing else,
         so there is no message to show and nothing to retry. */
    });
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
