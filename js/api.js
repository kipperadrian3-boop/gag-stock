/**
 * Grow a Garden (GAG) - API Client
 * Ruft Live-Stock-Daten von growagarden.gg/api/stock ab
 * Unterstützt automatisches Fallback über High-Speed CORS Proxies,
 * falls die Seite statisch auf GitHub Pages oder lokal gehostet wird.
 */

const API_CONFIG = {
  PRIMARY_URL: "https://growagarden.gg/api/stock",
  CORS_PROXIES: [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ],
  TIMEOUT_MS: 7000
};

class StockAPI {
  constructor() {
    this.lastData = null;
    this.lastFetchTime = 0;
    this.isFetching = false;
  }

  async fetchWithTimeout(url, timeoutMs = API_CONFIG.TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept": "application/json" }
      });
      clearTimeout(id);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async getStockData() {
    if (this.isFetching && this.lastData) {
      return this.lastData;
    }
    this.isFetching = true;

    // 1. Direkter Aufruf versuchen
    try {
      const data = await this.fetchWithTimeout(API_CONFIG.PRIMARY_URL);
      if (this.validateData(data)) {
        this.lastData = data;
        this.lastFetchTime = Date.now();
        this.isFetching = false;
        return data;
      }
    } catch (directErr) {
      console.warn("Direkter API-Aufruf fehlgeschlagen (evtl. CORS):", directErr.message);
    }

    // 2. Proxies durchprobieren
    for (const proxyGen of API_CONFIG.CORS_PROXIES) {
      const proxyUrl = proxyGen(API_CONFIG.PRIMARY_URL);
      try {
        const data = await this.fetchWithTimeout(proxyUrl);
        let parsed = data;
        if (typeof data === "string") {
          parsed = JSON.parse(data);
        }
        if (this.validateData(parsed)) {
          this.lastData = parsed;
          this.lastFetchTime = Date.now();
          this.isFetching = false;
          return parsed;
        }
      } catch (proxyErr) {
        console.warn("Proxy fehlgeschlagen:", proxyUrl, proxyErr.message);
      }
    }

    this.isFetching = false;
    if (this.lastData) {
      return this.lastData;
    }
    throw new Error("Keine Verbindung zur Grow a Garden API möglich.");
  }

  validateData(data) {
    return data && (Array.isArray(data.seedsStock) || Array.isArray(data.gearStock));
  }
}

// Global verfügbare Instanz
window.stockAPI = new StockAPI();
