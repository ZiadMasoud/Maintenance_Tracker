/* db.js - enhanced IndexedDB wrapper for car maintenance tracker */
const DB_NAME = "MyCarPersonalDB";
const DB_VERSION = 6; // Increment version for fuel logs schema
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => {
      db = e.target.result;
      
      // Profile store for vehicle information
      if (!db.objectStoreNames.contains("profile"))
        db.createObjectStore("profile", { keyPath: "id" });
      
      // Settings store for app preferences
      if (!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings", { keyPath: "id" });
      
      // Enhanced Savings store with running total
      if (!db.objectStoreNames.contains("savings")) {
        const s = db.createObjectStore("savings", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("month", "month", { unique: true });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      
      // New: Car Savings store for individual savings entries
      if (!db.objectStoreNames.contains("carSavings")) {
        const s = db.createObjectStore("carSavings", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
        s.createIndex("description", "description", { unique: false });
      }
      
      // Enhanced Maintenance store with services array
      if (!db.objectStoreNames.contains("maintenance")) {
        const s = db.createObjectStore("maintenance", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("odometer", "odometer", { unique: false });
        s.createIndex("supplier", "supplier", { unique: false });
      }
      
      // Fuel logs store
      if (!db.objectStoreNames.contains("fuel")) {
        const s = db.createObjectStore("fuel", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("odometer", "odometer", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
        s.createIndex("nextServiceDate", "nextServiceDate", { unique: false });
        s.createIndex("nextServiceKm", "nextServiceKm", { unique: false });
      }
      
      // Enhanced Fuel store with calculated fields
      if (!db.objectStoreNames.contains("fuel")) {
        const s = db.createObjectStore("fuel", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("odometer", "odometer", { unique: false });
        s.createIndex("createdAt", "createdAt", { unique: false });
      }
      
      // Parts store
      if (!db.objectStoreNames.contains("parts")) {
        const s = db.createObjectStore("parts", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("sku", "sku", { unique: true });
        s.createIndex("supplier", "supplier", { unique: false });
      }
      
      // Enhanced Suppliers store with location
      if (!db.objectStoreNames.contains("suppliers")) {
        const s = db.createObjectStore("suppliers", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("name", "name", { unique: true });
        s.createIndex("rating", "rating", { unique: false });
      }
      
      // New: Running totals store for savings tracking
      if (!db.objectStoreNames.contains("runningTotals")) {
        db.createObjectStore("runningTotals", { keyPath: "id" });
      }
    };
    
    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    
    req.onerror = (e) => reject(e.target.error);
  });
}

// Enhanced transaction helper with better error handling
function tx(storeNames, mode = "readonly") {
  return db.transaction(
    Array.isArray(storeNames) ? storeNames : [storeNames],
    mode
  );
}

// Enhanced CRUD operations with better error handling and validation
function add(storeName, record) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readwrite");
      const s = t.objectStore(storeName);
      
      // Add timestamps if not present
      if (!record.createdAt) {
        record.createdAt = new Date().toISOString();
      }
      record.updatedAt = new Date().toISOString();
      
      const r = s.add(record);
      r.onsuccess = () => res(r.result);
      r.onerror = (e) => rej(new Error(`Failed to add record: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`Add operation failed: ${error.message}`));
    }
  });
}

function put(storeName, record) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readwrite");
      const s = t.objectStore(storeName);
      
      // Update timestamp
      record.updatedAt = new Date().toISOString();
      
      const r = s.put(record);
      r.onsuccess = () => res(r.result);
      r.onerror = (e) => rej(new Error(`Failed to update record: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`Update operation failed: ${error.message}`));
    }
  });
}

function get(storeName, key) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readonly");
      const s = t.objectStore(storeName);
      const r = s.get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = (e) => rej(new Error(`Failed to get record: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`Get operation failed: ${error.message}`));
    }
  });
}

function getAll(storeName, indexName = null, direction = "prev") {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readonly");
      const s = t.objectStore(storeName);
      let req;
      
      if (indexName && s.indexNames.contains(indexName)) {
        req = s.index(indexName).openCursor(null, direction);
      } else {
        req = s.openCursor(null, direction);
      }
      
      const out = [];
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          out.push(cur.value);
          cur.continue();
        } else {
          res(out);
        }
      };
      
      req.onerror = (e) => rej(new Error(`Failed to get records: ${e.target.error}`));
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`GetAll operation failed: ${error.message}`));
    }
  });
}

function del(storeName, key) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readwrite");
      const s = t.objectStore(storeName);
      const r = s.delete(key);
      r.onsuccess = () => res();
      r.onerror = (e) => rej(new Error(`Failed to delete record: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`Delete operation failed: ${error.message}`));
    }
  });
}

function clear(storeName) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readwrite");
      const s = t.objectStore(storeName);
      const r = s.clear();
      r.onsuccess = () => res();
      r.onerror = (e) => rej(new Error(`Failed to clear store: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`Clear operation failed: ${error.message}`));
    }
  });
}

// Enhanced query methods for specific use cases
function getByIndex(storeName, indexName, value) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readonly");
      const s = t.objectStore(storeName);
      
      if (!s.indexNames.contains(indexName)) {
        rej(new Error(`Index '${indexName}' not found in store '${storeName}'`));
        return;
      }
      
      const req = s.index(indexName).get(value);
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(new Error(`Failed to get by index: ${e.target.error}`));
      
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`GetByIndex operation failed: ${error.message}`));
    }
  });
}

function getRange(storeName, indexName, lowerBound, upperBound, lowerOpen = false, upperOpen = false) {
  return new Promise((res, rej) => {
    try {
      const t = tx(storeName, "readonly");
      const s = t.objectStore(storeName);
      
      if (!s.indexNames.contains(indexName)) {
        rej(new Error(`Index '${indexName}' not found in store '${storeName}'`));
        return;
      }
      
      const range = IDBKeyRange.bound(lowerBound, upperBound, lowerOpen, upperOpen);
      const req = s.index(indexName).openCursor(range);
      
      const out = [];
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          out.push(cur.value);
          cur.continue();
        } else {
          res(out);
        }
      };
      
      req.onerror = (e) => rej(new Error(`Failed to get range: ${e.target.error}`));
      t.onerror = (e) => rej(new Error(`Transaction failed: ${e.target.error}`));
    } catch (error) {
      rej(new Error(`GetRange operation failed: ${error.message}`));
    }
  });
}

// Enhanced export/import with better data validation
async function exportAll() {
  try {
    const profile = await get("profile", "profile").catch(() => null);
    const settings = await getAll("settings").catch(() => []);
    const savings = await getAll("savings").catch(() => []);
    const carSavings = await getAll("carSavings").catch(() => []);
    const maintenance = await getAll("maintenance").catch(() => []);
    const fuel = await getAll("fuel").catch(() => []);
    const parts = await getAll("parts").catch(() => []);
    const suppliers = await getAll("suppliers").catch(() => []);
    const runningTotals = await get("runningTotals", "savings").catch(() => null);
    const carRunningTotals = await get("runningTotals", "carSavings").catch(() => null);
    
    return {
      meta: {
        exportedAt: new Date().toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        version: DB_VERSION,
        appVersion: "2.0"
      },
      profile,
      settings,
      savings,
      carSavings,
      maintenance,
      fuel,
      parts,
      suppliers,
      runningTotals,
      carRunningTotals
    };
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
}

async function importAll(obj) {
  try {
    if (obj.profile) await put("profile", obj.profile);
    
    if (Array.isArray(obj.settings)) {
      await clear("settings");
      for (const s of obj.settings) await add("settings", s).catch(() => {});
    }
    
    if (Array.isArray(obj.savings)) {
      await clear("savings");
      for (const s of obj.savings) await add("savings", s).catch(() => {});
    }
    
    if (Array.isArray(obj.carSavings)) {
      await clear("carSavings");
      for (const s of obj.carSavings) await add("carSavings", s).catch(() => {});
    }
    
    if (Array.isArray(obj.maintenance)) {
      await clear("maintenance");
      for (const m of obj.maintenance) await add("maintenance", m).catch(() => {});
    }
    
    if (Array.isArray(obj.fuel)) {
      await clear("fuel");
      for (const f of obj.fuel) await add("fuel", f).catch(() => {});
    }
    
    if (Array.isArray(obj.parts)) {
      await clear("parts");
      for (const p of obj.parts) await add("parts", p).catch(() => {});
    }
    
    if (Array.isArray(obj.suppliers)) {
      await clear("suppliers");
      for (const s of obj.suppliers) await add("suppliers", s).catch(() => {});
    }
    
    if (obj.runningTotals) await put("runningTotals", obj.runningTotals);
    if (obj.carRunningTotals) await put("runningTotals", obj.carRunningTotals);
    
    return true;
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`);
  }
}

// Specialized methods for the three main stores
const savingsHelper = {
  async add(record) {
    const result = await add("savings", record);
    await this.updateRunningTotal();
    return result;
  },
  
  async updateRunningTotal() {
    const savings = await getAll("savings");
    const total = savings.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const lastUpdated = savings.length > 0 ? savings[0].updatedAt : new Date().toISOString();
    
    await put("runningTotals", {
      id: "savings",
      total,
      lastUpdated,
      recordCount: savings.length
    });
  },
  
  async getRunningTotal() {
    return await get("runningTotals", "savings").catch(() => ({
      id: "savings",
      total: 0,
      lastUpdated: new Date().toISOString(),
      recordCount: 0
    }));
  }
};

const carSavingsHelper = {
  async add(record) {
    const result = await add("carSavings", record);
    await this.updateRunningTotal();
    return result;
  },
  
  async updateRunningTotal() {
    const carSavings = await getAll("carSavings");
    const total = carSavings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const lastUpdated = carSavings.length > 0 ? carSavings[0].createdAt : new Date().toISOString();
    
    await put("runningTotals", {
      id: "carSavings",
      total,
      lastUpdated,
      recordCount: carSavings.length
    });
  },
  
  async getRunningTotal() {
    return await get("runningTotals", "carSavings").catch(() => ({
      id: "carSavings",
      total: 0,
      lastUpdated: new Date().toISOString(),
      recordCount: 0
    }));
  },
  
  async getBreakdownBySource() {
    const carSavings = await getAll("carSavings");
    const breakdown = {};
    
    carSavings.forEach(entry => {
      const source = entry.description || 'Unknown';
      if (!breakdown[source]) {
        breakdown[source] = 0;
      }
      breakdown[source] += Number(entry.amount) || 0;
    });
    
    return Object.entries(breakdown).map(([source, amount]) => ({
      source,
      amount,
      percentage: 0 // Will be calculated in the UI
    }));
  },
  
  async getGoal() {
    return await get("settings", "carGoal").catch(() => ({
      id: "carGoal",
      amount: 0,
      updatedAt: new Date().toISOString()
    }));
  },
  
  async setGoal(amount) {
    return await put("settings", {
      id: "carGoal",
      amount: Number(amount),
      updatedAt: new Date().toISOString()
    });
  }
};

const fuelHelper = {
  async add(record) {
    // Calculate liters if not provided
    if (!record.liters && record.amount && record.pricePerLiter) {
      record.liters = +(record.amount / record.pricePerLiter).toFixed(2);
    }
    
    // Calculate total if not provided
    if (!record.total && record.liters && record.pricePerLiter) {
      record.total = +(record.liters * record.pricePerLiter).toFixed(2);
    }
    
    return await add("fuel", record);
  },
  
  async getFuelEfficiency() {
    const fuel = await getAll("fuel", "odometer");
    const efficiency = [];
    
    for (let i = 1; i < fuel.length; i++) {
      const prev = fuel[i - 1];
      const curr = fuel[i];
      const km = curr.odometer - prev.odometer;
      
      if (km > 0 && curr.liters) {
        efficiency.push({
          date: curr.date,
          kmL: +(km / curr.liters).toFixed(2),
          l100km: +(100 / (km / curr.liters)).toFixed(2)
        });
      }
    }
    
    return efficiency;
  }
};

const maintenanceHelper = {
  async add(record) {
    // Ensure services array exists
    if (!record.services || !Array.isArray(record.services)) {
      record.services = [];
    }
    
    // Calculate total cost from services if not provided
    if (!record.totalCost && record.services.length > 0) {
      record.totalCost = record.services.reduce((sum, service) => sum + (Number(service.cost) || 0), 0);
    }
    
    // Set next service dates if provided
    if (record.nextServiceKm) {
      record.nextServiceKmDate = record.odometer + record.nextServiceKm;
    }
    
    if (record.nextServiceMonths) {
      const nextDate = new Date(record.date);
      nextDate.setMonth(nextDate.getMonth() + record.nextServiceMonths);
      record.nextServiceDate = nextDate.toISOString();
    }
    
    return await add("maintenance", record);
  },
  
  async getUpcomingServices() {
    const maintenance = await getAll("maintenance");
    const now = new Date();
    const upcoming = [];
    
    for (const record of maintenance) {
      if (record.nextServiceDate) {
        const nextDate = new Date(record.nextServiceDate);
        if (nextDate > now) {
          upcoming.push({
            ...record,
            daysUntil: Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24))
          });
        }
      }
      
      if (record.nextServiceKm) {
        const profile = await get("profile", "profile").catch(() => ({ odometer: 0 }));
        const currentKm = profile.odometer || 0;
        const nextKm = record.odometer + record.nextServiceKm;
        
        if (currentKm >= nextKm - 1000) { // Within 1000km
          upcoming.push({
            ...record,
            kmUntil: nextKm - currentKm,
            type: 'km-based'
          });
        }
      }
    }
    
    return upcoming.sort((a, b) => {
      if (a.daysUntil && b.daysUntil) return a.daysUntil - b.daysUntil;
      if (a.kmUntil && b.kmUntil) return a.kmUntil - b.kmUntil;
      return 0;
    });
  }
};

// Expose the enhanced API
window.myDB = {
  initDB,
  add,
  put,
  get,
  getAll,
  del,
  clear,
  exportAll,
  importAll,
  getByIndex,
  getRange,
  savings: savingsHelper,
  carSavings: carSavingsHelper,
  fuel: fuelHelper,
  maintenance: maintenanceHelper
};
