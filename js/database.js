// ================================
// Database module
// Moved all IndexedDB initialization and core database helpers here.
// This file must load before js/fuel-analytics.js and js/script.js.
// ================================

const DB_NAME = "carMaintainDB";
const DB_VERSION = 7;

let db;
let dbOpenPromise = null;
let isDbHealthy = true;

function checkDatabaseHealth() {
  if (!db) return false;

  try {
    const requiredStores = ["sessions", "items", "categories", "fuelRecords", "fuelSessions", "financeRecords"];
    for (const storeName of requiredStores) {
      if (!db.objectStoreNames.contains(storeName)) {
        console.error(`Missing required object store: ${storeName}`);
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error("Database health check failed:", e);
    return false;
  }
}

function openDatabase() {
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (e) {
      const database = e.target.result;
      const oldVersion = e.oldVersion;
      console.log(`Database upgrade from version ${oldVersion} to ${DB_VERSION}`);

      database.onerror = (event) => {
        console.error("Database error during upgrade:", event.target.error);
        isDbHealthy = false;
      };

      if (!database.objectStoreNames.contains("sessions")) {
        database.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
      }
      if (!database.objectStoreNames.contains("items")) {
        database.createObjectStore("items", { keyPath: "id", autoIncrement: true });
      }
      if (!database.objectStoreNames.contains("categories")) {
        const categoryStore = database.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
        categoryStore.createIndex("name", "name", { unique: true });

        const defaultCategories = [
          { name: "Oil Change", color: "#667eea" },
          { name: "Brake Service", color: "#f56565" },
          { name: "Tire Service", color: "#ed8936" },
          { name: "Engine Repair", color: "#48bb78" },
          { name: "General Maintenance", color: "#764ba2" },
          { name: "Battery", color: "#38b2ac" },
          { name: "Transmission", color: "#9f7aea" },
          { name: "Suspension", color: "#ed64a6" },
          { name: "Cooling System", color: "#4299e1" },
          { name: "Exhaust", color: "#f6ad55" },
          { name: "Air Filter", color: "#68d391" },
          { name: "Spark Plugs", color: "#fc8181" },
          { name: "Belts & Hoses", color: "#63b3ed" },
          { name: "Lights & Electrical", color: "#f687b3" },
          { name: "AC & Heating", color: "#4fd1c5" }
        ];
        defaultCategories.forEach(cat => categoryStore.add(cat));
      }
      if (!database.objectStoreNames.contains("fuelRecords")) {
        const fuelStore = database.createObjectStore("fuelRecords", { keyPath: "id" });
        fuelStore.createIndex("sessionId", "sessionId", { unique: false });
        fuelStore.createIndex("date", "date", { unique: false });
        fuelStore.createIndex("odometer", "odometer", { unique: false });
      }
      if (!database.objectStoreNames.contains("fuelSessions")) {
        const fuelSessionStore = database.createObjectStore("fuelSessions", { keyPath: "id" });
        fuelSessionStore.createIndex("vehicleId", "vehicleId", { unique: false });
      }
      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("financeRecords")) {
        const financeStore = database.createObjectStore("financeRecords", { keyPath: "id", autoIncrement: true });
        financeStore.createIndex("date", "date", { unique: false });
        financeStore.createIndex("type", "type", { unique: false });
        financeStore.createIndex("sessionId", "sessionId", { unique: false });
      }

      if (oldVersion < 7) {
        console.log("Performing version 7 migration - no schema changes needed");
      }
    };

    request.onsuccess = function (e) {
      db = e.target.result;
      isDbHealthy = checkDatabaseHealth();

      if (!isDbHealthy) {
        console.error("Database health check failed after opening");
        reject(new Error("Database health check failed"));
        return;
      }

      console.log("Database opened successfully, version:", db.version);
      resolve(db);
    };

    request.onerror = function (e) {
      console.error("Database failed to open:", e.target.error);
      const errorMsg = e.target.error ? e.target.error.message : "Unknown error";
      isDbHealthy = false;
      reject(new Error("Database failed to open: " + errorMsg));
    };

    request.onblocked = function () {
      console.warn("Database open blocked - another connection may be open");
      isDbHealthy = false;
    };
  });

  return dbOpenPromise;
}

const dbInitRequest = indexedDB.open(DB_NAME, DB_VERSION);

dbInitRequest.onupgradeneeded = function (e) {
  db = e.target.result;
  const oldVersion = e.oldVersion;
  console.log(`Database upgrade from version ${oldVersion} to ${DB_VERSION}`);

  db.onerror = (event) => {
    console.error("Database error during upgrade:", event.target.error);
    isDbHealthy = false;
  };

  if (!db.objectStoreNames.contains("sessions")) {
    db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("items")) {
    db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("categories")) {
    const categoryStore = db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
    categoryStore.createIndex("name", "name", { unique: true });

    const defaultCategories = [
      { name: "Oil Change", color: "#667eea" },
      { name: "Brake Service", color: "#f56565" },
      { name: "Tire Service", color: "#ed8936" },
      { name: "Engine Repair", color: "#48bb78" },
      { name: "General Maintenance", color: "#764ba2" },
      { name: "Battery", color: "#38b2ac" },
      { name: "Transmission", color: "#9f7aea" },
      { name: "Suspension", color: "#ed64a6" },
      { name: "Cooling System", color: "#4299e1" },
      { name: "Exhaust", color: "#f6ad55" },
      { name: "Air Filter", color: "#68d391" },
      { name: "Spark Plugs", color: "#fc8181" },
      { name: "Belts & Hoses", color: "#63b3ed" },
      { name: "Lights & Electrical", color: "#f687b3" },
      { name: "AC & Heating", color: "#4fd1c5" }
    ];
    defaultCategories.forEach(cat => categoryStore.add(cat));
  }
  if (!db.objectStoreNames.contains("fuelRecords")) {
    const fuelStore = db.createObjectStore("fuelRecords", { keyPath: "id" });
    fuelStore.createIndex("sessionId", "sessionId", { unique: false });
    fuelStore.createIndex("date", "date", { unique: false });
    fuelStore.createIndex("odometer", "odometer", { unique: false });
  }
  if (!db.objectStoreNames.contains("fuelSessions")) {
    const fuelSessionStore = db.createObjectStore("fuelSessions", { keyPath: "id" });
    fuelSessionStore.createIndex("vehicleId", "vehicleId", { unique: false });
  }
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
  if (!db.objectStoreNames.contains("financeRecords")) {
    const financeStore = db.createObjectStore("financeRecords", { keyPath: "id", autoIncrement: true });
    financeStore.createIndex("date", "date", { unique: false });
    financeStore.createIndex("type", "type", { unique: false });
    financeStore.createIndex("sessionId", "sessionId", { unique: false });
  }

  if (oldVersion < 7) {
    console.log("Performing version 7 migration - no schema changes needed");
  }
};

dbInitRequest.onsuccess = function (e) {
  db = e.target.result;
  isDbHealthy = checkDatabaseHealth();

  if (!isDbHealthy) {
    console.error("Database health check failed after opening");
    showAlert("Database health check failed. Please use 'Delete Database' option in Settings.");
    return;
  }

  console.log("Database opened successfully, version:", db.version);
  initializeSidebar();
  if (typeof odometerValue !== 'undefined' && odometerValue) odometerValue.textContent = `${currentOdometer.toLocaleString()}`;
  if (typeof carNameDisplay !== 'undefined' && carNameDisplay) carNameDisplay.textContent = carName;
  loadCarInfo();
  loadFuelSettings();
  initializeEventListeners();
  setActiveTab('home');
  renderAll();
  initializeCharts();
  startLiveTime();
  renderCarInfo();
  initializeHeaderActions();
};

dbInitRequest.onerror = function (e) {
  console.error("Database failed to open:", e.target.error);
  const errorMsg = e.target.error ? e.target.error.message : "Unknown error";
  isDbHealthy = false;
  showAlert("Database failed to open: " + errorMsg + "\n\nPlease clear browser data or use the 'Delete Database' option in Settings.");
};

dbInitRequest.onblocked = function () {
  console.warn("Database open blocked - another connection may be open");
  showAlert("Database is blocked. Please close other tabs and refresh.");
};

function safeTransaction(storeNames, mode = "readonly") {
  if (!db || !isDbHealthy) {
    console.error("Cannot create transaction: database not healthy");
    return null;
  }

  try {
    const tx = db.transaction(storeNames, mode);

    tx.onerror = (event) => {
      console.error("Transaction error:", event.target.error);
    };

    tx.onabort = (event) => {
      console.warn("Transaction aborted:", event.target.error);
    };

    return tx;
  } catch (e) {
    console.error("Failed to create transaction:", e);
    return null;
  }
}

function closeOpenDatabases() {
  try {
    if (db) {
      db.close();
      db = null;
      isDbHealthy = false;
    }
  } catch (e) {
    console.warn('Failed to close primary database handle:', e);
  }

  try {
    if (typeof FuelDataManager !== 'undefined' && FuelDataManager && typeof FuelDataManager.closeDatabase === 'function') {
      FuelDataManager.closeDatabase();
    }
  } catch (e) {
    console.warn('Failed to close fuel data manager database handle:', e);
  }

  dbOpenPromise = null;
}

function deleteDatabase() {
  showConfirm('This will delete the entire database and reload the page. You will need to import your data afterwards. Continue?', 'Delete Database').then(confirmed => {
    if (!confirmed) return;

    closeOpenDatabases();

    const deleteReq = indexedDB.deleteDatabase(DB_NAME);

    deleteReq.onsuccess = function() {
      console.log("Database deleted successfully");
      showAlert("Database deleted. Page will reload now.");
      setTimeout(() => {
        location.reload();
      }, 1500);
    };

    deleteReq.onerror = function() {
      console.error("Error deleting database:", deleteReq.error);
      showAlert("Error deleting database: " + (deleteReq.error ? deleteReq.error.message : 'Unknown error'));
    };

    deleteReq.onblocked = function() {
      console.warn("Database deletion blocked - close other tabs");
      showAlert("Database deletion blocked. Please close other tabs and try again.");
    };
  });
}
