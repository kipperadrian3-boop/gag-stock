/**
 * Grow a Garden (GAG) - Notification Manager
 * Handhabt Windows Desktop-Benachrichtigungen (Web Notification API),
 * Speichert Einstellungen in localStorage (Rot = Aus, Grün = An),
 * und löst Alarm aus, sobald ein beobachtetes Item im Stock verfügbar ist.
 * 
 * Notification-Format laut Vorgabe:
 * Titel: "GAG Stock Notifier"
 * Text:  "[ItemName] in Stock Amount: [Amount]"
 */

class NotifierManager {
  constructor() {
    this.STORAGE_KEY = "gag_stock_notifications_v1";
    this.activeAlerts = this.loadSettings();
    this.alreadyNotifiedKeys = new Set(); // Verhindert Spamming innerhalb desselben Restock-Zyklus
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

  async toggleAlert(itemName) {
    const currentState = this.isAlertEnabled(itemName);
    const newState = !currentState;

    if (newState) {
      // Wenn eingeschaltet wird, Browser-Berechtigung anfordern
      const hasPermission = await this.ensurePermission();
      if (!hasPermission) {
        window.showToast("Bitte erlaube Windows-Benachrichtigungen im Browser!", "danger");
        return false;
      }
      this.activeAlerts[itemName] = true;
      this.playChime(600, 800);
      window.showToast(`Benachrichtigung für "${itemName}" aktiviert (🟢)`, "success");
    } else {
      delete this.activeAlerts[itemName];
      window.showToast(`Benachrichtigung für "${itemName}" deaktiviert (🔴)`, "default");
    }

    this.saveSettings();
    return newState;
  }

  muteAll() {
    this.activeAlerts = {};
    this.saveSettings();
    window.showToast("Alle Benachrichtigungen wurden stummgeschaltet.", "default");
  }

  async ensurePermission() {
    if (!("Notification" in window)) {
      alert("Dieser Browser unterstützt leider keine Desktop-Benachrichtigungen.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }

  /**
   * Sendet eine Windows-Desktop-Benachrichtigung
   */
  sendNotification(itemName, amount, iconUrl = null) {
    // Vorgeschriebenes Format:
    // Titel: GAG Stock Notifier
    // Unten: [itemname] in Stock Amount: [amount]
    const title = "GAG Stock Notifier";
    const body = `${itemName} in Stock Amount: ${amount}`;
    
    // Web Notification erzeugen
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const options = {
          body: body,
          tag: `gag-stock-${itemName}-${Date.now()}`,
          renotify: true
        };
        if (iconUrl) {
          options.icon = iconUrl;
        }
        
        new Notification(title, options);
      } catch (err) {
        console.warn("Desktop-Notification konnte nicht erzeugt werden:", err);
      }
    }

    // Audio Chime & In-App Toast
    this.playStockAlertSound();
    window.showToast(`🔔 ${itemName} in Stock! (Amount: ${amount})`, "success");
  }

  /**
   * Prüft den aktuellen Stock und alarmiert bei Treffern
   */
  checkAndNotify(stockItems, imagesMap = {}) {
    if (!stockItems || typeof stockItems !== "object") return;

    for (const [itemName, amount] of Object.entries(stockItems)) {
      if (amount > 0 && this.isAlertEnabled(itemName)) {
        // Schauen, ob für diesen spezifischen Stand bereits benachrichtigt wurde
        const notifyKey = `${itemName}:${amount}`;
        if (!this.alreadyNotifiedKeys.has(notifyKey)) {
          const imgUrl = imagesMap[itemName] || null;
          this.sendNotification(itemName, amount, imgUrl);
          this.alreadyNotifiedKeys.add(notifyKey);
        }
      }
    }
  }

  /**
   * Zurücksetzen des Anti-Spam Caches bei einem neuen Shop-Zyklus
   */
  resetCycleCache() {
    this.alreadyNotifiedKeys.clear();
  }

  /**
   * Angenehmer Audio-Sound über Web Audio API
   */
  playChime(freq1 = 520, freq2 = 780) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.exponentialRampToValueAtTime(freq2, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      // Ignorieren falls Autoplay blockiert ist
    }
  }

  playStockAlertSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

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
    } catch (e) {
      // Audio blockiert
    }
  }

  /**
   * Test-Alarm zum Ausprobieren der Windows-Notification
   */
  async triggerTestNotification() {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) {
      window.showToast("Bitte erlaube Benachrichtigungen im Browser!", "danger");
      return;
    }
    this.sendNotification("Carrot", 14, "https://i.postimg.cc/sgCqpP6L/image.png");
  }
}

// Global verfügbar
window.notifierManager = new NotifierManager();
