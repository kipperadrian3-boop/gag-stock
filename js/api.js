/**
 * Grow a Garden (GAG) - Robuster Multi-Source API Client
 * 
 * Verhindert CORS- und Netzwerkblockaden (z.B. in Microsoft Edge oder bei file://-URLs):
 * 1. Lädt sofort die eingebetteten Daten aus window.GAG_LIVE_STOCK (garantierter 0-Fehler Start).
 * 2. Fragt im Web (GitHub Pages / HTTP) live bei VulcanValues und data/stock.json an.
 * 3. Fällt bei strikten Browser-Sicherheitsregeln nahtlos auf die vorhandenen Daten zurück,
 *    ohne störende Fehlermeldungen anzuzeigen.
 */

class StockAPI {
  constructor() {
    this.lastData = window.GAG_LIVE_STOCK || null;
    this.lastFetchTime = Date.now();
    this.isFetching = false;
  }

  async getStockData() {
    if (this.isFetching && this.lastData) {
      return this.lastData;
    }
    this.isFetching = true;

    // Falls wir bereits Daten haben (z.B. aus live_stock_data.js), merken wir uns diese als sicheren Fallback
    if (!this.lastData && window.GAG_LIVE_STOCK) {
      this.lastData = window.GAG_LIVE_STOCK;
    }

    // 1. Wenn wir auf einem HTTP/HTTPS-Server laufen (z.B. GitHub Pages): data/stock.json abrufen (gleiche Origin, 0% CORS-Problem!)
    if (window.location.protocol.startsWith("http")) {
      try {
        const response = await fetch("data/stock.json?t=" + Date.now(), {
          headers: { "Accept": "application/json" }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && (json.seedsStock || json.gearStock)) {
            this.lastData = json;
            this.lastFetchTime = Date.now();
            this.isFetching = false;
            return json;
          }
        }
      } catch (err) {
        // Stille Weiterleitung zum nächsten Handler
      }

      // 2. VulcanValues Live Stock (Server-rendered mit Access-Control-Allow-Origin: *)
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
        // Stiller Fallback
      }

      // 3. Direkter Aufruf growagarden.gg/api/stock
      try {
        const response = await fetch("https://growagarden.gg/api/stock", {
          headers: { "Accept": "application/json" }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && (json.seedsStock || json.gearStock)) {
            this.lastData = json;
            this.lastFetchTime = Date.now();
            this.isFetching = false;
            return json;
          }
        }
      } catch (directErr) {
        // Stiller Fallback
      }
    }

    this.isFetching = false;

    // Wenn wir Daten im Speicher haben, geben wir sie zurück (egal welcher Browser)
    if (this.lastData) {
      return this.lastData;
    }

    // Notfall-Fallback
    return {
      seedsStock: [
        { name: "Carrot", value: 14 },
        { name: "Strawberry", value: 4 },
        { name: "Blueberry", value: 5 },
        { name: "Buttercup", value: 25 },
        { name: "Tomato", value: 3 },
        { name: "Corn", value: 4 },
        { name: "Bamboo", value: 19 },
        { name: "Broccoli", value: 1 },
        { name: "Cocomango", value: 1 }
      ],
      gearStock: [
        { name: "Watering Can", value: 1 },
        { name: "Trowel", value: 2 },
        { name: "Recall Wrench", value: 2 },
        { name: "Trading Ticket", value: 1 },
        { name: "Favorite Tool", value: 1 },
        { name: "Harvest Tool", value: 3 },
        { name: "Pet Lead", value: 1 },
        { name: "Pet Name Reroller", value: 6 }
      ],
      cosmeticsStock: [
        { name: "Sign Crate", value: 2 },
        { name: "Prickly Sign", value: 1 },
        { name: "Stone Lantern", value: 1 },
        { name: "Red Pottery", value: 2 }
      ],
      restockTimers: { seeds: 240000, gears: 240000, cosmetics: 3600000 },
      imageData: {}
    };
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
