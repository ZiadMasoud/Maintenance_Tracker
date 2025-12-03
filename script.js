// ================================
// IndexedDB Setup
// ================================
let db;
const request = indexedDB.open("carMaintainDB", 2);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("sessions")) {
    db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("items")) {
    db.createObjectStore("items", { keyPath: "id", autoIncrement: true });
  }
  if (!db.objectStoreNames.contains("categories")) {
    const categoryStore = db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
    categoryStore.createIndex("name", "name", { unique: true });
    
    // Add default categories
    const defaultCategories = [
      { name: "Oil Change", color: "#667eea" },
      { name: "Brake Service", color: "#f56565" },
      { name: "Tire Service", color: "#ed8936" },
      { name: "Engine Repair", color: "#48bb78" },
      { name: "General Maintenance", color: "#764ba2" }
    ];
    defaultCategories.forEach(cat => categoryStore.add(cat));
  }
};

request.onsuccess = function (e) {
  db = e.target.result;
  // Initialize odometer display (currentOdometer variable name kept for code clarity)
  odometerValue.textContent = `${currentOdometer.toLocaleString()} km`;
  // Load car info from localStorage
  loadCarInfo();
  initializeEventListeners();
  renderAll();
  initializeCharts();
  startLiveTime();
  renderCarInfo();
};

request.onerror = function () {
  alert("Database failed to open");
};

// ================================
// Date Format Helper Functions
// ================================
function formatDateToBritish(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateToISO(britishDate) {
  if (!britishDate) return '';
  if (britishDate.includes('/')) {
    const [day, month, year] = britishDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return britishDate;
}

function parseDateInput(dateInput) {
  if (!dateInput) return null;
  
  // Remove any extra whitespace
  dateInput = dateInput.trim();
  
  // Try different separators: /, -, .
  const separators = ['/', '-', '.'];
  
  for (const sep of separators) {
    if (dateInput.includes(sep)) {
      const parts = dateInput.split(sep);
      if (parts.length === 3) {
        let day, month, year;
        
        // Try different order formats
        const formats = [
          // DD/MM/YYYY format
          () => {
            day = parts[0];
            month = parts[1];
            year = parts[2];
            return day.length <= 2 && month.length <= 2 && year.length === 4;
          },
          // MM/DD/YYYY format (US format)
          () => {
            day = parts[1];
            month = parts[0];
            year = parts[2];
            return day.length <= 2 && month.length <= 2 && year.length === 4;
          },
          // YYYY/MM/DD format (ISO-like)
          () => {
            day = parts[2];
            month = parts[1];
            year = parts[0];
            return day.length <= 2 && month.length <= 2 && year.length === 4;
          }
        ];
        
        for (const format of formats) {
          if (format()) {
            // Validate the date
            const dayNum = parseInt(day);
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);
            
            if (dayNum >= 1 && dayNum <= 31 && 
                monthNum >= 1 && monthNum <= 12 && 
                yearNum >= 1900 && yearNum <= 2100) {
              
              // Create date object to validate it's a real date
              const testDate = new Date(yearNum, monthNum - 1, dayNum);
              if (testDate.getDate() === dayNum && 
                  testDate.getMonth() === monthNum - 1 && 
                  testDate.getFullYear() === yearNum) {
                
                // Return in ISO format (YYYY-MM-DD)
                return `${yearNum}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }
          }
        }
      }
    }
  }
  
  return null;
}

function autoFormatDateInput(event) {
  let value = event.target.value;
  
  // Remove any non-digit characters
  value = value.replace(/\D/g, '');
  
  // Auto-add separators based on input length
  if (value.length >= 2 && value.length < 4) {
    value = value.substring(0, 2) + '/' + value.substring(2);
  } else if (value.length >= 4 && value.length < 8) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4);
  } else if (value.length > 8) {
    value = value.substring(0, 8);
  }
  
  event.target.value = value;
}

// ================================
// Event Listeners Setup
// ================================
function initializeEventListeners() {
  // Search functionality
  sessionSearch.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', clearSearch);
  categoryFilter.addEventListener('change', handleCategoryFilter);
  dateFilter.addEventListener('change', handleDateFilter);
  
  // Pagination
  prevPageBtn.addEventListener('click', () => changePage(-1));
  nextPageBtn.addEventListener('click', () => changePage(1));
  
  // Settings modal
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    document.body.classList.add('modal-open');
    loadCategoriesList(); // Load categories when settings modal opens
  });
  closeSettingsModal.addEventListener('click', () => {
    settingsModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
  
  // Export/Import functionality
  exportDataBtn.addEventListener('click', exportAllData);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportData);
  resetAllDataBtn.addEventListener('click', resetAllData);
  
  // Load categories for filter
  loadCategoriesForFilter();
  
  // View details modal
  closeViewDetailsModal.addEventListener('click', () => {
    viewDetailsModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
  closeViewDetailsBtn.addEventListener('click', () => {
    viewDetailsModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
  
  // Date input uses native picker; no auto-formatting needed
  
  // Toggle completed items
  toggleCompletedBtn.addEventListener('click', toggleCompletedItems);
  
  // Car info modal
  const carInfoModal = document.getElementById('carInfoModal');
  const closeCarInfoModal = document.getElementById('closeCarInfoModal');
  const saveCarInfoBtn = document.getElementById('saveCarInfoBtn');
  const cancelCarInfoBtn = document.getElementById('cancelCarInfoBtn');
  
  if (closeCarInfoModal) {
    closeCarInfoModal.addEventListener('click', () => {
      carInfoModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
  }
  
  if (cancelCarInfoBtn) {
    cancelCarInfoBtn.addEventListener('click', () => {
      carInfoModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
  }
  
  if (saveCarInfoBtn) {
    saveCarInfoBtn.addEventListener('click', saveCarInfo);
  }
}

// ================================
// DOM Elements
// ================================
const modal = document.getElementById("sessionModal");
const newSessionBtn = document.getElementById("newSessionBtn");
const closeModal = document.getElementById("closeModal");
const addItemBtn = document.getElementById("addItemBtn");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const itemsContainer = document.getElementById("itemsContainer");
const sessionsList = document.getElementById("sessionsList");
const upcomingList = document.getElementById("upcomingList");
const completedList = document.getElementById("completedList");
const completedItems = document.getElementById("completedItems");
const toggleCompletedBtn = document.getElementById("toggleCompletedBtn");
const currentOdometerBtn = document.getElementById("currentOdometerBtn");
const odometerValue = document.getElementById("odometerValue");
const totalCostDisplay = document.getElementById("totalCost");

// Odometer modal elements
const odometerModal = document.getElementById("odometerModal");
const closeOdometerModal = document.getElementById("closeOdometerModal");
const odometerInput = document.getElementById("odometerInput");
const saveOdometerBtn = document.getElementById("saveOdometerBtn");
const cancelOdometerBtn = document.getElementById("cancelOdometerBtn");

// Category management elements (now in settings modal)
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryColor = document.getElementById("newCategoryColor");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoriesList = document.getElementById("categoriesList");

// Search and pagination elements
const sessionSearch = document.getElementById("sessionSearch");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const categoryFilter = document.getElementById("categoryFilter");
const dateFilter = document.getElementById("dateFilter");
const paginationControls = document.getElementById("paginationControls");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

// Settings modal elements
const settingsModal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const resetAllDataBtn = document.getElementById("resetAllDataBtn");

// View details modal elements
const viewDetailsModal = document.getElementById("viewDetailsModal");
const closeViewDetailsModal = document.getElementById("closeViewDetailsModal");
const closeViewDetailsBtn = document.getElementById("closeViewDetailsBtn");
const sessionDetailsContent = document.getElementById("sessionDetailsContent");

// ================================
// State
// ================================
let editingSessionId = null;
let currentOdometer = parseInt(localStorage.getItem('currentOdometer')) || 0;

// Chart instances
let spendingChart = null;
let categoryChart = null;
let currentSpendingView = 'monthly';
let currentCategoryView = 'monthly';
let selectedSpendingMonth = '';
let selectedSpendingYear = '';
let selectedCategoryMonth = '';
let selectedCategoryYear = '';

// Car info state
let carInfo = {
  manufacturer: '',
  model: '',
  year: '',
  plate: '',
  color: '#1e40af',
  licenseExpiry: ''
};

// Search and pagination state
let filteredSessions = [];
let currentPage = 1;
let sessionsPerPage = 2;
let searchTerm = '';
let selectedCategoryFilter = '';
let selectedDateFilter = '';

// Odometer button functionality
currentOdometerBtn.addEventListener("click", () => {
  odometerInput.value = currentOdometer;
  odometerModal.style.display = "flex";
  document.body.classList.add('modal-open');
});

closeOdometerModal.addEventListener("click", () => {
  odometerModal.style.display = "none";
  document.body.classList.remove('modal-open');
});

cancelOdometerBtn.addEventListener("click", () => {
  odometerModal.style.display = "none";
  document.body.classList.remove('modal-open');
});

saveOdometerBtn.addEventListener("click", () => {
  const newValue = parseInt(odometerInput.value) || 0;
  currentOdometer = newValue;
  localStorage.setItem('currentOdometer', newValue.toString());
  odometerValue.textContent = `${newValue.toLocaleString()} km`;
  odometerModal.style.display = "none";
  document.body.classList.remove('modal-open');
  renderAll();
});

// Close odometer modal when clicking outside
window.addEventListener("click", function(e) {
  if (e.target === odometerModal) {
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
  }
});

// Category management functionality (now in settings modal)

addCategoryBtn.addEventListener("click", () => {
  const name = newCategoryName.value.trim();
  const color = newCategoryColor.value;
  
  if (!name) {
    alert("Please enter a category name");
    return;
  }
  
  const category = { name, color };
  const tx = db.transaction("categories", "readwrite");
  tx.objectStore("categories").add(category);
  
  tx.oncomplete = () => {
    newCategoryName.value = "";
    newCategoryColor.value = "#87CEEB";
    loadCategoriesList();
    loadCategoriesForFilter(); // Also update the filter dropdown
  };
  
  tx.onerror = () => {
    alert("Category with this name already exists");
  };
});

// ================================
// Modal Controls
// ================================
newSessionBtn.onclick = () => openModal();
closeModal.onclick = () => closeSessionModal();

function openModal(session = null) {
  modal.style.display = "flex";
  document.body.classList.add('modal-open');
  itemsContainer.innerHTML = "";
  editingSessionId = session ? session.id : null;

  if (session) {
    document.querySelector(".modal-content h2").textContent = "Edit Maintenance Session";
    // Set value as ISO for native date input
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("sessionOdometer").value = session.odometer;
    document.getElementById("sessionMerchant").value = session.merchant;
    document.getElementById("sessionNotes").value = session.notes;
    loadItemsForEdit(session.id);
  } else {
    document.querySelector(".modal-content h2").textContent = "New Maintenance Session";
    // Set default date to today in ISO (YYYY-MM-DD)
    const today = new Date();
    const iso = today.toISOString().split("T")[0];
    document.getElementById("sessionDate").value = iso;
    document.getElementById("sessionOdometer").value = "";
    document.getElementById("sessionMerchant").value = "";
    document.getElementById("sessionNotes").value = "";
  }
}

function closeSessionModal() {
  modal.style.display = "none";
  document.body.classList.remove('modal-open');
  editingSessionId = null;
}

// Handle clicks outside modals
window.addEventListener("click", function(e) {
  if (e.target === modal) closeSessionModal();
  if (e.target === odometerModal) {
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
  }
  if (e.target === settingsModal) {
    settingsModal.style.display = "none";
    document.body.classList.remove('modal-open');
  }
  if (e.target === viewDetailsModal) {
    viewDetailsModal.style.display = "none";
    document.body.classList.remove('modal-open');
  }
});

// ================================
// Item Fields
// ================================
addItemBtn.onclick = () => addItemField();

function addItemField(item = {}) {
  const div = document.createElement("div");
  div.classList.add("item-form");
  div.innerHTML = `
    <div class="item-inputs">
      <input type="text" class="itemName" placeholder="Item / Service" value="${item.name || ""}">
      <input type="number" class="itemPrice" placeholder="Price (EGP)" value="${item.price || ""}">
      <input type="number" class="itemInterval" placeholder="Interval (km)" value="${item.interval || ""}">
      <select class="itemCategory">
        <option value="">Select Category</option>
      </select>
    </div>
    <div class="item-notes">
      <input type="text" class="itemMerchant" placeholder="Merchant (optional)" value="${item.merchant || ""}">
      <textarea class="itemNotes" placeholder="Notes (optional)">${item.notes || ""}</textarea>
    </div>
    <button class="delete-item-btn">✕</button>
  `;
  div.querySelector(".delete-item-btn").onclick = () => div.remove();
  itemsContainer.appendChild(div);
  
  // Load categories for this select
  loadCategoriesForSelect(div.querySelector(".itemCategory"), item.categoryId);
}

// ================================
// Category Management
// ================================
function loadCategoriesForSelect(selectElement, selectedCategoryId = null) {
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const option = document.createElement("option");
      option.value = cursor.value.id;
      option.textContent = cursor.value.name;
      if (cursor.value.id === selectedCategoryId) {
        option.selected = true;
      }
      selectElement.appendChild(option);
      cursor.continue();
    }
  };
}

function loadCategoriesList() {
  categoriesList.innerHTML = "";
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const category = cursor.value;
      const categoryDiv = document.createElement("div");
      categoryDiv.classList.add("category-item");
      categoryDiv.innerHTML = `
        <div class="category-info">
          <div class="category-color" style="background-color: ${category.color}"></div>
          <span class="category-name">${category.name}</span>
        </div>
        <div class="category-actions">
          <button class="category-edit-btn" onclick="editCategory(${category.id})">✎</button>
          <button class="category-delete-btn" onclick="deleteCategory(${category.id})">🗑</button>
        </div>
      `;
      categoriesList.appendChild(categoryDiv);
      cursor.continue();
    }
  };
}

function editCategory(id) {
  const tx = db.transaction("categories", "readonly");
  tx.objectStore("categories").get(id).onsuccess = e => {
    const category = e.target.result;
    const newName = prompt("Edit category name:", category.name);
    if (newName && newName.trim() !== category.name) {
      const newColor = prompt("Edit category color (hex code):", category.color) || category.color;
      const updatedCategory = { ...category, name: newName.trim(), color: newColor };
      
      const updateTx = db.transaction("categories", "readwrite");
      updateTx.objectStore("categories").put(updatedCategory);
      updateTx.oncomplete = () => {
        loadCategoriesList();
        loadCategoriesForFilter();
      };
      updateTx.onerror = () => alert("Category with this name already exists");
    }
  };
}

function deleteCategory(id) {
  if (!confirm("Are you sure you want to delete this category? Items with this category will have no category assigned.")) return;
  
  const tx = db.transaction("categories", "readwrite");
  tx.objectStore("categories").delete(id);
  tx.oncomplete = () => {
    loadCategoriesList();
    loadCategoriesForFilter();
  };
}

// ================================
// Save Session
// ================================
saveSessionBtn.onclick = () => saveSession();

function saveSession() {
  let date = document.getElementById("sessionDate").value;
  
  // Native date input already provides ISO (YYYY-MM-DD)
  if (!date) {
    const today = new Date();
    date = today.toISOString().split("T")[0];
  }
  
  const odometer = parseInt(document.getElementById("sessionOdometer").value) || 0;
  const merchant = document.getElementById("sessionMerchant").value.trim();
  const notes = document.getElementById("sessionNotes").value.trim();

  // Auto-update current odometer only if session odometer is higher and valid
  if (odometer && odometer > currentOdometer) {
    currentOdometer = odometer;
    localStorage.setItem('currentOdometer', odometer.toString());
    odometerValue.textContent = `${odometer.toLocaleString()} km`;
  }

  const sessionObj = { id: editingSessionId || Date.now(), date, odometer, merchant, notes };

  const itemEls = itemsContainer.querySelectorAll(".item-form");
  const items = Array.from(itemEls).map(el => {
    const intervalVal = parseFloat(el.querySelector(".itemInterval").value);
    const categoryId = parseInt(el.querySelector(".itemCategory").value) || null;
    return {
      sessionId: sessionObj.id,
      name: el.querySelector(".itemName").value.trim(),
      price: parseFloat(el.querySelector(".itemPrice").value) || 0,
      interval: intervalVal || null,
      merchant: el.querySelector(".itemMerchant").value.trim(),
      notes: el.querySelector(".itemNotes").value.trim(),
      categoryId: categoryId,
      nextDueKm: intervalVal ? odometer + intervalVal : null
    };
  });

  const tx = db.transaction(["sessions", "items"], "readwrite");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");

  if (editingSessionId) {
    sessionStore.put(sessionObj);
    const delReq = itemStore.openCursor();
    delReq.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.sessionId === editingSessionId) cursor.delete();
        cursor.continue();
      } else {
        items.forEach(i => itemStore.add(i));
      }
    };
  } else {
    sessionStore.add(sessionObj);
    items.forEach(i => itemStore.add(i));
  }

  tx.oncomplete = function () {
    closeSessionModal();
    renderAll();
  };
}

// ================================
// Render All
// ================================
function renderAll() {
  renderSessions();
  renderUpcoming();
  renderTotalCost();
  if (spendingChart && categoryChart) {
    updateSpendingChart();
    updateCategoryChart();
  }
}

// ================================
// Render Sessions
// ================================
function renderSessions() {
  // Use the new pagination system
  applyFilters();
}

function displaySessions(sessions, items) {
  sessionsList.innerHTML = "";
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Load categories for display
  const tx = db.transaction("categories", "readonly");
  const categoryStore = tx.objectStore("categories");
  const categories = {};
  categoryStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      categories[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      renderSessionCards(sessions, items, categories);
    }
  };
}

function renderSessionCards(sessions, items, categories) {
  sessions.forEach(session => {
    const relatedItems = items.filter(i => i.sessionId === session.id);
    const total = relatedItems.reduce((sum, i) => sum + (i.price || 0), 0);

    const card = document.createElement("div");
    card.classList.add("session-card");
    card.style.cursor = "pointer";
    card.onclick = (e) => {
      // Don't open details if clicking on action buttons
      if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
        viewSessionDetails(session.id);
      }
    };
    card.innerHTML = `
      <div class="session-header">
        <h3>${session.date}</h3>
      </div>
      <button class="edit-btn" onclick="editSession(${session.id})">✎</button>
      <button class="delete-btn" onclick="deleteSession(${session.id})">🗑</button>
      ${session.odometer && session.odometer > 0 ? `<p><strong>ODO:</strong> ${session.odometer.toLocaleString()} km</p>` : ''}
      ${session.merchant ? `<p><strong>Merchant:</strong> ${session.merchant}</p>` : ""}
      ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ""}
      <div class="item-list">
        ${relatedItems
          .map(
            item => {
              const categoryName = item.categoryId && categories[item.categoryId] 
                ? categories[item.categoryId].name 
                : 'No Category';
              return `
          <div class="item-row">
            <span>${item.name || "Unnamed"} <span class="category-badge" style="background-color: ${item.categoryId && categories[item.categoryId] ? categories[item.categoryId].color : '#ccc'}">${categoryName}</span></span>
            <span>${item.price.toLocaleString()} EGP</span>
          </div>`;
            }
          )
          .join("")}
      </div>
      <div class="session-total">Total: ${total.toLocaleString()} EGP</div>
    `;
    sessionsList.appendChild(card);
  });
}

// ================================
// Upcoming Items
// ================================
function renderUpcoming() {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const items = [];
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      displayUpcoming(items);
      displayCompletedItems(items);
    }
  };
}

function toggleCompletedItems() {
  const isVisible = completedList.style.display !== 'none';
  completedList.style.display = isVisible ? 'none' : 'block';
  toggleCompletedBtn.textContent = isVisible ? 'Show Recently Completed' : 'Hide Recently Completed';
}

function displayCompletedItems(items) {
  // Get items that have intervals but no nextDueKm (completed items)
  const completed = items.filter(i => i.interval && !i.nextDueKm);
  
  if (completed.length === 0) {
    toggleCompletedBtn.style.display = 'none';
    return;
  }
  
  toggleCompletedBtn.style.display = 'block';
  completedItems.innerHTML = "";
  
  completed.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("completed-item");
    div.innerHTML = `
      <div class="completed-content">
        <div class="completed-info">
          <span class="item-name">${item.name}</span>
          <span class="interval-info">Interval: ${item.interval.toLocaleString()} km</span>
        </div>
        <div class="completed-actions">
          <button class="restore-btn" onclick="restoreUpcomingItem(${item.id})" title="Restore to Upcoming">
            ↶
          </button>
          <button class="delete-completed-btn" onclick="deleteCompletedItem(${item.id})" title="Delete from History">
            🗑
          </button>
        </div>
      </div>
    `;
    completedItems.appendChild(div);
  });
}

function displayUpcoming(items) {
  upcomingList.innerHTML = "";
  const filtered = items.filter(i => i.nextDueKm && i.interval);
  filtered.sort((a, b) => a.nextDueKm - b.nextDueKm);

  if (filtered.length === 0) {
    upcomingList.innerHTML = `
      <div class="no-upcoming">
        <div class="no-upcoming-icon">✓</div>
        <div class="no-upcoming-text">All maintenance up to date!</div>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const kmSinceService = currentOdometer - (item.nextDueKm - item.interval);
    const progressPercent = Math.min((kmSinceService / item.interval) * 100, 100);
    const kmRemaining = item.nextDueKm - currentOdometer;
    
    // Calculate status and color based on progress
    let status = "status-ok";
    let progressColor = "#16a34a"; // Green
    let urgencyText = "Good";
    
    if (progressPercent >= 100) {
      status = "status-danger";
      progressColor = "#dc2626"; // Red
      urgencyText = "Overdue";
    } else if (progressPercent >= 80) {
      status = "status-warning";
      progressColor = "#ea580c"; // Orange
      urgencyText = "Urgent";
    } else if (progressPercent >= 60) {
      status = "status-caution";
      progressColor = "#eab308"; // Yellow
      urgencyText = "Soon";
    }

    const div = document.createElement("div");
    div.classList.add("upcoming-item", status);
    
    // Create progress bar with solid color
    const progressBar = `
      <div class="progress-container">
        <div class="progress-bar" style="width: ${progressPercent}%; background: ${progressColor};">
          <div class="progress-label">${progressPercent.toFixed(0)}%</div>
        </div>
      </div>
    `;
    
    div.innerHTML = `
      <div class="upcoming-content">
        <span class="urgency-badge ${status}">${urgencyText}</span>
        <div class="upcoming-info">
          <div class="item-header-row">
            <span class="item-name">${item.name}</span>
          </div>
          <div class="item-details">
            <span class="km-info">${kmSinceService.toLocaleString()} / ${item.interval.toLocaleString()} km</span>
            <span class="next-due">Due: ${item.nextDueKm.toLocaleString()} km (${kmRemaining > 0 ? kmRemaining.toLocaleString() + ' km left' : 'Overdue'})</span>
          </div>
        </div>
        <div class="upcoming-actions">
          <button class="mark-done-btn" onclick="markMaintenanceDone(${item.id})" title="Mark as Done">
            ✓
          </button>
          <button class="edit-upcoming-btn" onclick="editUpcomingItem(${item.id})" title="Edit">
            ✎
          </button>
        </div>
      </div>
      ${progressBar}
    `;
    upcomingList.appendChild(div);
  });
}

// ================================
// Total Cost
// ================================
function renderTotalCost() {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  let total = 0;
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      total += cursor.value.price || 0;
      cursor.continue();
    } else {
      totalCostDisplay.textContent = `Total Spent: ${total.toLocaleString()} EGP`;
    }
  };
}

// ================================
// Edit / Delete
// ================================
function editSession(id) {
  const tx = db.transaction("sessions", "readonly");
  tx.objectStore("sessions").get(id).onsuccess = e => {
    const session = e.target.result;
    openModal(session);
  };
}

function loadItemsForEdit(sessionId) {
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.sessionId === sessionId) addItemField(cursor.value);
      cursor.continue();
    }
  };
}

function viewSessionDetails(id) {
  const tx = db.transaction(["sessions", "items", "categories"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");
  
  sessionStore.get(id).onsuccess = e => {
    const session = e.target.result;
    if (!session) return;
    
    // Get items for this session
    const items = [];
    itemStore.openCursor().onsuccess = e2 => {
      const cursor = e2.target.result;
      if (cursor) {
        if (cursor.value.sessionId === id) {
          items.push(cursor.value);
        }
        cursor.continue();
      } else {
        // Get categories for display
        const categories = {};
        categoryStore.openCursor().onsuccess = e3 => {
          const cursor3 = e3.target.result;
          if (cursor3) {
            categories[cursor3.value.id] = cursor3.value;
            cursor3.continue();
          } else {
            displaySessionDetails(session, items, categories);
          }
        };
      }
    };
  };
}

function displaySessionDetails(session, items, categories) {
  let detailsHTML = `
    <div class="session-details">
      <div class="detail-section">
        <h3>Session Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Date:</label>
            <span>${formatDateToBritish(session.date)}</span>
          </div>
  `;
  
  // Only show odometer if it exists and is greater than 0
  if (session.odometer && session.odometer > 0) {
    detailsHTML += `
          <div class="detail-item">
            <label>ODO:</label>
            <span>${session.odometer.toLocaleString()} km</span>
          </div>
    `;
  }
  
  // Only show merchant if it exists
  if (session.merchant) {
    detailsHTML += `
      <div class="detail-item">
        <label>Merchant/Place:</label>
        <span>${session.merchant}</span>
      </div>
    `;
  }
  
  // Only show notes if they exist
  if (session.notes) {
    detailsHTML += `
      <div class="detail-item full-width">
        <label>Notes:</label>
        <span>${session.notes}</span>
      </div>
    `;
  }
  
  detailsHTML += `
        </div>
      </div>
  `;
  
  // Add items section
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
    detailsHTML += `
      <div class="detail-section">
        <h3>Items & Services</h3>
        <div class="items-list">
    `;
    
    items.forEach(item => {
      const categoryName = item.categoryId && categories[item.categoryId] 
        ? categories[item.categoryId].name 
        : 'No Category';
      const categoryColor = item.categoryId && categories[item.categoryId] 
        ? categories[item.categoryId].color 
        : '#ccc';
      
      detailsHTML += `
        <div class="item-detail-card">
          <div class="item-header">
            <h4>${item.name || "Unnamed Item"}</h4>
            <span class="item-price">${item.price.toLocaleString()} EGP</span>
          </div>
          <div class="item-details">
            <div class="category-badge" style="background-color: ${categoryColor}">${categoryName}</div>
      `;
      
      if (item.interval) {
        detailsHTML += `
          <div class="detail-item">
            <label>Service Interval:</label>
            <span>${item.interval.toLocaleString()} km</span>
          </div>
        `;
      }
      
      if (item.nextDueKm) {
        detailsHTML += `
          <div class="detail-item">
            <label>Next Due:</label>
            <span>${item.nextDueKm.toLocaleString()} km</span>
          </div>
        `;
      }
      
      if (item.merchant) {
        detailsHTML += `
          <div class="detail-item">
            <label>Merchant:</label>
            <span>${item.merchant}</span>
          </div>
        `;
      }
      
      if (item.notes) {
        detailsHTML += `
          <div class="detail-item full-width">
            <label>Notes:</label>
            <span>${item.notes}</span>
          </div>
        `;
      }
      
      detailsHTML += `
          </div>
        </div>
      `;
    });
    
    detailsHTML += `
        </div>
        <div class="session-total-details">
          <strong>Total: ${total.toLocaleString()} EGP</strong>
        </div>
      </div>
    `;
  }
  
  detailsHTML += `</div>`;
  
  sessionDetailsContent.innerHTML = detailsHTML;
  viewDetailsModal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function markMaintenanceDone(itemId) {
  if (!confirm("Mark this maintenance as done? It will be removed from upcoming maintenance.")) return;
  
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  
  store.get(itemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      // Clear the nextDueKm to remove from upcoming maintenance
      const updatedItem = { ...item, nextDueKm: null };
      store.put(updatedItem);
      
      tx.oncomplete = () => {
        renderAll();
      };
    }
  };
}

function editUpcomingItem(itemId) {
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  
  store.get(itemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      const newInterval = prompt(`Edit service interval for "${item.name}" (current: ${item.interval} km):`, item.interval);
      
      if (newInterval && !isNaN(newInterval) && parseInt(newInterval) > 0) {
        const updatedInterval = parseInt(newInterval);
        const updatedItem = { 
          ...item, 
          interval: updatedInterval,
          nextDueKm: currentOdometer + updatedInterval
        };
        
        store.put(updatedItem);
        
        tx.oncomplete = () => {
          renderAll();
        };
      }
    }
  };
}

function restoreUpcomingItem(itemId) {
  if (!db) {
    console.error("Database not initialized");
    return;
  }
  
  const tx = db.transaction(["items", "sessions"], "readwrite");
  const itemStore = tx.objectStore("items");
  const sessionStore = tx.objectStore("sessions");
  
  itemStore.get(itemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      // Find the session where this item was performed to get the session odometer
      sessionStore.get(item.sessionId).onsuccess = sessionEvent => {
        const session = sessionEvent.target.result;
        let nextDueKm;
        
        if (session && session.odometer) {
          // Calculate next due based on the session odometer where item was performed
          nextDueKm = session.odometer + item.interval;
        } else {
          // Fallback to current odometer if session not found or no odometer
          nextDueKm = currentOdometer + item.interval;
        }
        
        // Update the item with the calculated next due km
        const updatedItem = { 
          ...item, 
          nextDueKm: nextDueKm
        };
        
        itemStore.put(updatedItem);
      };
    } else {
      console.error("Item not found:", itemId);
    }
  };
  
  tx.oncomplete = () => {
    renderAll();
  };
  
  tx.onerror = () => {
    console.error("Error restoring item:", tx.error);
    alert("Error restoring item. Please try again.");
  };
}

// Make function globally accessible
window.restoreUpcomingItem = restoreUpcomingItem;

function deleteCompletedItem(itemId) {
  if (!confirm("Are you sure you want to delete this item from history? This action cannot be undone.")) {
    return;
  }
  
  if (!db) {
    console.error("Database not initialized");
    return;
  }
  
  const tx = db.transaction("items", "readwrite");
  const itemStore = tx.objectStore("items");
  
  itemStore.delete(itemId);
  
  tx.oncomplete = () => {
    renderAll();
  };
  
  tx.onerror = () => {
    console.error("Error deleting item:", tx.error);
    alert("Error deleting item. Please try again.");
  };
}

// Make functions globally accessible
window.deleteCompletedItem = deleteCompletedItem;

function deleteSession(id) {
  if (!confirm("Delete this session permanently?")) return;
  const tx = db.transaction(["sessions", "items"], "readwrite");
  tx.objectStore("sessions").delete(id);
  const itemStore = tx.objectStore("items");
  itemStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      if (cursor.value.sessionId === id) cursor.delete();
      cursor.continue();
    }
  };
  tx.oncomplete = renderAll;
}

// ================================
// Chart Management
// ================================
function initializeCharts() {
  // Chart button event listeners (shared controls for both charts)
  const monthlyViewBtn = document.getElementById('monthlyView');
  const yearlyViewBtn = document.getElementById('yearlyView');
  const spendingMonthFilter = document.getElementById('spendingMonthFilter');
  const spendingYearFilter = document.getElementById('spendingYearFilter');

  if (monthlyViewBtn) {
    monthlyViewBtn.addEventListener('click', () => {
      currentSpendingView = 'monthly';
      currentCategoryView = 'monthly';
      updateChartButtons('monthlyView', 'yearlyView');
      if (spendingMonthFilter) spendingMonthFilter.style.display = 'inline-block';
      if (spendingYearFilter) spendingYearFilter.style.display = 'inline-block';
      updateSpendingChart();
      updateCategoryChart();
    });
  }

  if (yearlyViewBtn) {
    yearlyViewBtn.addEventListener('click', () => {
      currentSpendingView = 'yearly';
      currentCategoryView = 'yearly';
      updateChartButtons('yearlyView', 'monthlyView');
      if (spendingMonthFilter) spendingMonthFilter.style.display = 'none';
      if (spendingYearFilter) spendingYearFilter.style.display = 'inline-block';
      updateSpendingChart();
      updateCategoryChart();
    });
  }

  // Set initial filter visibility based on default view
  if (spendingMonthFilter && spendingYearFilter) {
    if (currentSpendingView === 'monthly') {
      spendingMonthFilter.style.display = 'inline-block';
      spendingYearFilter.style.display = 'inline-block';
    } else {
      spendingMonthFilter.style.display = 'none';
      spendingYearFilter.style.display = 'inline-block';
    }
  }

  // Shared filter event listeners — update both charts
  if (spendingMonthFilter) {
    spendingMonthFilter.addEventListener('change', (e) => {
      selectedSpendingMonth = e.target.value;
      selectedCategoryMonth = selectedSpendingMonth;
      updateSpendingChart();
      updateCategoryChart();
    });
  }

  if (spendingYearFilter) {
    spendingYearFilter.addEventListener('change', (e) => {
      selectedSpendingYear = e.target.value;
      selectedCategoryYear = selectedSpendingYear;
      updateSpendingChart();
      updateCategoryChart();
    });
  }

  // Initialize charts and populate filters
  populateChartFilters();
  updateSpendingChart();
  updateCategoryChart();
}

function updateChartButtons(activeId, inactiveId) {
  document.getElementById(activeId).classList.add('active');
  document.getElementById(inactiveId).classList.remove('active');
}

function updateSpendingChart() {
  const canvas = document.getElementById('spendingChart');
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  
  // Get spending data
  getSpendingData(currentSpendingView).then(data => {
    if (spendingChart) {
      spendingChart.destroy();
    }

    // Check if there's any data - handle both monthly (always 12 values) and yearly (variable length)
    const hasData = data.values && data.values.length > 0 && data.values.some(v => v > 0);
    
    // Get or create empty message element
    let emptyMsg = parent.querySelector('.chart-empty-message');
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chart-empty-message';
      parent.appendChild(emptyMsg);
    }
    
    if (!hasData) {
      // Show empty state message
      const filterText = selectedSpendingYear ? ` for ${selectedSpendingYear}` : '';
      const monthText = selectedSpendingMonth !== '' && selectedSpendingMonth !== null ? ` in ${new Date(2024, parseInt(selectedSpendingMonth)).toLocaleDateString('en-US', { month: 'long' })}` : '';
      emptyMsg.textContent = `No spending data${filterText}${monthText}`;
      emptyMsg.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

    // Hide empty message and show canvas
    emptyMsg.style.display = 'none';
    canvas.style.display = 'block';

    spendingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Spending (EGP)',
          data: data.values,
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' EGP';
              }
            }
          }
        }
      }
    });
  });
}

function updateCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  // Ensure category filters/view mirror the shared chart filters
  selectedCategoryMonth = selectedSpendingMonth;
  selectedCategoryYear = selectedSpendingYear;
  currentCategoryView = currentSpendingView;

  // Get category spending data
  getCategorySpendingData(currentCategoryView).then(data => {
    if (categoryChart) {
      categoryChart.destroy();
    }

    // Check if there's any data
    const hasData = data.values && data.values.length > 0 && data.values.some(v => v > 0);
    
    // Get or create empty message element
    let emptyMsg = parent.querySelector('.chart-empty-message');
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chart-empty-message';
      parent.appendChild(emptyMsg);
    }
    
    if (!hasData) {
      // Show empty state message
      const filterText = selectedCategoryYear ? ` for ${selectedCategoryYear}` : '';
      const monthText = selectedCategoryMonth !== '' && selectedCategoryMonth !== null ? ` in ${new Date(2024, parseInt(selectedCategoryMonth)).toLocaleDateString('en-US', { month: 'long' })}` : '';
      emptyMsg.textContent = `No category spending data${filterText}${monthText}`;
      emptyMsg.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

    // Hide empty message and show canvas
    emptyMsg.style.display = 'none';
    canvas.style.display = 'block';

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return context.label + ': ' + value.toLocaleString() + ' EGP (' + percentage + '%)';
              }
            }
          }
        }
      }
    });
  });
}

function getSpendingData(viewType) {
  return new Promise((resolve) => {
    const tx = db.transaction(["sessions", "items"], "readonly");
    const sessionStore = tx.objectStore("sessions");
    const itemStore = tx.objectStore("items");
    
    const sessions = [];
    const items = [];
    
    sessionStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        sessions.push(cursor.value);
        cursor.continue();
      } else {
        itemStore.openCursor().onsuccess = e2 => {
          const cursor2 = e2.target.result;
          if (cursor2) {
            items.push(cursor2.value);
            cursor2.continue();
          } else {
            const spendingData = processSpendingData(sessions, items, viewType, selectedSpendingMonth, selectedSpendingYear);
            resolve(spendingData);
          }
        };
      }
    };
  });
}

function getCategorySpendingData(viewType) {
  return new Promise((resolve) => {
    const tx = db.transaction(["sessions", "items", "categories"], "readonly");
    const sessionStore = tx.objectStore("sessions");
    const itemStore = tx.objectStore("items");
    const categoryStore = tx.objectStore("categories");
    
    const sessions = [];
    const items = [];
    const categories = {};
    
    let completed = 0;
    const checkComplete = () => {
      completed++;
      if (completed === 3) {
        const categoryData = processCategorySpendingData(sessions, items, categories, viewType, selectedCategoryMonth, selectedCategoryYear);
        resolve(categoryData);
      }
    };
    
    sessionStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        sessions.push(cursor.value);
        cursor.continue();
      } else {
        checkComplete();
      }
    };
    
    itemStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        items.push(cursor.value);
        cursor.continue();
      } else {
        checkComplete();
      }
    };
    
    categoryStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        categories[cursor.value.id] = cursor.value;
        cursor.continue();
      } else {
        checkComplete();
      }
    };
  });
}

function processSpendingData(sessions, items, viewType, selectedMonth = '', selectedYear = '') {
  const currentYear = new Date().getFullYear();
  const filterYear = selectedYear && selectedYear !== '' ? parseInt(selectedYear) : currentYear;

  if (viewType === 'monthly') {
    // Show only selected year's 12 months, zero-filled
    const values = new Array(12).fill(0);
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = sessionDate.getMonth();
      
      // Apply filters - only filter if values are actually set
      if (selectedYear && selectedYear !== '' && sessionYear !== filterYear) return;
      if (selectedMonth && selectedMonth !== '' && sessionMonth !== parseInt(selectedMonth)) return;
      
      const sessionItems = items.filter(item => item.sessionId === session.id);
      const totalSpending = sessionItems.reduce((sum, item) => sum + (item.price || 0), 0);
      if (totalSpending > 0) {
        values[sessionMonth] += totalSpending;
      }
    });
    const labels = Array.from({ length: 12 }, (_, m) => new Date(filterYear, m).toLocaleDateString('en-US', { month: 'short' }));
    return { labels, values };
  }

  // Yearly view: aggregate by year across all data
  const spendingByYear = {};
  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    const sessionYear = sessionDate.getFullYear();
    
    // Apply year filter if selected
    if (selectedYear && sessionYear !== filterYear) return;
    
    const sessionItems = items.filter(item => item.sessionId === session.id);
    const totalSpending = sessionItems.reduce((sum, item) => sum + (item.price || 0), 0);
    if (totalSpending > 0) {
      const yearKey = sessionYear.toString();
      spendingByYear[yearKey] = (spendingByYear[yearKey] || 0) + totalSpending;
    }
  });
  const labels = Object.keys(spendingByYear).sort();
  const values = labels.map(year => spendingByYear[year]);
  // If no data, return empty arrays instead of undefined
  if (labels.length === 0) {
    return { labels: [], values: [] };
  }
  return { labels, values };
}

function processCategorySpendingData(sessions, items, categories, viewType, selectedMonth = '', selectedYear = '') {
  const categorySpending = {};
  const currentYear = new Date().getFullYear();
  const filterYear = selectedYear && selectedYear !== '' ? parseInt(selectedYear) : currentYear;
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    const sessionYear = sessionDate.getFullYear();
    const sessionMonth = sessionDate.getMonth();
    
    // Apply filters - only filter if values are actually set
    if (viewType === 'monthly' && selectedYear && selectedYear !== '' && sessionYear !== filterYear) return;
    if (viewType === 'monthly' && selectedMonth && selectedMonth !== '' && sessionMonth !== parseInt(selectedMonth)) return;
    if (viewType === 'yearly' && selectedYear && selectedYear !== '' && sessionYear !== filterYear) return;
    
    const sessionItems = items.filter(item => item.sessionId === session.id);
    
    sessionItems.forEach(item => {
      if (item.price > 0) {
        const categoryId = item.categoryId || 'uncategorized';
        const categoryName = categoryId !== 'uncategorized' && categories[categoryId] 
          ? categories[categoryId].name 
          : 'Uncategorized';
        
        if (!categorySpending[categoryName]) {
          categorySpending[categoryName] = {
            total: 0,
            color: categoryId !== 'uncategorized' && categories[categoryId] 
              ? categories[categoryId].color 
              : '#cccccc'
          };
        }
        
        categorySpending[categoryName].total += item.price;
      }
    });
  });
  
  const sortedCategories = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b.total - a.total);
  
  const labels = sortedCategories.map(([name]) => name);
  const values = sortedCategories.map(([,data]) => data.total);
  const colors = sortedCategories.map(([,data]) => data.color);
  
  // If no data, return empty arrays instead of undefined
  if (labels.length === 0) {
    return { labels: [], values: [], colors: [] };
  }
  
  return { labels, values, colors };
}

function populateChartFilters() {
  // Get all unique years from sessions
  const tx = db.transaction("sessions", "readonly");
  const sessionStore = tx.objectStore("sessions");
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const year = new Date(cursor.value.date).getFullYear();
      years.add(year);
      cursor.continue();
    } else {
      // Add current year if no data
      if (years.size === 0) years.add(currentYear);
      
      // Populate year filters
      const spendingYearFilter = document.getElementById('spendingYearFilter');
      const categoryYearFilter = document.getElementById('categoryYearFilter');
      
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      
      if (spendingYearFilter) {
        spendingYearFilter.innerHTML = '<option value="">All Years</option>';
        sortedYears.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          if (year === currentYear) option.selected = true;
          spendingYearFilter.appendChild(option);
        });
      }
      
      if (categoryYearFilter) {
        categoryYearFilter.innerHTML = '<option value="">All Years</option>';
        sortedYears.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          if (year === currentYear) option.selected = true;
          categoryYearFilter.appendChild(option);
        });
      }
      
      // Populate month filters
      const spendingMonthFilter = document.getElementById('spendingMonthFilter');
      const categoryMonthFilter = document.getElementById('categoryMonthFilter');
      const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentYear, i);
        return { value: i, name: date.toLocaleDateString('en-US', { month: 'short' }) };
      });
      
      if (spendingMonthFilter) {
        spendingMonthFilter.innerHTML = '<option value="">All Months</option>';
        months.forEach(month => {
          const option = document.createElement('option');
          option.value = month.value;
          option.textContent = month.name;
          spendingMonthFilter.appendChild(option);
        });
      }
      
      if (categoryMonthFilter) {
        categoryMonthFilter.innerHTML = '<option value="">All Months</option>';
        months.forEach(month => {
          const option = document.createElement('option');
          option.value = month.value;
          option.textContent = month.name;
          categoryMonthFilter.appendChild(option);
        });
      }
    }
  };
}

// ================================
// Search and Pagination Functions
// ================================
function handleSearch(e) {
  searchTerm = e.target.value.toLowerCase();
  currentPage = 1;
  applyFilters();
}

function clearSearch() {
  sessionSearch.value = '';
  searchTerm = '';
  currentPage = 1;
  applyFilters();
}

function handleCategoryFilter(e) {
  selectedCategoryFilter = e.target.value;
  currentPage = 1;
  applyFilters();
}

function handleDateFilter(e) {
  selectedDateFilter = e.target.value;
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  const tx = db.transaction(["sessions", "items", "categories"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");
  
  const sessions = [];
  const items = [];
  const categories = {};
  
  let completed = 0;
  const checkComplete = () => {
    completed++;
    if (completed === 3) {
      filteredSessions = filterSessions(sessions, items, categories);
      renderSessionsWithPagination();
    }
  };
  
  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
  
  itemStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
  
  categoryStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      categories[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      checkComplete();
    }
  };
}

function filterSessions(sessions, items, categories) {
  return sessions.filter(session => {
    const sessionItems = items.filter(item => item.sessionId === session.id);
    
    // Search filter
    if (searchTerm) {
      const matchesDate = session.date.toLowerCase().includes(searchTerm);
      const matchesCategory = sessionItems.some(item => {
        const categoryName = item.categoryId && categories[item.categoryId] 
          ? categories[item.categoryId].name.toLowerCase()
          : 'no category';
        return categoryName.includes(searchTerm);
      });
      const matchesItemName = sessionItems.some(item => (item.name || '').toLowerCase().includes(searchTerm));
      const matchesMerchant = session.merchant && session.merchant.toLowerCase().includes(searchTerm);
      const matchesNotes = session.notes && session.notes.toLowerCase().includes(searchTerm);
      
      if (!matchesDate && !matchesCategory && !matchesItemName && !matchesMerchant && !matchesNotes) {
        return false;
      }
    }
    
    // Category filter
    if (selectedCategoryFilter) {
      const hasMatchingCategory = sessionItems.some(item => 
        item.categoryId && item.categoryId.toString() === selectedCategoryFilter
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }
    
    // Date filter
    if (selectedDateFilter) {
      const sessionDate = new Date(session.date);
      const now = new Date();
      
      switch (selectedDateFilter) {
        case 'last30':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (sessionDate < thirtyDaysAgo) return false;
          break;
        case 'last90':
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (sessionDate < ninetyDaysAgo) return false;
          break;
        case 'thisYear':
          if (sessionDate.getFullYear() !== now.getFullYear()) return false;
          break;
      }
    }
    
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Always sort by latest date first
}

function renderSessionsWithPagination() {
  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
  
  // Show/hide pagination controls
  if (filteredSessions.length > sessionsPerPage) {
    paginationControls.style.display = 'flex';
    updatePaginationControls(totalPages);
  } else {
    paginationControls.style.display = 'none';
  }
  
  // Render the paginated sessions
  renderSessionCardsPaginated(paginatedSessions);
}

function updatePaginationControls(totalPages) {
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
  const newPage = currentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderSessionsWithPagination();
  }
}

function renderSessionCardsPaginated(sessions) {
  const tx = db.transaction(["items", "categories"], "readonly");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");
  
  const items = [];
  const categories = {};
  
  let completed = 0;
  const checkComplete = () => {
    completed++;
    if (completed === 2) {
      displaySessionsPaginated(sessions, items, categories);
    }
  };
  
  itemStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
  
  categoryStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      categories[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      checkComplete();
    }
  };
}

function displaySessionsPaginated(sessions, items, categories) {
  sessionsList.innerHTML = "";
  
  sessions.forEach(session => {
    const relatedItems = items.filter(i => i.sessionId === session.id);
    const total = relatedItems.reduce((sum, i) => sum + (i.price || 0), 0);
    const hasMoreItems = relatedItems.length > 2;
    const visibleItems = hasMoreItems ? relatedItems.slice(0, 2) : relatedItems;
    const hiddenItems = hasMoreItems ? relatedItems.slice(2) : [];

    const card = document.createElement("div");
    card.classList.add("session-card");
    card.style.cursor = "pointer";
    card.dataset.sessionId = session.id;
    card.onclick = (e) => {
      // Don't open details if clicking on action buttons or show more button
      if (!e.target.classList.contains('edit-btn') && 
          !e.target.classList.contains('delete-btn') &&
          !e.target.classList.contains('show-more-items') &&
          !e.target.closest('.show-more-items')) {
        viewSessionDetails(session.id);
      }
    };
    
    const itemsHTML = visibleItems.map(item => {
      const categoryName = item.categoryId && categories[item.categoryId] 
        ? categories[item.categoryId].name 
        : 'No Category';
      return `
        <div class="item-row">
          <span>${item.name || "Unnamed"} <span class="category-badge" style="background-color: ${item.categoryId && categories[item.categoryId] ? categories[item.categoryId].color : '#ccc'}">${categoryName}</span></span>
          <span>${item.price.toLocaleString()} EGP</span>
        </div>`;
    }).join("");
    
    const hiddenItemsHTML = hiddenItems.map(item => {
      const categoryName = item.categoryId && categories[item.categoryId] 
        ? categories[item.categoryId].name 
        : 'No Category';
      return `
        <div class="item-row hidden-item">
          <span>${item.name || "Unnamed"} <span class="category-badge" style="background-color: ${item.categoryId && categories[item.categoryId] ? categories[item.categoryId].color : '#ccc'}">${categoryName}</span></span>
          <span>${item.price.toLocaleString()} EGP</span>
        </div>`;
    }).join("");
    
    card.innerHTML = `
      <div class="session-header">
        <h3>${formatDateToBritish(session.date)}</h3>
      </div>
      <button class="edit-btn" onclick="editSession(${session.id})">✎</button>
      <button class="delete-btn" onclick="deleteSession(${session.id})">🗑</button>
      ${session.odometer && session.odometer > 0 ? `<p><strong>ODO:</strong> ${session.odometer.toLocaleString()} km</p>` : ''}
      ${session.merchant ? `<p><strong>Merchant:</strong> ${session.merchant}</p>` : ""}
      ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ""}
      <div class="item-list">
        ${itemsHTML}
        <div class="hidden-items-container" style="display: none;">
          ${hiddenItemsHTML}
        </div>
      </div>
      ${hasMoreItems ? `<button class="show-more-items" onclick="toggleSessionItems(event, ${session.id})">Show ${hiddenItems.length} more</button>` : ''}
      <div class="session-total">Total: ${total.toLocaleString()} EGP</div>
    `;
    sessionsList.appendChild(card);
  });
}

function toggleSessionItems(event, sessionId) {
  event.stopPropagation();
  const card = document.querySelector(`[data-session-id="${sessionId}"]`);
  if (!card) return;
  
  const hiddenContainer = card.querySelector('.hidden-items-container');
  const showMoreBtn = card.querySelector('.show-more-items');
  
  if (hiddenContainer.style.display === 'none') {
    hiddenContainer.style.display = 'block';
    showMoreBtn.textContent = 'Show less';
  } else {
    hiddenContainer.style.display = 'none';
    showMoreBtn.textContent = `Show ${hiddenContainer.querySelectorAll('.item-row').length} more`;
  }
}

function loadCategoriesForFilter() {
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");
  
  // Clear existing options except "All Categories"
  categoryFilter.innerHTML = '<option value="">All Categories</option>';
  
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const option = document.createElement("option");
      option.value = cursor.value.id;
      option.textContent = cursor.value.name;
      categoryFilter.appendChild(option);
      cursor.continue();
    }
  };
}

// ================================
// Live Time Display
// ================================
function startLiveTime() {
  const liveTimeElement = document.getElementById('liveTime');
  if (!liveTimeElement) return;
  
  function updateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    liveTimeElement.textContent = `${dateStr} | ${timeStr}`;
  }
  
  updateTime();
  setInterval(updateTime, 1000);
}

// ================================
// Car Info Management
// ================================
function loadCarInfo() {
  const saved = localStorage.getItem('carInfo');
  if (saved) {
    try {
      carInfo = JSON.parse(saved);
    } catch (e) {
      console.error('Error loading car info:', e);
    }
  }
}

function saveCarInfo() {
  const manufacturer = document.getElementById('carManufacturerInput').value.trim();
  const model = document.getElementById('carModelInput').value.trim();
  const year = document.getElementById('carYearInput').value.trim();
  const plate = document.getElementById('carPlateInput').value.trim().toUpperCase();
  const color = document.getElementById('carColorInput').value;
  const licenseExpiry = document.getElementById('carLicenseExpiryInput').value;
  
  carInfo = {
    manufacturer: manufacturer || '',
    model: model || '',
    year: year || '',
    plate: plate || '',
    color: color || '#1e40af',
    licenseExpiry: licenseExpiry || ''
  };
  
  localStorage.setItem('carInfo', JSON.stringify(carInfo));
  
  const carInfoModal = document.getElementById('carInfoModal');
  if (carInfoModal) {
    carInfoModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
  
  renderCarInfo();
}

function openCarInfoModal() {
  const carInfoModal = document.getElementById('carInfoModal');
  if (!carInfoModal) return;
  
  // Populate form with current values
  document.getElementById('carManufacturerInput').value = carInfo.manufacturer || '';
  document.getElementById('carModelInput').value = carInfo.model || '';
  document.getElementById('carYearInput').value = carInfo.year || '';
  document.getElementById('carPlateInput').value = carInfo.plate || '';
  document.getElementById('carColorInput').value = carInfo.color || '#1e40af';
  document.getElementById('carLicenseExpiryInput').value = carInfo.licenseExpiry || '';
  
  carInfoModal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function renderCarInfo() {
  const manufacturerEl = document.getElementById('carManufacturer');
  const modelEl = document.getElementById('carModel');
  const yearEl = document.getElementById('carYear');
  const plateEl = document.getElementById('carPlate');
  const licenseExpiryEl = document.getElementById('carLicenseExpiry');
  const licenseExpiryBox = document.getElementById('licenseExpiryBox');
  const carInfoCard = document.getElementById('carInfoCard');
  
  if (manufacturerEl) manufacturerEl.textContent = carInfo.manufacturer || '—';
  if (modelEl) modelEl.textContent = carInfo.model || '—';
  if (yearEl) yearEl.textContent = carInfo.year || '—';
  if (plateEl) plateEl.textContent = carInfo.plate || '—';
  
  // Apply car color to background with glassy effect
  if (carInfoCard && carInfo.color) {
    // Convert hex to RGB for rgba
    const hex = carInfo.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Apply light, transparent color with glassy effect
    carInfoCard.style.background = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.15) 0%, rgba(${r}, ${g}, ${b}, 0.08) 100%)`;
  }
  
  if (licenseExpiryEl && licenseExpiryBox) {
    if (carInfo.licenseExpiry) {
      const expiryDate = new Date(carInfo.licenseExpiry);
      const formattedDate = expiryDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      licenseExpiryEl.textContent = formattedDate;
      
      // Check if expiry is coming soon and update license box color
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(carInfo.licenseExpiry);
      expiry.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      // Remove all warning classes
      licenseExpiryBox.classList.remove('license-warning-urgent', 'license-warning-soon', 'license-warning-expired');
      
      if (daysUntilExpiry < 0) {
        // Expired
        licenseExpiryBox.classList.add('license-warning-expired');
      } else if (daysUntilExpiry <= 7) {
        // Urgent - less than 7 days
        licenseExpiryBox.classList.add('license-warning-urgent');
      } else if (daysUntilExpiry <= 30) {
        // Soon - less than 30 days
        licenseExpiryBox.classList.add('license-warning-soon');
      }
    } else {
      licenseExpiryEl.textContent = '—';
      licenseExpiryBox.classList.remove('license-warning-urgent', 'license-warning-soon', 'license-warning-expired');
    }
  }
}

// ================================
// Export/Import Functions
// ================================
function exportAllData() {
  const tx = db.transaction(["sessions", "items", "categories"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");
  
  const sessions = [];
  const items = [];
  const categories = [];
  
  let completed = 0;
  const checkComplete = () => {
    completed++;
    if (completed === 3) {
      const exportData = {
        sessions,
        items,
        categories,
        currentOdometer,
        carInfo,
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `car-maintenance-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };
  
  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
  
  itemStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
  
  categoryStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      categories.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };
}

function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importData = JSON.parse(event.target.result);
      
      if (!confirm(`This will replace all existing data with the imported data. Are you sure you want to continue?`)) {
        return;
      }
      
      importAllData(importData);
    } catch (error) {
      alert('Error reading file. Please make sure it\'s a valid JSON file.');
    }
  };
  
  reader.readAsText(file);
  e.target.value = ''; // Reset file input
}

function importAllData(importData) {
  const tx = db.transaction(["sessions", "items", "categories"], "readwrite");
  
  // Clear existing data
  tx.objectStore("sessions").clear();
  tx.objectStore("items").clear();
  tx.objectStore("categories").clear();
  
  // Add imported data
  if (importData.categories) {
    importData.categories.forEach(category => {
      tx.objectStore("categories").add(category);
    });
  }
  
  if (importData.sessions) {
    importData.sessions.forEach(session => {
      tx.objectStore("sessions").add(session);
    });
  }
  
  if (importData.items) {
    importData.items.forEach(item => {
      tx.objectStore("items").add(item);
    });
  }
  
  tx.oncomplete = () => {
    if (importData.currentOdometer) {
      currentOdometer = importData.currentOdometer;
      localStorage.setItem('currentOdometer', currentOdometer.toString());
      odometerValue.textContent = `${currentOdometer.toLocaleString()} km`;
    }
    // Restore car info if present in import
    if (importData.carInfo) {
      carInfo = importData.carInfo;
      try {
        localStorage.setItem('carInfo', JSON.stringify(carInfo));
      } catch (e) {
        console.error('Failed to save imported carInfo to localStorage', e);
      }
      renderCarInfo();
    }
    
    alert('Data imported successfully!');
    renderAll();
    loadCategoriesForFilter();
    settingsModal.style.display = 'none';
  };
  
  tx.onerror = () => {
    alert('Error importing data. Please try again.');
  };
}

function resetAllData() {
  if (!confirm('Are you sure you want to reset ALL data? This action cannot be undone!')) {
    return;
  }
  
  if (!confirm('This will permanently delete all sessions, items, and categories. Type "RESET" to confirm.')) {
    return;
  }
  
  const tx = db.transaction(["sessions", "items", "categories"], "readwrite");
  
  tx.objectStore("sessions").clear();
  tx.objectStore("items").clear();
  tx.objectStore("categories").clear();
  
  tx.oncomplete = () => {
    // Reset odometer
    currentOdometer = 0;
    localStorage.setItem('currentOdometer', '0');
    odometerValue.textContent = '0 km';
    
    // Reset search and filters
    searchTerm = '';
    selectedCategoryFilter = '';
    selectedDateFilter = '';
    currentPage = 1;
    sessionSearch.value = '';
    categoryFilter.value = '';
    dateFilter.value = '';
    
    // Clear car info from memory and localStorage to fully reset user data
    carInfo = {
      manufacturer: '',
      model: '',
      year: '',
      plate: '',
      color: '#1e40af',
      licenseExpiry: ''
    };
    try {
      localStorage.removeItem('carInfo');
    } catch (e) {
      console.error('Failed to remove carInfo from localStorage', e);
    }
    renderCarInfo();

    alert('All data has been reset!');
    renderAll();
    loadCategoriesForFilter();
    settingsModal.style.display = 'none';
  };
  
  tx.onerror = () => {
    alert('Error resetting data. Please try again.');
  };
}
