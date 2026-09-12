/**
 * Grow a Garden (GAG) - Main Application Controller
 * Verbindet API, Master Catalog, UI Rendering, Timers und Notifier.
 */

// Toast Feedback Helper
window.showToast = function(message, type = "default") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "danger" ? "toast-danger" : ""}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

class AppController {
  constructor() {
    this.currentTab = "seeds";
    this.searchQuery = "";
    this.filterMode = "all"; // 'all', 'instock', 'notif_active'
    
    // Live Daten
    this.apiData = null;
    this.stockMap = {
      seeds: {},
      gear: {},
      cosmetics: {}
    };
    this.imagesMap = {};
    
    // Restock Timers (in ms)
    this.timerEnds = {
      seeds: 0,
      gears: 0,
      cosmetics: 0
    };
    this.timerDurations = {
      seeds: 5 * 60 * 1000,
      gears: 5 * 60 * 1000,
      cosmetics: 60 * 60 * 1000
    };

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.itemsGrid = document.getElementById("items-grid");
    this.loadingSpinner = document.getElementById("loading-spinner");
    this.emptyState = document.getElementById("empty-state");
    this.searchInput = document.getElementById("search-input");
    this.searchClear = document.getElementById("search-clear");
    this.stockFilter = document.getElementById("stock-filter");
    this.tabButtons = document.querySelectorAll(".tab-btn");
    this.testNotifBtn = document.getElementById("test-notification-btn");
    this.muteAllBtn = document.getElementById("mute-all-btn");
    this.lastUpdatedText = document.getElementById("last-updated-text");
    this.categoryInfoText = document.getElementById("category-info-text");
    this.apiStatusText = document.getElementById("api-status-text");

    // Timers
    this.timerSeeds = document.getElementById("timer-seeds");
    this.timerGears = document.getElementById("timer-gears");
    this.timerCosmetics = document.getElementById("timer-cosmetics");
    this.progressSeeds = document.getElementById("progress-seeds");
    this.progressGears = document.getElementById("progress-gears");
    this.progressCosmetics = document.getElementById("progress-cosmetics");

    // Counts
    this.countBadgeSeeds = document.getElementById("count-badge-seeds");
    this.countBadgeGear = document.getElementById("count-badge-gear");
    this.countBadgeCosmetics = document.getElementById("count-badge-cosmetics");
  }

  bindEvents() {
    // Tabs
    this.tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Suche
    this.searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.searchClear.classList.toggle("hidden", !this.searchQuery);
      this.render();
    });

    this.searchClear.addEventListener("click", () => {
      this.searchInput.value = "";
      this.searchQuery = "";
      this.searchClear.classList.add("hidden");
      this.render();
    });

    // Filter
    this.stockFilter.addEventListener("change", (e) => {
      this.filterMode = e.target.value;
      this.render();
    });

    // Test Alert
    this.testNotifBtn.addEventListener("click", () => {
      window.notifierManager.triggerTestNotification();
    });

    // Mute All
    this.muteAllBtn.addEventListener("click", () => {
      if (confirm("Möchtest du wirklich alle Benachrichtigungen ausschalten (alle auf 🔴)?")) {
        window.notifierManager.muteAll();
        this.render();
      }
    });

    // Grid Delegation für Glocken-Klick
    this.itemsGrid.addEventListener("click", async (e) => {
      const btn = e.target.closest(".notif-btn");
      if (!btn) return;
      const itemName = btn.dataset.item;
      if (!itemName) return;

      btn.classList.add("pulse-bell");
      setTimeout(() => btn.classList.remove("pulse-bell"), 600);

      const isActive = await window.notifierManager.toggleAlert(itemName);
      this.updateCardNotifState(btn, isActive);

      // Falls das Item bereits im Stock ist und gerade auf Grün geschaltet wurde, direkt melden!
      if (isActive) {
        const currentAmount = this.stockMap[this.currentTab][itemName] || 0;
        if (currentAmount > 0) {
          const imgUrl = this.imagesMap[itemName] || null;
          window.notifierManager.sendNotification(itemName, currentAmount, imgUrl);
        }
      }
    });
  }

  updateCardNotifState(btn, isActive) {
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-label", isActive ? "Benachrichtigung an (Grün)" : "Benachrichtigung aus (Rot)");
    btn.title = isActive ? "Benachrichtigung aktiv (🟢 Grün) - Klicke zum Ausschalten" : "Benachrichtigung inaktiv (🔴 Rot) - Klicke zum Aktivieren";
    btn.innerHTML = isActive ? "🟢" : "🔴";
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.tabButtons.forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    // Info-Banner anpassen
    if (tab === "seeds") {
      this.categoryInfoText.textContent = "Seeds: Zeigt alle Samen an (auch ausverkaufte). Klicke auf 🔴, um sie auf 🟢 grün zu schalten und Desktop-Alerts zu erhalten!";
    } else if (tab === "gear") {
      this.categoryInfoText.textContent = "Gear: Zeigt alle Werkzeuge/Ausrüstung an (auch ausverkaufte). Schalte Gegenstände auf 🟢 grün für Benachrichtigungen!";
    } else if (tab === "cosmetics") {
      this.categoryInfoText.textContent = "Cosmetics: Zeigt ausschließlich Deko-Gegenstände an, die aktuell im Stock sind.";
    }

    this.render();
  }

  async start() {
    await this.fetchStock();

    // Timer-Ticker jede Sekunde
    setInterval(() => this.updateTimers(), 1000);

    // Auto-Refresh der Stock-Daten alle 20 Sekunden
    setInterval(() => this.fetchStock(true), 20000);
  }

  async fetchStock(isBackground = false) {
    if (!isBackground) {
      this.loadingSpinner.classList.remove("hidden");
    }

    try {
      const data = await window.stockAPI.getStockData();
      this.apiData = data;
      this.processData(data);
      this.apiStatusText.textContent = "Live verbunden";
      this.lastUpdatedText.textContent = `Zuletzt aktualisiert: ${new Date().toLocaleTimeString()}`;

      // Benachrichtigungen für alle aktiven Items prüfen
      const allStockItems = {
        ...this.stockMap.seeds,
        ...this.stockMap.gear
      };
      window.notifierManager.checkAndNotify(allStockItems, this.imagesMap);

      this.loadingSpinner.classList.add("hidden");
      this.render();
    } catch (err) {
      console.error("Fehler beim Abrufen der Stock-Daten:", err);
      this.apiStatusText.textContent = "Offline / Proxy Retry";
      if (!isBackground) {
        this.loadingSpinner.classList.add("hidden");
        window.showToast("Konnte Stock-Daten nicht live laden. Versuche erneut...", "danger");
      }
    }
  }

  processData(data) {
    // 1. Stock-Maps zurücksetzen
    this.stockMap.seeds = {};
    this.stockMap.gear = {};
    this.stockMap.cosmetics = {};

    // 2. Bilder sammeln
    if (data.imageData) {
      this.imagesMap = { ...this.imagesMap, ...data.imageData };
    }

    // 3. Seeds verarbeiten
    if (Array.isArray(data.seedsStock)) {
      data.seedsStock.forEach(item => {
        if (item && item.name) {
          this.stockMap.seeds[item.name] = Number(item.value) || 0;
        }
      });
    }

    // 4. Gear verarbeiten
    if (Array.isArray(data.gearStock)) {
      data.gearStock.forEach(item => {
        if (item && item.name) {
          this.stockMap.gear[item.name] = Number(item.value) || 0;
        }
      });
    }

    // 5. Cosmetics verarbeiten (nur die tatsächlich im Stock sind)
    if (Array.isArray(data.cosmeticsStock)) {
      data.cosmeticsStock.forEach(item => {
        if (item && item.name && Number(item.value) > 0) {
          this.stockMap.cosmetics[item.name] = Number(item.value);
        }
      });
    }

    // 6. Restock-Timers erfassen
    const now = Date.now();
    if (data.restockTimers) {
      if (data.restockTimers.seeds) {
        this.timerEnds.seeds = now + data.restockTimers.seeds;
      }
      if (data.restockTimers.gears) {
        this.timerEnds.gears = now + data.restockTimers.gears;
      }
      if (data.restockTimers.cosmetics) {
        this.timerEnds.cosmetics = now + data.restockTimers.cosmetics;
      }
    }
  }

  getItemsForCurrentTab() {
    let items = [];

    if (this.currentTab === "seeds") {
      // VORGABE: ALLE Seeds anzeigen (auch wenn nicht im Stock = 0)
      const allSeedNames = Array.from(new Set([...MASTER_SEEDS, ...Object.keys(this.stockMap.seeds)]));
      allSeedNames.sort((a, b) => {
        const stockA = this.stockMap.seeds[a] || 0;
        const stockB = this.stockMap.seeds[b] || 0;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockB > 0 && stockA === 0) return 1;
        return a.localeCompare(b);
      });

      items = allSeedNames.map(name => ({
        name: name,
        amount: this.stockMap.seeds[name] || 0,
        category: "seeds",
        hasNotif: true
      }));

    } else if (this.currentTab === "gear") {
      // VORGABE: ALLE Gear anzeigen (auch wenn nicht im Stock = 0)
      const allGearNames = Array.from(new Set([...MASTER_GEARS, ...Object.keys(this.stockMap.gear)]));
      allGearNames.sort((a, b) => {
        const stockA = this.stockMap.gear[a] || 0;
        const stockB = this.stockMap.gear[b] || 0;
        if (stockA > 0 && stockB === 0) return -1;
        if (stockB > 0 && stockA === 0) return 1;
        return a.localeCompare(b);
      });

      items = allGearNames.map(name => ({
        name: name,
        amount: this.stockMap.gear[name] || 0,
        category: "gear",
        hasNotif: true
      }));

    } else if (this.currentTab === "cosmetics") {
      // VORGABE: Bei Cosmetic NUR die im Stock! Keine Notification!
      items = Object.entries(this.stockMap.cosmetics).map(([name, amount]) => ({
        name: name,
        amount: amount,
        category: "cosmetics",
        hasNotif: false // Keine Glocke bei Cosmetics!
      }));
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }

  render() {
    const rawItems = this.getItemsForCurrentTab();

    // Tab Badges aktualisieren
    if (this.countBadgeSeeds) {
      const inStockSeeds = Object.values(this.stockMap.seeds).filter(v => v > 0).length;
      this.countBadgeSeeds.textContent = `${inStockSeeds}/${MASTER_SEEDS.length}`;
    }
    if (this.countBadgeGear) {
      const inStockGear = Object.values(this.stockMap.gear).filter(v => v > 0).length;
      this.countBadgeGear.textContent = `${inStockGear}/${MASTER_GEARS.length}`;
    }
    if (this.countBadgeCosmetics) {
      this.countBadgeCosmetics.textContent = Object.keys(this.stockMap.cosmetics).length;
    }

    // Filter anwenden
    const filteredItems = rawItems.filter(item => {
      // Suchbegriff
      if (this.searchQuery && !item.name.toLowerCase().includes(this.searchQuery)) {
        return false;
      }

      // Filter-Modus
      if (this.filterMode === "instock" && item.amount <= 0) {
        return false;
      }
      if (this.filterMode === "notif_active") {
        if (!item.hasNotif || !window.notifierManager.isAlertEnabled(item.name)) {
          return false;
        }
      }

      return true;
    });

    // Rendering Grid
    this.itemsGrid.innerHTML = "";

    if (filteredItems.length === 0) {
      this.emptyState.classList.remove("hidden");
      return;
    }

    this.emptyState.classList.add("hidden");

    const fragment = document.createDocumentFragment();

    filteredItems.forEach(item => {
      const card = document.createElement("div");
      const inStock = item.amount > 0;
      card.className = `item-card ${inStock ? "is-in-stock" : "is-out-of-stock"}`;

      const imgUrl = this.imagesMap[item.name];
      const isAlertOn = item.hasNotif ? window.notifierManager.isAlertEnabled(item.name) : false;

      // Notification Button (NUR bei Seeds und Gear)
      let notifBtnHtml = "";
      if (item.hasNotif) {
        notifBtnHtml = `
          <button class="notif-btn ${isAlertOn ? "is-active" : ""}" 
                  data-item="${this.escapeHtml(item.name)}" 
                  title="${isAlertOn ? "Benachrichtigung aktiv (🟢 Grün) - Klicke zum Deaktivieren" : "Benachrichtigung inaktiv (🔴 Rot) - Klicke zum Aktivieren"}"
                  aria-label="${isAlertOn ? "Benachrichtigung an (Grün)" : "Benachrichtigung aus (Rot)"}">
            ${isAlertOn ? "🟢" : "🔴"}
          </button>
        `;
      }

      card.innerHTML = `
        <div class="item-top-row">
          <span class="stock-badge ${inStock ? "in-stock" : "out-of-stock"}">
            ${inStock ? `● ${item.amount} auf Lager` : "○ Ausverkauft"}
          </span>
          ${notifBtnHtml}
        </div>

        <div class="item-visual">
          ${imgUrl ? `
            <img src="${this.escapeHtml(imgUrl)}" 
                 alt="${this.escapeHtml(item.name)}" 
                 class="item-img" 
                 loading="lazy" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="item-img-placeholder" style="display:none;">
              ${FALLBACK_EMOJIS[item.category] || "📦"}
            </div>
          ` : `
            <div class="item-img-placeholder">
              ${FALLBACK_EMOJIS[item.category] || "📦"}
            </div>
          `}
        </div>

        <div class="item-info">
          <div class="item-name">${this.escapeHtml(item.name)}</div>
          <div class="item-category-tag">${this.formatCategoryName(item.category)}</div>
          <div class="item-amount-row">
            <span class="amount-label">Stock Anzahl:</span>
            <span class="amount-val ${inStock ? "highlight-green" : "highlight-gray"}">${item.amount}</span>
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    this.itemsGrid.appendChild(fragment);
  }

  formatCategoryName(cat) {
    if (cat === "seeds") return "🌱 Seed Shop";
    if (cat === "gear") return "🛠️ Gear Shop";
    if (cat === "cosmetics") return "✨ Cosmetic Shop";
    return cat;
  }

  updateTimers() {
    const now = Date.now();

    // Seeds
    this.renderSingleTimer(this.timerSeeds, this.progressSeeds, this.timerEnds.seeds, this.timerDurations.seeds, now);
    // Gear
    this.renderSingleTimer(this.timerGears, this.progressGears, this.timerEnds.gears, this.timerDurations.gears, now);
    // Cosmetics
    this.renderSingleTimer(this.timerCosmetics, this.progressCosmetics, this.timerEnds.cosmetics, this.timerDurations.cosmetics, now);
  }

  renderSingleTimer(textEl, progressEl, endTime, totalDuration, now) {
    if (!endTime || !textEl) return;
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      textEl.textContent = "00:00";
      if (progressEl) progressEl.style.width = "100%";
      // Bei 0 Restzeit sofort Daten neu anfragen
      if (remainingMs > -2000) {
        window.notifierManager.resetCycleCache();
        this.fetchStock(true);
      }
      return;
    }

    const totalSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    textEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (progressEl && totalDuration) {
      const elapsed = totalDuration - remainingMs;
      const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      progressEl.style.width = `${pct}%`;
    }
  }

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// App initialisieren
document.addEventListener("DOMContentLoaded", () => {
  window.app = new AppController();
  window.app.start();
});
