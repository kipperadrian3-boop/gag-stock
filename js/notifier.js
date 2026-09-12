/**
 * Grow a Garden (GAG) - Notification Manager
 * Handhabt Windows Desktop-Benachrichtigungen (Web Notification API) & localStorage Persistenz.
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
      console.warn("Fehler beim Laden der Notification-Settings aus localStorage:", e);
      return {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.activeAlerts));
    } catch (e) {
      console.warn("Fehler beim Speichern in localStorage:", e);
    }
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
      // 1. Aktivieren & Speichern
      this.activeAlerts[itemName] = true;
      this.saveSettings();
      this.playChime(650, 900);

      // 2. Berechtigung abfragen
      const permissionGranted = await this.ensurePermission();

      if (!permissionGranted) {
        if ("Notification" in window && Notification.permission === "denied") {
          window.showToast("⚠️ Benachrichtigungen sind im Browser blockiert! Klicke auf das Schloss-Symbol 🔒 neben der Webadresse und erlaube Benachrichtigungen.", "danger");
        } else {
          window.showToast(`Benachrichtigung für "${itemName}" aktiviert (🟢)`, "success");
        }
      } else {
        window.showToast(`Benachrichtigung für "${itemName}" aktiviert (🟢)`, "success");
        
        // Falls das Item bereits vorrätig ist, direkt die Benachrichtigung senden!
        if (currentAmount > 0) {
          this.sendNotification(itemName, currentAmount, iconUrl);
        } else {
          // Bestätigungs-Benachrichtigung senden, damit der Nutzer sieht, dass es klappt!
          this.sendDirectNotice("GAG Stock Notifier", `Alarm für ${itemName} ist aktiv! Du wirst benachrichtigt, sobald es im Stock ist.`, iconUrl);
        }
      }

      return true;
    } else {
      // 3. Deaktivieren & Speichern
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

  async ensurePermission() {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      try {
        const res = await Notification.requestPermission();
        return res === "granted";
      } catch (err) {
        console.warn("requestPermission fehlgeschlagen:", err);
        return false;
      }
    }

    return false;
  }

  /**
   * Sendet eine Windows-Desktop-Benachrichtigung im vorgeschriebenen Format:
   * Titel: GAG Stock Notifier
   * Text:  [ItemName] in Stock Amount: [Amount]
   */
  sendNotification(itemName, amount, iconUrl = null) {
    const title = "GAG Stock Notifier";
    const body = `${itemName} in Stock Amount: ${amount}`;

    this.sendDirectNotice(title, body, iconUrl);
  }

  sendDirectNotice(title, body, iconUrl = null) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const options = {
          body: body,
          tag: `gag-stock-${Date.now()}`,
          renotify: true
        };
        if (iconUrl) {
          options.icon = iconUrl;
        }

        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn("Konnte Desktop-Notification nicht anzeigen:", err);
      }
    }

    // Audio-Feedback & In-App Toast
    this.playStockAlertSound();
    window.showToast(`🔔 ${title}: ${body}`, "success");
  }

  /**
   * Prüft Bestände und alarmiert bei Treffern
   */
  checkAndNotify(stockItems, imagesMap = {}) {
    if (!stockItems || typeof stockItems !== "object") return;

    for (const [itemName, amount] of Object.entries(stockItems)) {
      if (amount > 0 && this.isAlertEnabled(itemName)) {
        const notifyKey = `${itemName}:${amount}`;
        if (!this.alreadyNotifiedKeys.has(notifyKey)) {
          const imgUrl = imagesMap[itemName] || null;
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

  async triggerTestNotification() {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission && "Notification" in window && Notification.permission === "denied") {
      window.showToast("⚠️ Benachrichtigungen im Browser blockiert! Bitte erlaube sie in deinen Browser-Einstellungen für diese Seite.", "danger");
      return;
    }
    this.sendNotification("Carrot", 14, "https://vulcanvalues.com/images/Carrot.png");
  }
}

window.notifierManager = new NotifierManager();
