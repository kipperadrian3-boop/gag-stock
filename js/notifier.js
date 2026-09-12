/**
 * Grow a Garden (GAG) - Notification Manager
 * 
 * Garantiert funktionierende Benachrichtigungen sowohl im Browser (visuell + Audio)
 * als auch über die native Windows Desktop Notification API (bei HTTPS / GitHub Pages).
 * 
 * Notification-Vorgabe:
 * Titel: "GAG Stock Notifier"
 * Text:  "[ItemName] in Stock Amount: [Amount]"
 */

class NotifierManager {
  constructor() {
    this.STORAGE_KEY = "gag_stock_notifications_v1";
    this.activeAlerts = this.loadSettings();
    this.alreadyNotifiedKeys = new Set();
    this.audioContext = null;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.activeAlerts));
    } catch (e) {}
  }

  isAlertEnabled(itemName) {
    return Boolean(this.activeAlerts[itemName]);
  }

  /**
   * Schaltet Benachrichtigung für ein Item um (Rot 🔴 <-> Grün 🟢)
   * Schaltet den Button IMMER zuverlässig um und speichert im localStorage!
   */
  async toggleAlert(itemName, currentAmount = 0, iconUrl = null) {
    const isCurrentlyActive = this.isAlertEnabled(itemName);
    const newState = !isCurrentlyActive;

    if (newState) {
      // 1. Im Speicher aktivieren
      this.activeAlerts[itemName] = true;
      this.saveSettings();
      this.playChime(650, 900);

      // 2. Windows-Berechtigung anfragen (falls auf HTTPS)
      this.requestBrowserPermission();

      // 3. Wenn bereits im Stock, direkt alarmieren!
      if (currentAmount > 0) {
        this.sendNotification(itemName, currentAmount, iconUrl);
      } else {
        window.showToast(`Benachrichtigung für "${itemName}" aktiviert (🟢)`, "success");
      }

      return true;
    } else {
      // Deaktivieren
      delete this.activeAlerts[itemName];
      this.saveSettings();
      this.playChime(400, 300);
      window.showToast(`Benachrichtigung für "${itemName}" ausgeschaltet (🔴)`, "default");
      return false;
    }
  }

  muteAll() {
    this.activeAlerts = {};
    this.saveSettings();
    window.showToast("Alle Benachrichtigungen wurden ausgeschaltet (🔴).", "default");
  }

  async requestBrowserPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;

    if (Notification.permission !== "denied" && window.location.protocol.startsWith("http")) {
      try {
        const res = await Notification.requestPermission();
        return res === "granted";
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Sendet eine Desktop-Benachrichtigung im vorgeschriebenen Format:
   * Titel: GAG Stock Notifier
   * Text:  [ItemName] in Stock Amount: [Amount]
   */
  sendNotification(itemName, amount, iconUrl = null) {
    const title = "GAG Stock Notifier";
    const body = `${itemName} in Stock Amount: ${amount}`;
    const img = iconUrl || "https://i.postimg.cc/sgCqpP6L/image.png";

    // 1. Audio-Chime abspielen
    this.playStockAlertSound();

    // 2. Authentischen Windows 11 Desktop Notification Banner im Browser anzeigen
    this.showWindowsDesktopBanner(title, itemName, amount, img);

    // 3. Native Windows Desktop Notification triggern (wenn Browser-Berechtigung vorliegt)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: img,
          badge: "https://growagarden.gg/favicon.ico",
          tag: `gag-stock-${itemName}-${Date.now()}`,
          renotify: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn("Native Notification fehlgeschlagen:", err);
      }
    }
  }

  /**
   * Zeigt einen Windows 11 Desktop-Style Notification Banner an
   */
  showWindowsDesktopBanner(title, itemName, amount, iconUrl) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const banner = document.createElement("div");
    banner.className = "win-desktop-alert";
    banner.innerHTML = `
      <div class="win-alert-top">
        <div class="win-alert-app-info">
          <img src="https://growagarden.gg/favicon.ico" class="win-alert-app-icon" alt="GAG" />
          <span class="win-alert-app-name">${title}</span>
        </div>
        <button class="win-alert-close" aria-label="Schließen">&times;</button>
      </div>
      <div class="win-alert-body">
        <img src="${iconUrl}" class="win-alert-item-img" alt="${itemName}" onerror="this.src='https://growagarden.gg/favicon.ico';" />
        <div class="win-alert-content">
          <div class="win-alert-title">${itemName} in Stock</div>
          <div class="win-alert-amount">Amount: ${amount}</div>
        </div>
      </div>
    `;

    // Schließen per Klick
    banner.querySelector(".win-alert-close").addEventListener("click", () => {
      banner.style.opacity = "0";
      banner.style.transform = "translateX(50px)";
      setTimeout(() => banner.remove(), 250);
    });

    container.appendChild(banner);

    // Automatisches Ausblenden nach 6 Sekunden
    setTimeout(() => {
      if (banner.parentElement) {
        banner.style.opacity = "0";
        banner.style.transform = "translateX(50px)";
        setTimeout(() => banner.remove(), 250);
      }
    }, 6000);
  }

  /**
   * Prüft den Stock und alarmiert bei Treffern
   */
  checkAndNotify(stockItems, imagesMap = {}) {
    if (!stockItems || typeof stockItems !== "object") return;

    for (const [itemName, amount] of Object.entries(stockItems)) {
      if (amount > 0 && this.isAlertEnabled(itemName)) {
        const notifyKey = `${itemName}:${amount}`;
        if (!this.alreadyNotifiedKeys.has(notifyKey)) {
          const imgUrl = (window.app && window.app.getItemImage(itemName)) || imagesMap[itemName] || null;
          this.sendNotification(itemName, amount, imgUrl);
          this.alreadyNotifiedKeys.add(notifyKey);
        }
      }
    }
  }

  resetCycleCache() {
    this.alreadyNotifiedKeys.clear();
  }

  playChime(freq1 = 520, freq2 = 780) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") this.audioContext.resume();

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.exponentialRampToValueAtTime(freq2, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }

  playStockAlertSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") this.audioContext.resume();

      const now = this.audioContext.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  /**
   * Führt einen Test-Alert aus - funktioniert IMMER auf jedem Browser und file://!
   */
  async triggerTestNotification() {
    // 1. Wenn auf HTTPS / GitHub Pages, Berechtigung erfragen
    if (window.location.protocol.startsWith("http") && "Notification" in window && Notification.permission !== "granted") {
      await this.requestBrowserPermission();
    }

    // 2. Benachrichtigung sofort auslösen
    this.sendNotification("Carrot", 14, "https://i.postimg.cc/sgCqpP6L/image.png");

    // Hinweis bei lokaler Datei
    if (window.location.protocol === "file:") {
      setTimeout(() => {
        window.showToast("💡 Hinweis: Auf deiner GitHub Pages Website (HTTPS) erscheint diese Meldung zusätzlich als echtes Windows-System-Popup!", "default");
      }, 1500);
    }
  }
}

window.notifierManager = new NotifierManager();
