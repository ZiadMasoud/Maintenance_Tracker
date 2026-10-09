// ================================
// Database module
// Moved all IndexedDB initialization and core database helpers here.
// This file must load before js/fuel-analytics.js and js/script.js.
// ================================

const DB_NAME = "carMaintainDB";
const DB_VERSION = 11;
const SELECTIVE_BACKUP_STORE = "selectiveBackups";
const DEFAULT_MAINTENANCE_CATEGORIES = [
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
const DEFAULT_FINANCE_CATEGORIES = [
  { name: "Savings", type: "income", color: "#10b981" },
  { name: "Salary", type: "income", color: "#2563eb" },
  { name: "Personal Contribution", type: "income", color: "#0891b2" },
  { name: "Uber Driving", type: "income", color: "#3b82f6" },
  { name: "Bonus", type: "income", color: "#8b5cf6" },
  { name: "Refund", type: "income", color: "#06b6d4" },
  { name: "Maintenance", type: "expense", color: "#f59e0b" },
  { name: "Repairs & Parts", type: "expense", color: "#ea580c" },
  { name: "Registration & Permits", type: "expense", color: "#0f766e" },
  { name: "Fuel", type: "expense", color: "#ef4444" },
  { name: "Car Purchase", type: "expense", color: "#7c3aed" },
  { name: "Insurance", type: "expense", color: "#ec4899" },
  { name: "Tolls", type: "expense", color: "#6366f1" },
  { name: "Other", type: "expense", color: "#6b7280" }
];

let db;
let dbOpenPromise = null;
let isDbHealthy = true;

function checkDatabaseHealth() {
  if (!db) return false;

  try {
    const requiredStores = ["sessions", "items", "categories", "fuelRecords", "fuelSessions", "financeRecords", "financeCategories"];
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
        const itemStore = database.createObjectStore("items", { keyPath: "id", autoIncrement: true });
        itemStore.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!database.objectStoreNames.contains("categories")) {
        const categoryStore = database.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
        categoryStore.createIndex("name", "name", { unique: true });

        DEFAULT_MAINTENANCE_CATEGORIES.forEach(category => categoryStore.add(category));
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
        financeStore.createIndex("fuelRecordId", "fuelRecordId", { unique: false });
      }
      if (!database.objectStoreNames.contains("financeCategories")) {
        const financeCategoryStore = database.createObjectStore("financeCategories", { keyPath: "id", autoIncrement: true });
        financeCategoryStore.createIndex("name", "name", { unique: false });
        financeCategoryStore.createIndex("type", "type", { unique: false });

        DEFAULT_FINANCE_CATEGORIES.forEach(category => financeCategoryStore.add(category));
      } else if (oldVersion < 10) {
        const financeCategoryStore = request.transaction.objectStore("financeCategories");
        if (financeCategoryStore.indexNames.contains("name")) financeCategoryStore.deleteIndex("name");
        financeCategoryStore.createIndex("name", "name", { unique: false });
        if (!financeCategoryStore.indexNames.contains("type")) financeCategoryStore.createIndex("type", "type", { unique: false });
        const addedFinanceDefaults = [
          { name: "Uber Driving", type: "income", color: "#3b82f6" },
          { name: "Car Purchase", type: "expense", color: "#7c3aed" }
        ];
        financeCategoryStore.getAll().onsuccess = event => {
          const existingNames = new Set(event.target.result.map(category => category.name.toLowerCase()));
          addedFinanceDefaults.forEach(category => {
            if (!existingNames.has(category.name.toLowerCase())) financeCategoryStore.add(category);
          });
        };
        financeCategoryStore.openCursor().onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            const category = cursor.value;
            category.type = category.type || (["Savings", "Monthly Savings", "Salary", "Bonus", "Refund", "Uber Driving"].includes(category.name) ? "income" : "expense");
            cursor.update(category);
            cursor.continue();
          }
        };
      }
      if (oldVersion === 10) {
        const financeCategoryStore = request.transaction.objectStore("financeCategories");
        const addedFinanceDefaults = [
          { name: "Uber Driving", type: "income", color: "#3b82f6" },
          { name: "Car Purchase", type: "expense", color: "#7c3aed" }
        ];
        financeCategoryStore.getAll().onsuccess = event => {
          const existingNames = new Set(event.target.result.map(category => category.name.toLowerCase()));
          addedFinanceDefaults.forEach(category => {
            if (!existingNames.has(category.name.toLowerCase())) financeCategoryStore.add(category);
          });
        };
      }
      if (!database.objectStoreNames.contains(SELECTIVE_BACKUP_STORE)) {
        const backupStore = database.createObjectStore(SELECTIVE_BACKUP_STORE, { keyPath: "id" });
        backupStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (oldVersion < 7) {
        console.log("Performing version 7 migration - no schema changes needed");
      }

      if (oldVersion < 8) {
        console.log("Performing version 8 migration - adding financeCategories store and fuelRecordId index");
        // Add fuelRecordId index to financeRecords if it doesn't exist
        if (database.objectStoreNames.contains("financeRecords")) {
          const financeStore = request.transaction.objectStore("financeRecords");
          if (!financeStore.indexNames.contains("fuelRecordId")) {
            financeStore.createIndex("fuelRecordId", "fuelRecordId", { unique: false });
          }
        }
      }

      if (oldVersion < 9) {
        console.log("Performing version 9 migration - no schema changes needed");
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

    DEFAULT_MAINTENANCE_CATEGORIES.forEach(category => categoryStore.add(category));
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
    financeStore.createIndex("fuelRecordId", "fuelRecordId", { unique: false });
  }
  if (!db.objectStoreNames.contains("financeCategories")) {
    const financeCategoryStore = db.createObjectStore("financeCategories", { keyPath: "id", autoIncrement: true });
    financeCategoryStore.createIndex("name", "name", { unique: false });
    financeCategoryStore.createIndex("type", "type", { unique: false });

    DEFAULT_FINANCE_CATEGORIES.forEach(category => financeCategoryStore.add(category));
  }
  if (!db.objectStoreNames.contains(SELECTIVE_BACKUP_STORE)) {
    const backupStore = db.createObjectStore(SELECTIVE_BACKUP_STORE, { keyPath: "id" });
    backupStore.createIndex("createdAt", "createdAt", { unique: false });
  }

  if (oldVersion < 7) {
    console.log("Performing version 7 migration - no schema changes needed");
  }

  if (oldVersion < 8) {
    console.log("Performing version 8 migration - adding financeCategories store and fuelRecordId index");
    // Add fuelRecordId index to financeRecords if it doesn't exist
    if (db.objectStoreNames.contains("financeRecords")) {
      const financeStore = dbInitRequest.transaction.objectStore("financeRecords");
      if (!financeStore.indexNames.contains("fuelRecordId")) {
        financeStore.createIndex("fuelRecordId", "fuelRecordId", { unique: false });
      }
    }
  }

  if (oldVersion < 9) {
    console.log("Performing version 9 migration - adding sessionId index to items store");
    // Add sessionId index to items store if it doesn't exist
    if (db.objectStoreNames.contains("items")) {
      const itemStore = dbInitRequest.transaction.objectStore("items");
      if (!itemStore.indexNames.contains("sessionId")) {
        itemStore.createIndex("sessionId", "sessionId", { unique: false });
      }
    }
  }
  if (oldVersion > 0 && oldVersion < 10) {
    const financeCategoryStore = dbInitRequest.transaction.objectStore("financeCategories");
    if (financeCategoryStore.indexNames.contains("name")) financeCategoryStore.deleteIndex("name");
    financeCategoryStore.createIndex("name", "name", { unique: false });
    if (!financeCategoryStore.indexNames.contains("type")) financeCategoryStore.createIndex("type", "type", { unique: false });
    const addedFinanceDefaults = [
      { name: "Uber Driving", type: "income", color: "#3b82f6" },
      { name: "Car Purchase", type: "expense", color: "#7c3aed" }
    ];
    financeCategoryStore.getAll().onsuccess = event => {
      const existingNames = new Set(event.target.result.map(category => category.name.toLowerCase()));
      addedFinanceDefaults.forEach(category => {
        if (!existingNames.has(category.name.toLowerCase())) financeCategoryStore.add(category);
      });
    };
    financeCategoryStore.openCursor().onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        const category = cursor.value;
        category.type = category.type || (["Savings", "Monthly Savings", "Salary", "Bonus", "Refund", "Uber Driving"].includes(category.name) ? "income" : "expense");
        cursor.update(category);
        cursor.continue();
      }
    };
  }
  if (oldVersion === 10) {
    const financeCategoryStore = dbInitRequest.transaction.objectStore("financeCategories");
    const addedFinanceDefaults = [
      { name: "Uber Driving", type: "income", color: "#3b82f6" },
      { name: "Car Purchase", type: "expense", color: "#7c3aed" }
    ];
    financeCategoryStore.getAll().onsuccess = event => {
      const existingNames = new Set(event.target.result.map(category => category.name.toLowerCase()));
      addedFinanceDefaults.forEach(category => {
        if (!existingNames.has(category.name.toLowerCase())) financeCategoryStore.add(category);
      });
    };
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
  showConfirm('This will delete the entire database and reload the page. Default maintenance and finance categories will be recreated automatically; import your data afterwards to restore your records. Continue?', 'Delete Database').then(confirmed => {
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

// Clear a single object store's data safely
function clearObjectStore(storeName) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    try {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error || new Error('Failed to clear store'));
    } catch (e) {
      reject(e);
    }
  });
}

function saveSelectiveBackup(backup) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    try {
      const tx = db.transaction([SELECTIVE_BACKUP_STORE], 'readwrite');
      const store = tx.objectStore(SELECTIVE_BACKUP_STORE);
      const record = {
        id: `selective_backup_${Date.now()}`,
        createdAt: new Date().toISOString(),
        stores: Object.keys(backup.stores || {}),
        sizeBytes: new TextEncoder().encode(JSON.stringify(backup)).length,
        backup
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => cleanupSelectiveBackups(20).catch(err => console.warn('Cleanup failed', err));
    } catch (e) {
      reject(e);
    }
  });
}

function getLatestSelectiveBackup() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    try {
      const tx = db.transaction([SELECTIVE_BACKUP_STORE], 'readonly');
      const store = tx.objectStore(SELECTIVE_BACKUP_STORE);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && cursor.value) {
          resolve(cursor.value);
        } else {
          resolve(null);
        }
      };
      request.onerror = (event) => reject(event.target.error || new Error('Failed to read backup'));
    } catch (e) {
      reject(e);
    }
  });
}

function cleanupSelectiveBackups(maxAgeDays = 20) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    try {
      const tx = db.transaction([SELECTIVE_BACKUP_STORE], 'readwrite');
      const store = tx.objectStore(SELECTIVE_BACKUP_STORE);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          const createdAt = new Date(record.createdAt).getTime();
          if (!record.createdAt || createdAt < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = (event) => reject(event.target.error || new Error('Failed to clean backups'));
    } catch (e) {
      reject(e);
    }
  });
}

// Convenience helpers for settings UI
function deleteFuelData() {
  return showConfirm('Delete all fuel data? This will remove fuel history and fuel sessions. A backup will be created so you can undo.', 'Delete Fuel Data')
    .then(confirmed => {
      if (!confirmed) return Promise.reject(new Error('Cancelled'));
      if (typeof exportAllDataInternal !== 'function' || typeof saveSelectiveBackup !== 'function') {
        return Promise.reject(new Error('Backup helper unavailable'));
      }

      return exportAllDataInternal().then(fullData => {
        const backup = {
          stores: {
            fuelRecords: fullData.fuelRecords || [],
            fuelSessions: fullData.fuelSessions || []
          },
          meta: {
            type: 'fuel',
            date: new Date().toISOString()
          }
        };

        return saveSelectiveBackup(backup).then(() => Promise.all([
          clearObjectStore('fuelRecords'),
          clearObjectStore('fuelSessions')
        ]));
      });
    });
}

function deleteFinanceData() {
  return showConfirm('Delete all finance records? This will remove finance history but keep your categories. A backup will be created so you can undo.', 'Delete Finance Data')
    .then(confirmed => {
      if (!confirmed) return Promise.reject(new Error('Cancelled'));
      if (typeof exportAllDataInternal !== 'function' || typeof saveSelectiveBackup !== 'function') {
        return Promise.reject(new Error('Backup helper unavailable'));
      }

      return exportAllDataInternal().then(fullData => {
        const backup = {
          stores: {
            financeRecords: fullData.financeRecords || []
          },
          meta: {
            type: 'finance',
            date: new Date().toISOString()
          }
        };

        return saveSelectiveBackup(backup).then(() => clearObjectStore('financeRecords'));
      });
    });
}

function deleteSessionsData() {
  return showConfirm('Delete all maintenance sessions (items/categories will remain). A backup will be created so you can undo.', 'Delete Sessions')
    .then(confirmed => {
      if (!confirmed) return Promise.reject(new Error('Cancelled'));
      if (typeof exportAllDataInternal !== 'function' || typeof saveSelectiveBackup !== 'function') {
        return Promise.reject(new Error('Backup helper unavailable'));
      }

      return exportAllDataInternal().then(fullData => {
        const backup = {
          stores: {
            sessions: fullData.sessions || []
          },
          meta: {
            type: 'sessions',
            date: new Date().toISOString()
          }
        };

        return saveSelectiveBackup(backup).then(() => clearObjectStore('sessions'));
      });
    });
}

// Restore the last selective-delete backup (if any)
function restoreLastSelectiveBackup() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    getLatestSelectiveBackup().then(backupRecord => {
      if (!backupRecord || !backupRecord.backup) {
        reject(new Error('No selective delete backup found'));
        return;
      }

      restoreBackupObject(backupRecord.backup).then(() => {
        resolve(backupRecord.backup.meta || {});
      }).catch(reject);
    }).catch(reject);
  });
}

// Restore a backup object (writes stores back into the DB)
function restoreBackupObject(backup) {
  return new Promise((resolve, reject) => {
    if (!backup || !backup.stores) return reject(new Error('Invalid backup object'));
    if (!db) return reject(new Error('Database not initialized'));

    const storeNames = Object.keys(backup.stores);
    if (storeNames.length === 0) return reject(new Error('No stores in backup'));

    const tx = db.transaction(storeNames, 'readwrite');
    tx.oncomplete = () => resolve(backup.meta || {});
    tx.onerror = (e) => reject(e.target.error || new Error('Restore transaction failed'));

    for (const storeName of storeNames) {
      try {
        const store = tx.objectStore(storeName);
        const items = backup.stores[storeName] || [];
        items.forEach(item => {
          try { store.put(item); } catch (e) { console.warn('Failed to put item during restore', e); }
        });
      } catch (e) {
        console.warn('Restore: store not found or error:', storeName, e);
      }
    }
  });
}
