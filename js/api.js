/**
 * Grow a Garden (GAG) - API Client
 * Ruft Live-Stock-Daten von Grow a Garden ab.
 * Nutzt primär https://vulcanvalues.com/grow-a-garden/stock (mit Access-Control-Allow-Origin: * für 100% CORS-Freiheit auf GitHub Pages)
 * sowie Fallbacks auf growagarden.gg/api/stock und statische Bundles.
 */

class StockAPI {
  constructor() {
    this.lastData = null;
    this.lastFetchTime = 0;
    this.isFetching = false;
  }

  async getStockData() {
    if (this.isFetching && this.lastData) {
      return this.lastData;
    }
    this.isFetching = true;

    // 1. VulcanValues Live Stock (Server-rendered mit Header 'Access-Control-Allow-Origin: *')
    try {
      const response = await fetch("https://vulcanvalues.com/grow-a-garden/stock", {
        headers: { "Accept": "text/html" }
      });
      if (response.ok) {
        const html = await response.text();
        const parsed = this.parseVulcanHtml(html);
        if (parsed.seedsStock.length > 0 || parsed.gearStock.length > 0) {
          this.lastData = parsed;
          this.lastFetchTime = Date.now();
          this.isFetching = false;
          return parsed;
        }
      }
    } catch (vulcanErr) {
      console.warn("VulcanValues Abruf fehlgeschlagen:", vulcanErr.message);
    }

    // 2. Direkter Aufruf growagarden.gg/api/stock (funktioniert bei lokaler Ausführung oder wenn CORS erlaubt ist)
    try {
      const response = await fetch("https://growagarden.gg/api/stock", {
        headers: { "Accept": "application/json" }
      });
      if (response.ok) {
        const json = await response.json();
        if (json.seedsStock || json.gearStock) {
          this.lastData = json;
          this.lastFetchTime = Date.now();
          this.isFetching = false;
          return json;
        }
      }
    } catch (directErr) {
      console.warn("Direkter API-Aufruf growagarden.gg fehlgeschlagen:", directErr.message);
    }

    // 3. Fallback auf lokales / gebündeltes data/stock.json
    try {
      const response = await fetch("data/stock.json");
      if (response.ok) {
        const json = await response.json();
        this.lastData = json;
        this.lastFetchTime = Date.now();
        this.isFetching = false;
        return json;
      }
    } catch (localErr) {
      console.warn("Lokales Bundle data/stock.json nicht geladen:", localErr.message);
    }

    this.isFetching = false;
    if (this.lastData) return this.lastData;

    throw new Error("Konnte keine Stock-Daten abrufen.");
  }

  parseVulcanHtml(html) {
    const result = {
      seedsStock: [],
      gearStock: [],
      cosmeticsStock: [],
      eggStock: [],
      eventStock: [],
      restockTimers: { seeds: 300000, gears: 300000, cosmetics: 3600000 },
      imageData: {}
    };

    const sections = html.split(/<h2[^>]*>/i);
    for (const section of sections) {
      const titleMatch = section.match(/^([^<]+)<\/h2>/i);
      if (!titleMatch) continue;
      const title = titleMatch[1].toUpperCase().trim();

      let targetArray = null;
      if (title.includes("SEED")) targetArray = result.seedsStock;
      else if (title.includes("GEAR")) targetArray = result.gearStock;
      else if (title.includes("COSMETIC")) targetArray = result.cosmeticsStock;
      else if (title.includes("EGG")) targetArray = result.eggStock;
      else if (title.includes("EVENT")) targetArray = result.eventStock;

      if (!targetArray) continue;

      const itemRegex = /<li[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<span>\s*([^<]+?)\s*<span[^>]*>\s*x(\d+)\s*<\/span>\s*<\/span>[\s\S]*?<\/li>/gi;
      let match;
      while ((match = itemRegex.exec(section)) !== null) {
        const imgPath = match[1];
        const name = match[2].trim();
        const count = parseInt(match[3], 10);
        targetArray.push({ name, value: count });

        const fullImgUrl = imgPath.startsWith("http") ? imgPath : `https://vulcanvalues.com${imgPath}`;
        result.imageData[name] = fullImgUrl;
      }
    }

    return result;
  }
}

window.stockAPI = new StockAPI();
