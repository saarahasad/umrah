/* install-prompt.js — "Install app" banner for Android + iOS.
 * Android / Chrome / Edge: native one-tap install via beforeinstallprompt.
 * iPhone / iPad: Safari has no install API, so show Share → Add to Home Screen steps.
 * Hidden once installed; "×" snoozes it for 7 days.
 * Service worker is registered by index.html.
 */
(() => {
  const APP_NAME = "Umrah";
  const SNOOZE_DAYS = 7;
  const KEY = "ip-dismissed-at";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  try {
    const t = +localStorage.getItem(KEY);
    if (t && Date.now() - t < SNOOZE_DAYS * 864e5) return;
  } catch {}

  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
  const isIOSSafari = isIOS && !/crios|fxios|edgios/i.test(ua); // only Safari can add to home screen on older iOS

  const style = document.createElement("style");
  style.textContent = `
  .ip-bar{position:fixed;left:12px;right:12px;z-index:35;
    bottom:calc(var(--tabh,64px) + env(safe-area-inset-bottom,0px) + 12px);
    display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:18px;
    background:var(--surface,#fff);color:var(--ink,#3B2A31);border:1px solid var(--line,#F2DCE3);
    font:500 14px/1.4 var(--body,system-ui,sans-serif);
    box-shadow:0 10px 30px rgba(140,58,85,.18);max-width:520px;margin:0 auto;
    opacity:0;transform:translateY(16px);transition:opacity .3s ease,transform .3s ease}
  .ip-bar.show{opacity:1;transform:none}
  .ip-ico{width:44px;height:44px;border-radius:11px;flex:none}
  .ip-txt{flex:1;min-width:0}
  .ip-txt b{display:block;font-size:15px;font-weight:700;color:var(--rose-ink,#8C3A55)}
  .ip-sub{color:var(--muted,#8B7078);font-size:13px}
  .ip-sub strong{color:var(--ink,#3B2A31);font-weight:600}
  .ip-bar button{border:0;cursor:pointer;font:600 14px var(--body,system-ui,sans-serif)}
  .ip-go{background:var(--rose-ink,#8C3A55);color:#fff;border-radius:999px;padding:9px 16px}
  .ip-x{background:transparent;color:var(--muted,#8B7078);font-size:22px!important;line-height:1;padding:4px 6px}
  .ip-share{display:inline-block;vertical-align:-3px;width:16px;height:16px;color:#007AFF}`;
  document.head.appendChild(style);

  const shareIcon =
    '<svg class="ip-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function bar(html) {
    const el = document.createElement("div");
    el.className = "ip-bar";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `Install ${APP_NAME}`);
    el.innerHTML =
      `<img class="ip-ico" src="icons/icon-192.png" alt="">` +
      html +
      `<button class="ip-x" aria-label="Not now">×</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
    el.querySelector(".ip-x").onclick = () => close(el, true);
    return el;
  }
  function close(el, snooze) {
    if (snooze) try { localStorage.setItem(KEY, Date.now()); } catch {}
    el.classList.remove("show");
    setTimeout(() => el.remove(), 350);
  }

  // Android / Chrome / Edge / desktop
  let deferred;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (document.querySelector(".ip-bar")) return;
    const el = bar(
      `<div class="ip-txt"><b>Install ${APP_NAME}</b><span class="ip-sub">Opens like an app · works offline</span></div>
       <button class="ip-go">Install</button>`
    );
    el.querySelector(".ip-go").onclick = async () => {
      if (!deferred) return;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      close(el, outcome !== "accepted");
    };
  });
  window.addEventListener("appinstalled", () => {
    document.querySelectorAll(".ip-bar").forEach((el) => close(el, false));
  });

  // iPhone / iPad
  if (isIOS) {
    setTimeout(() => {
      bar(
        isIOSSafari
          ? `<div class="ip-txt"><b>Install ${APP_NAME}</b>
             <span class="ip-sub">Tap ${shareIcon} <strong>Share</strong>, then <strong>Add to Home Screen</strong></span></div>`
          : `<div class="ip-txt"><b>Install ${APP_NAME}</b>
             <span class="ip-sub">Open this page in <strong>Safari</strong>, tap ${shareIcon} then <strong>Add to Home Screen</strong></span></div>`
      );
    }, 1500);
  }
})();
