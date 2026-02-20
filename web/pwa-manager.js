/**
 * CopyPaste.me PWA Manager
 * Handles service worker registration, install prompts, and PWA features
 */

(function () {
  "use strict";

  const PWAManager = {
    deferredPrompt: null,
    isStandalone: false,

    /**
     * Initialize PWA features
     */
    init: function () {
      console.log("[PWA] Initializing...");

      // Check if running as standalone PWA
      this.checkStandaloneMode();

      // Register service worker
      this.registerServiceWorker();

      // Setup install prompt handler
      this.setupInstallPrompt();

      // Setup app update handler
      this.setupUpdateHandler();

      // Log PWA status
      this.logStatus();
    },

    /**
     * Check if app is running in standalone mode
     */
    checkStandaloneMode: function () {
      this.isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");

      if (this.isStandalone) {
        console.log("[PWA] Running in standalone mode");
        document.body.classList.add("pwa-standalone");
      }
    },

    /**
     * Register service worker
     */
    registerServiceWorker: function () {
      if (!("serviceWorker" in navigator)) {
        console.warn("[PWA] Service workers not supported");
        return;
      }

      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js", {
            scope: "/",
          })
          .then((registration) => {
            console.log("[PWA] Service worker registered:", registration.scope);

            // Check for updates periodically
            setInterval(
              () => {
                registration.update();
              },
              60 * 60 * 1000,
            ); // Check every hour

            // Handle updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              console.log("[PWA] Update found, installing...");

              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] New version available");
                  this.notifyUpdate(newWorker);
                }
              });
            });
          })
          .catch((error) => {
            console.error("[PWA] Service worker registration failed:", error);
          });
      });
    },

    /**
     * Setup install prompt handler
     */
    setupInstallPrompt: function () {
      // Capture the install prompt event
      window.addEventListener("beforeinstallprompt", (e) => {
        console.log("[PWA] Install prompt available");
        e.preventDefault();
        this.deferredPrompt = e;

        // Show custom install UI
        this.showInstallButton();
      });

      // Track successful installations
      window.addEventListener("appinstalled", (e) => {
        console.log("[PWA] App installed successfully");
        this.deferredPrompt = null;
        this.hideInstallButton();

        // Optional: Track installation analytics
        if (window.gtag) {
          gtag("event", "pwa_install", {
            event_category: "engagement",
            event_label: "PWA Installation",
          });
        }
      });
    },

    /**
     * Show install button
     */
    showInstallButton: function () {
      // Check if install button container exists
      let installContainer = document.getElementById("pwa-install-container");

      if (!installContainer) {
        // Create install prompt UI
        installContainer = document.createElement("div");
        installContainer.id = "pwa-install-container";
        installContainer.className = "pwa-install-prompt";
        installContainer.innerHTML = `
          <div class="pwa-install-content">
            <div class="pwa-install-icon">
              <img src="/android-chrome-192x192.png" alt="Install CopyPaste" width="48" height="48">
            </div>
            <div class="pwa-install-text">
              <div class="pwa-install-title">Install CopyPaste</div>
              <div class="pwa-install-subtitle">Quick access from your home screen</div>
            </div>
            <div class="pwa-install-actions">
              <button id="pwa-install-btn" class="button">Install</button>
              <button id="pwa-dismiss-btn" class="pwa-dismiss">Later</button>
            </div>
          </div>
        `;

        document.body.appendChild(installContainer);

        // Setup button handlers
        document
          .getElementById("pwa-install-btn")
          .addEventListener("click", () => {
            this.promptInstall();
          });

        document
          .getElementById("pwa-dismiss-btn")
          .addEventListener("click", () => {
            this.hideInstallButton();
          });
      }

      // Show the prompt after a delay (better UX)
      setTimeout(() => {
        installContainer.classList.add("show");
      }, 3000);
    },

    /**
     * Hide install button
     */
    hideInstallButton: function () {
      const installContainer = document.getElementById("pwa-install-container");
      if (installContainer) {
        installContainer.classList.remove("show");
        setTimeout(() => {
          installContainer.remove();
        }, 300);
      }
    },

    /**
     * Prompt user to install PWA
     */
    promptInstall: async function () {
      if (!this.deferredPrompt) {
        console.warn("[PWA] Install prompt not available");
        return;
      }

      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`[PWA] User ${outcome} the install prompt`);

      if (outcome === "accepted") {
        console.log("[PWA] User accepted installation");
      } else {
        console.log("[PWA] User dismissed installation");
      }

      // Clear the deferred prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
    },

    /**
     * Setup update handler
     */
    setupUpdateHandler: function () {
      if (!("serviceWorker" in navigator)) return;

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[PWA] Controller changed, reloading...");
        window.location.reload();
      });
    },

    /**
     * Notify user of available update
     */
    notifyUpdate: function (worker) {
      // Create update notification
      const updateNotification = document.createElement("div");
      updateNotification.className = "pwa-update-notification";
      updateNotification.innerHTML = `
        <div class="pwa-update-content">
          <div class="pwa-update-text">
            <strong>Update Available</strong>
            <span>A new version is ready</span>
          </div>
          <button id="pwa-update-btn" class="button">Update Now</button>
        </div>
      `;

      document.body.appendChild(updateNotification);

      setTimeout(() => {
        updateNotification.classList.add("show");
      }, 100);

      document
        .getElementById("pwa-update-btn")
        .addEventListener("click", () => {
          worker.postMessage({ type: "SKIP_WAITING" });
          updateNotification.remove();
        });
    },

    /**
     * Log PWA status
     */
    logStatus: function () {
      console.log("[PWA] Status:", {
        serviceWorkerSupported: "serviceWorker" in navigator,
        isStandalone: this.isStandalone,
        userAgent: navigator.userAgent,
        displayMode: window.matchMedia("(display-mode: standalone)").matches
          ? "standalone"
          : "browser",
      });
    },

    /**
     * Check if device is online
     */
    checkOnlineStatus: function () {
      const updateOnlineStatus = () => {
        if (navigator.onLine) {
          console.log("[PWA] Online");
          document.body.classList.remove("pwa-offline");
          document.body.classList.add("pwa-online");
        } else {
          console.log("[PWA] Offline");
          document.body.classList.remove("pwa-online");
          document.body.classList.add("pwa-offline");
        }
      };

      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      updateOnlineStatus();
    },
  };

  // Initialize PWA when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      PWAManager.init();
      PWAManager.checkOnlineStatus();
    });
  } else {
    PWAManager.init();
    PWAManager.checkOnlineStatus();
  }

  // Expose to window for debugging
  window.PWAManager = PWAManager;
})();
