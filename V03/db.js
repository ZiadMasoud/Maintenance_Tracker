/* db.js - IndexedDB wrapper */
const DB_NAME = "CarManagerDB";
const DB_VERSION = 1;
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("savings")) {
        const s = db.createObjectStore("savings", {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("date", "date", { unique: false });
      }
      if (!db.objectStoreNames.contains("fuelLogs")) {
        const f = db.createObjectStore("fuelLogs", {
          keyPath: "id",
          autoIncrement: true,
        });
        f.createIndex("date", "date", { unique: false });
        f.createIndex("odometer", "odometer", { unique: false });
      }
      if (!db.objectStoreNames.contains("maintenance")) {
        const m = db.createObjectStore("maintenance", {
          keyPath: "id",
          autoIncrement: true,
        });
        m.createIndex("date", "date", { unique: false });
        m.createIndex("odometer", "odometer", { unique: false });
      }
      if (!db.objectStoreNames.contains("parts")) {
        db.createObjectStore("parts", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("suppliers")) {
        db.createObjectStore("suppliers", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile", { keyPath: "id" });
      }
    };
    r.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    r.onerror = (e) => reject(e.target.error);
  });
}

function tx(store, mode = "readonly") {
  return db.transaction(store, mode);
}
function add(storeName, record) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readwrite");
    const s = t.objectStore(storeName);
    const r = s.add(record);
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
function put(storeName, record) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readwrite");
    const s = t.objectStore(storeName);
    const r = s.put(record);
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
function get(storeName, key) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readonly");
    const s = t.objectStore(storeName);
    const r = s.get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = (e) => rej(e.target.error);
  });
}
function getAll(storeName, indexName = null) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readonly");
    const s = t.objectStore(storeName);
    let req;
    if (indexName && s.indexNames.contains(indexName))
      req = s.index(indexName).openCursor(null, "prev");
    else req = s.openCursor(null, "prev");
    const out = [];
    req.onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        out.push(c.value);
        c.continue();
      } else res(out);
    };
    req.onerror = (e) => rej(e.target.error);
  });
}
function del(storeName, key) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readwrite");
    const s = t.objectStore(storeName);
    const r = s.delete(key);
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}
function clear(storeName) {
  return new Promise((res, rej) => {
    const t = tx(storeName, "readwrite");
    const s = t.objectStore(storeName);
    const r = s.clear();
    r.onsuccess = () => res();
    r.onerror = (e) => rej(e.target.error);
  });
}

async function exportAll() {
  const savings = await getAll("savings").catch(() => []);
  const fuelLogs = await getAll("fuelLogs").catch(() => []);
  const maintenance = await getAll("maintenance").catch(() => []);
  const parts = await getAll("parts").catch(() => []);
  const suppliers = await getAll("suppliers").catch(() => []);
  const settings = await getAll("settings").catch(() => []);
  const profile = await get("profile", "profile").catch(() => null);
  return {
    meta: { exportedAt: new Date().toISOString() },
    profile,
    settings,
    savings,
    fuelLogs,
    maintenance,
    parts,
    suppliers,
  };
}

async function importAll(obj) {
  if (obj.profile) await put("profile", obj.profile);
  if (Array.isArray(obj.settings)) {
    await clear("settings");
    for (const s of obj.settings) await add("settings", s).catch(() => {});
  }
  if (Array.isArray(obj.savings)) {
    await clear("savings");
    for (const s of obj.savings) await add("savings", s).catch(() => {});
  }
  if (Array.isArray(obj.fuelLogs)) {
    await clear("fuelLogs");
    for (const f of obj.fuelLogs) await add("fuelLogs", f).catch(() => {});
  }
  if (Array.isArray(obj.maintenance)) {
    await clear("maintenance");
    for (const m of obj.maintenance)
      await add("maintenance", m).catch(() => {});
  }
  if (Array.isArray(obj.parts)) {
    await clear("parts");
    for (const p of obj.parts) await add("parts", p).catch(() => {});
  }
  if (Array.isArray(obj.suppliers)) {
    await clear("suppliers");
    for (const s of obj.suppliers) await add("suppliers", s).catch(() => {});
  }
}

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
};
