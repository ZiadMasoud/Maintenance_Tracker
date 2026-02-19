// ================================
// IndexedDB Setup
// ================================
let db;
const request = indexedDB.open("carMaintainDB", 4);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  const oldVersion = e.oldVersion;
  
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
  
  // Create fuel records store (new in version 3)
  if (!db.objectStoreNames.contains("fuelRecords")) {
    const fuelStore = db.createObjectStore("fuelRecords", { keyPath: "id" });
    fuelStore.createIndex("sessionId", "sessionId", { unique: false });
    fuelStore.createIndex("date", "date", { unique: false });
    fuelStore.createIndex("odometer", "odometer", { unique: false });
  }
  
  // Create fuel sessions store (new in version 3)
  if (!db.objectStoreNames.contains("fuelSessions")) {
    const fuelSessionStore = db.createObjectStore("fuelSessions", { keyPath: "id" });
    fuelSessionStore.createIndex("vehicleId", "vehicleId", { unique: false });
  }
  
  // Create settings store (new in version 4)
  if (!db.objectStoreNames.contains("settings")) {
    db.createObjectStore("settings", { keyPath: "key" });
  }
};

request.onsuccess = function (e) {
  db = e.target.result;
  // Initialize sidebar first
  initializeSidebar();
  // Initialize odometer display
  if (odometerValue) odometerValue.textContent = `${currentOdometer.toLocaleString()}`;
  // Load car info from localStorage
  loadCarInfo();
  // Load fuel settings
  loadFuelSettings();
  // Initialize event listeners
  initializeEventListeners();
  // Ensure only the Home tab content is visible on first load
  setActiveTab('home');
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
  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    return isoDate;
  }
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function getRelativeTime(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return 'Future date';
  }

  const diffWeeks = Math.floor(daysDiff / 7);
  const diffMonths = Math.floor(daysDiff / 30);
  const diffYears = Math.floor(daysDiff / 365);

  if (daysDiff === 0) {
    return 'Today';
  } else if (daysDiff === 1) {
    return 'Yesterday';
  } else if (daysDiff === 2) {
    return '2 days ago';
  } else if (daysDiff < 7) {
    return `${daysDiff} days ago`;
  } else if (daysDiff === 7) {
    return 'Last week';
  } else if (daysDiff < 14) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  } else if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    const remainingDays = daysDiff % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return `${weeks} week${weeks > 1 ? 's' : ''} and ${remainingDays} day${remainingDays > 1 ? 's' : ''} ago`;
    }
  } else if (daysDiff < 60) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else if (daysDiff < 365) {
    const months = Math.floor(daysDiff / 30);
    const remainingDays = daysDiff % 30;
    if (remainingDays === 0) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (remainingDays < 7) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const weeks = Math.floor(remainingDays / 7);
      return `${months} month${months > 1 ? 's' : ''} and ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
  } else {
    const years = Math.floor(daysDiff / 365);
    const remainingDays = daysDiff % 365;
    const remainingMonths = Math.floor(remainingDays / 30);
    if (remainingMonths === 0) {
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else {
      return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`;
    }
  }
}

function getTimeContextColor(isoDate) {
  if (!isoDate) return 'neutral';

  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 30) {
    return 'neutral';
  } else if (daysDiff <= 90) {
    return 'warning';
  } else {
    return 'critical';
  }
}

function formatDateForTooltip(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// ================================
// Sidebar Toggle Functionality
// ================================
function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mainArea = document.getElementById('mainArea');
  
  let isCollapsed = false;
  let isMobile = window.innerWidth <= 991;

  function toggleSidebar() {
    if (isMobile) {
      // Mobile: toggle slide-in drawer
      const isOpen = sidebar.classList.contains('sidebar-open');
      
      if (isOpen) {
        sidebar.classList.remove('sidebar-open');
        mobileOverlay.classList.remove('active');
      } else {
        sidebar.classList.add('sidebar-open');
        mobileOverlay.classList.add('active');
      }
    } else {
      // Desktop: toggle collapse
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        sidebar.classList.add('sidebar-collapsed');
        mainArea.classList.add('sidebar-collapsed');
      } else {
        sidebar.classList.remove('sidebar-collapsed');
        mainArea.classList.remove('sidebar-collapsed');
      }
    }
  }

  function closeSidebar() {
    if (isMobile) {
      sidebar.classList.remove('sidebar-open');
      mobileOverlay.classList.remove('active');
    }
  }

  function handleResize() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 991;
    
    if (wasMobile !== isMobile) {
      // Reset states when switching between mobile and desktop
      sidebar.classList.remove('sidebar-open');
      mobileOverlay.classList.remove('active');
      
      if (!isMobile) {
        // Desktop mode - restore collapsed state
        if (isCollapsed) {
          sidebar.classList.add('sidebar-collapsed');
          mainArea.classList.add('sidebar-collapsed');
        }
      } else {
        // Mobile mode - remove collapsed state
        sidebar.classList.remove('sidebar-collapsed');
        mainArea.classList.remove('sidebar-collapsed');
      }
    }
  }

  // Event listeners
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeSidebar);
  }

  window.addEventListener('resize', handleResize);

  // Close sidebar when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobile && sidebar.classList.contains('sidebar-open')) {
      closeSidebar();
    }
  });

  // Initialize state
  handleResize();
}

// ================================
// Tab Switching
// ================================
function setActiveTab(target) {
  // Update sidebar nav buttons
  const tabButtons = document.querySelectorAll('.sidebar-nav .nav-link[data-tab-target]');
  tabButtons.forEach(btn => {
    const t = btn.getAttribute('data-tab-target');
    btn.classList.toggle('active', t === target);
  });

  // Update body attribute
  document.body.setAttribute('data-active-tab', target);

  // Show/hide tab content
  const tabContents = document.querySelectorAll('[data-tab-content]');
  tabContents.forEach(content => {
    const contentTab = content.getAttribute('data-tab-content');
    content.style.display = contentTab === target ? 'block' : 'none';
  });

  // Re-render fuel charts when Analytics tab is shown
  if (target === 'analytics' && typeof fuelApp !== 'undefined' && fuelApp) {
    setTimeout(() => {
      const analytics = fuelApp.getAnalytics();
      if (fuelApp.uiRenderer) {
        fuelApp.uiRenderer.renderCharts(analytics);
      }
    }, 100);
  }
}

// ================================
// Event Listeners Setup
// ================================
function initializeEventListeners() {
  // Sidebar navigation (tabs)
  const tabButtons = document.querySelectorAll('.sidebar-nav .nav-link[data-tab-target]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab-target');
      setActiveTab(target);

      if (target === 'record') {
        openRecordForm();
      } else if (target === 'settings') {
        loadCategoriesList();
      } else if (target === 'analytics') {
        // Re-render fuel charts when Analytics tab is clicked
        setTimeout(() => {
          if (typeof fuelApp !== 'undefined' && fuelApp && fuelApp.uiRenderer) {
            const analytics = fuelApp.getAnalytics();
            fuelApp.uiRenderer.renderCharts(analytics);
          }
        }, 100);
      }
      
      // Close mobile sidebar after navigation
      if (window.innerWidth <= 991) {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        sidebar.classList.remove('sidebar-open');
        mobileOverlay.classList.remove('sidebar-open');
      }
    });
  });

  // Search functionality
  if (sessionSearch) sessionSearch.addEventListener('input', handleSearch);
  if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
  if (categoryFilter) categoryFilter.addEventListener('change', handleCategoryFilter);
  if (dateFilter) dateFilter.addEventListener('change', handleDateFilter);

  // Pagination
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));

  // Export/Import functionality
  if (exportDataBtn) exportDataBtn.addEventListener('click', exportAllData);
  if (importDataBtn) importDataBtn.addEventListener('click', () => importFileInput.click());
  if (importFileInput) importFileInput.addEventListener('change', handleImportData);
  if (resetAllDataBtn) resetAllDataBtn.addEventListener('click', resetAllData);

  // Fuel settings
  if (saveFuelSettingsBtn) saveFuelSettingsBtn.addEventListener('click', saveFuelSettings);

  // Category pagination
  if (categoryPrevPageBtn) categoryPrevPageBtn.addEventListener('click', () => changeCategoryPage(-1));
  if (categoryNextPageBtn) categoryNextPageBtn.addEventListener('click', () => changeCategoryPage(1));

  // Category edit popup
  if (saveCategoryEditBtn) saveCategoryEditBtn.addEventListener('click', saveCategoryEdit);

  // Fuel pagination
  if (fuelPrevPageBtn) fuelPrevPageBtn.addEventListener('click', () => changeFuelPage(-1));
  if (fuelNextPageBtn) fuelNextPageBtn.addEventListener('click', () => changeFuelPage(1));

  // Upcoming edit popup
  if (saveUpcomingEditBtn) saveUpcomingEditBtn.addEventListener('click', saveUpcomingEdit);

  // Load categories for filter
  loadCategoriesForFilter();

  // View details modal
  if (closeViewDetailsModal) {
    closeViewDetailsModal.addEventListener('click', () => {
      viewDetailsModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
  }
  if (closeViewDetailsBtn) {
    closeViewDetailsBtn.addEventListener('click', () => {
      viewDetailsModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
  }

  // Toggle completed items
  if (toggleCompletedBtn) toggleCompletedBtn.addEventListener('click', toggleCompletedItems);

  // Upcoming pagination controls
  if (upcomingPrevPageBtn) {
    upcomingPrevPageBtn.addEventListener('click', () => changeUpcomingPage(-1));
  }
  if (upcomingNextPageBtn) {
    upcomingNextPageBtn.addEventListener('click', () => changeUpcomingPage(1));
  }

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
// Record page form elements
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

// Category management elements
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryColor = document.getElementById("newCategoryColor");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoriesList = document.getElementById("categoriesList");

// Category pagination elements
const categoryPaginationControls = document.getElementById("categoryPaginationControls");
const categoryPrevPageBtn = document.getElementById("categoryPrevPageBtn");
const categoryNextPageBtn = document.getElementById("categoryNextPageBtn");
const categoryPageInfo = document.getElementById("categoryPageInfo");

// Category edit popup elements
const categoryEditPopup = document.getElementById("categoryEditPopup");
const editCategoryName = document.getElementById("editCategoryName");
const editCategoryColor = document.getElementById("editCategoryColor");
const saveCategoryEditBtn = document.getElementById("saveCategoryEditBtn");

// Search and pagination elements
const sessionSearch = document.getElementById("sessionSearch");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const categoryFilter = document.getElementById("categoryFilter");
const dateFilter = document.getElementById("dateFilter");
const paginationControls = document.getElementById("paginationControls");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

// Upcoming maintenance pagination elements
const upcomingPaginationControls = document.getElementById("upcomingPaginationControls");
const upcomingPrevPageBtn = document.getElementById("upcomingPrevPageBtn");
const upcomingNextPageBtn = document.getElementById("upcomingNextPageBtn");
const upcomingPageInfo = document.getElementById("upcomingPageInfo");

// Fuel history pagination elements
const fuelPaginationControls = document.getElementById("fuelPaginationControls");
const fuelPrevPageBtn = document.getElementById("fuelPrevPageBtn");
const fuelNextPageBtn = document.getElementById("fuelNextPageBtn");
const fuelPageInfo = document.getElementById("fuelPageInfo");

// Upcoming edit popup elements
const upcomingEditPopup = document.getElementById("upcomingEditPopup");
const editUpcomingItemName = document.getElementById("editUpcomingItemName");
const editUpcomingInterval = document.getElementById("editUpcomingInterval");
const editUpcomingIntervalMonths = document.getElementById("editUpcomingIntervalMonths");
const saveUpcomingEditBtn = document.getElementById("saveUpcomingEditBtn");

// KPI elements
const kpiTotalSpentValue = document.getElementById("kpiTotalSpentValue");
const kpiAvgFuelValue = document.getElementById("kpiAvgFuelValue");
const kpiAvgFuelSub = document.getElementById("kpiAvgFuelSub");

// Settings page elements
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const resetAllDataBtn = document.getElementById("resetAllDataBtn");
const fuelPricePerLiterInput = document.getElementById("fuelPricePerLiter");
const saveFuelSettingsBtn = document.getElementById("saveFuelSettingsBtn");

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
let fuelPricePerLiter = parseFloat(localStorage.getItem('fuelPricePerLiter')) || 0;

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
  color: '#3b82f6',
  licenseExpiry: ''
};

// Search and pagination state
let filteredSessions = [];
let currentPage = 1;
let sessionsPerPage = 3;
let searchTerm = '';
let selectedCategoryFilter = '';
let selectedDateFilter = '';

// Category pagination state
let allCategories = [];
let categoryCurrentPage = 1;
let categoriesPerPage = 5;
let editingCategoryId = null;

// Fuel pagination state
let fuelRecordsAll = [];
let fuelCurrentPage = 1;
const fuelPerPage = 3;

// Upcoming edit state
let editingUpcomingItemId = null;

// ================================
// Fuel Settings Management
// ================================
function loadFuelSettings() {
  if (fuelPricePerLiterInput) {
    fuelPricePerLiterInput.value = fuelPricePerLiter || '';
  }
}

function saveFuelSettings() {
  const price = parseFloat(fuelPricePerLiterInput?.value);
  if (price && price > 0) {
    fuelPricePerLiter = price;
    localStorage.setItem('fuelPricePerLiter', price.toString());
    alert('Fuel settings saved successfully!');
  } else {
    alert('Please enter a valid price per liter.');
  }
}

// ================================
// Odometer Button
// ================================
if (currentOdometerBtn) {
  currentOdometerBtn.addEventListener("click", () => {
    odometerInput.value = currentOdometer;
    odometerModal.style.display = "flex";
    document.body.classList.add('modal-open');
  });
}

if (closeOdometerModal) {
  closeOdometerModal.addEventListener("click", () => {
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
  });
}

if (cancelOdometerBtn) {
  cancelOdometerBtn.addEventListener("click", () => {
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
  });
}

if (saveOdometerBtn) {
  saveOdometerBtn.addEventListener("click", () => {
    const newValue = parseInt(odometerInput.value) || 0;
    currentOdometer = newValue;
    localStorage.setItem('currentOdometer', newValue.toString());
    if (odometerValue) odometerValue.textContent = `${newValue.toLocaleString()}`;
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
    renderAll();
  });
}

// Close odometer modal when clicking outside
window.addEventListener("click", function (e) {
  if (e.target === odometerModal) {
    odometerModal.style.display = "none";
    document.body.classList.remove('modal-open');
  }
});

// ================================
// Category Management
// ================================
if (addCategoryBtn) {
  addCategoryBtn.addEventListener("click", () => {
    const name = newCategoryName.value.trim();
    const color = newCategoryColor.value;

    if (!name) {
      alert("Please enter a category name");
      return;
    }

    if (!db) {
      alert("Database not initialized. Please refresh the page.");
      return;
    }

    const category = { name, color };
    const tx = db.transaction("categories", "readwrite");
    tx.objectStore("categories").add(category);

    tx.oncomplete = () => {
      newCategoryName.value = "";
      newCategoryColor.value = "#87CEEB";
      loadCategoriesList();
      loadCategoriesForFilter();
    };

    tx.onerror = () => {
      alert("Category with this name already exists");
    };
  });
}

// ================================
// Category Pagination
// ================================
function loadCategoriesList() {
  if (!db || !categoriesList) return;
  
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");
  
  allCategories = [];
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      allCategories.push(cursor.value);
      cursor.continue();
    } else {
      renderCategoriesPage();
    }
  };
}

function renderCategoriesPage() {
  if (!categoriesList) return;
  
  categoriesList.innerHTML = "";
  
  const totalPages = Math.ceil(allCategories.length / categoriesPerPage);
  const startIndex = (categoryCurrentPage - 1) * categoriesPerPage;
  const endIndex = startIndex + categoriesPerPage;
  const pageCategories = allCategories.slice(startIndex, endIndex);
  
  pageCategories.forEach(category => {
    const categoryDiv = document.createElement("div");
    categoryDiv.classList.add("category-item");
    categoryDiv.innerHTML = `
      <div class="category-info">
        <div class="category-color" style="background-color: ${category.color}"></div>
        <span class="category-name">${category.name}</span>
      </div>
      <div class="category-actions">
        <button class="category-edit-btn" onclick="openCategoryEditPopup(${category.id})" title="Edit">✎</button>
        <button class="category-delete-btn" onclick="deleteCategory(${category.id})" title="Delete">🗑</button>
      </div>
    `;
    categoriesList.appendChild(categoryDiv);
  });
  
  // Update pagination controls
  if (categoryPaginationControls && categoryPageInfo) {
    if (totalPages > 1) {
      categoryPaginationControls.style.display = 'flex';
      categoryPageInfo.textContent = `Page ${categoryCurrentPage} of ${totalPages}`;
      if (categoryPrevPageBtn) categoryPrevPageBtn.disabled = categoryCurrentPage === 1;
      if (categoryNextPageBtn) categoryNextPageBtn.disabled = categoryCurrentPage === totalPages;
    } else {
      categoryPaginationControls.style.display = 'none';
    }
  }
}

function changeCategoryPage(direction) {
  const totalPages = Math.ceil(allCategories.length / categoriesPerPage);
  const newPage = categoryCurrentPage + direction;
  
  if (newPage >= 1 && newPage <= totalPages) {
    categoryCurrentPage = newPage;
    renderCategoriesPage();
  }
}

// ================================
// Category Edit Popup
// ================================
function openCategoryEditPopup(id) {
  if (!db) return;
  
  editingCategoryId = id;
  const tx = db.transaction("categories", "readonly");
  tx.objectStore("categories").get(id).onsuccess = e => {
    const category = e.target.result;
    if (category) {
      editCategoryName.value = category.name;
      editCategoryColor.value = category.color;
      categoryEditPopup.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };
}

function closeCategoryEditPopup() {
  categoryEditPopup.classList.remove('active');
  document.body.classList.remove('modal-open');
  editingCategoryId = null;
}

function saveCategoryEdit() {
  if (!db || !editingCategoryId) return;
  
  const newName = editCategoryName.value.trim();
  const newColor = editCategoryColor.value;
  
  if (!newName) {
    alert("Please enter a category name");
    return;
  }
  
  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");
  
  store.get(editingCategoryId).onsuccess = e => {
    const category = e.target.result;
    if (category) {
      const updatedCategory = { ...category, name: newName, color: newColor };
      store.put(updatedCategory);
    }
  };
  
  tx.oncomplete = () => {
    closeCategoryEditPopup();
    loadCategoriesList();
    loadCategoriesForFilter();
  };
  
  tx.onerror = () => {
    alert("Category with this name already exists");
  };
}

function editCategory(id) {
  openCategoryEditPopup(id);
}

function deleteCategory(id) {
  if (!confirm("Are you sure you want to delete this category? Items with this category will have no category assigned.")) return;
  if (!db) return;
  const tx = db.transaction("categories", "readwrite");
  tx.objectStore("categories").delete(id);
  tx.oncomplete = () => {
    loadCategoriesList();
    loadCategoriesForFilter();
  };
}

// ================================
// Record Page Controls
// ================================
function openRecordForm(session = null) {
  itemsContainer.innerHTML = "";
  editingSessionId = session ? session.id : null;

  if (session) {
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("sessionOdometer").value = session.odometer;
    document.getElementById("sessionMerchant").value = session.merchant || '';
    document.getElementById("sessionNotes").value = session.notes || '';
    loadItemsForEdit(session.id);
  } else {
    const today = new Date();
    const iso = today.toISOString().split("T")[0];
    document.getElementById("sessionDate").value = iso;
    document.getElementById("sessionOdometer").value = "";
    document.getElementById("sessionMerchant").value = "";
    document.getElementById("sessionNotes").value = "";
  }
}

function closeSessionModal() {
  editingSessionId = null;
}

// ================================
// Item Fields
// ================================
if (addItemBtn) {
  addItemBtn.onclick = () => addItemField();
}

function addItemField(item = {}) {
  const div = document.createElement("div");
  div.classList.add("item-form");
  div.innerHTML = `
    <div class="item-inputs">
      <input type="text" class="itemName styled-input" placeholder="Item / Service" value="${item.name || ""}">
      <input type="number" class="itemPrice styled-input" placeholder="Price (EGP)" value="${item.price || ""}">
      <input type="number" class="itemInterval styled-input" placeholder="Interval (km)" value="${item.interval || ""}">
      <input type="number" class="itemIntervalMonths styled-input" placeholder="Interval (months)" value="${item.intervalMonths || ""}" min="1">
    </div>
    <div class="item-notes">
      <select class="itemCategory styled-input">
        <option value="">Select Category</option>
      </select>
      <input type="text" class="itemMerchant styled-input" placeholder="Merchant (optional)" value="${item.merchant || ""}">
      <textarea class="itemNotes styled-input" placeholder="Notes (optional)">${item.notes || ""}</textarea>
    </div>
    <button class="delete-item-btn">✕</button>
  `;
  div.querySelector(".delete-item-btn").onclick = () => div.remove();
  itemsContainer.appendChild(div);

  loadCategoriesForSelect(div.querySelector(".itemCategory"), item.categoryId);
}

// ================================
// Category Management Functions
// ================================
function loadCategoriesForSelect(selectElement, selectedCategoryId = null) {
  if (!db || !selectElement) return;
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

// ================================
// Save Session
// ================================
if (saveSessionBtn) {
  saveSessionBtn.onclick = () => saveSession();
}

function saveSession() {
  if (!db) {
    alert("Database not initialized. Please refresh the page.");
    return;
  }

  let date = document.getElementById("sessionDate").value;

  if (!date) {
    const today = new Date();
    date = today.toISOString().split("T")[0];
  }

  const odometer = parseInt(document.getElementById("sessionOdometer").value) || 0;
  const merchant = document.getElementById("sessionMerchant").value.trim();
  const notes = document.getElementById("sessionNotes").value.trim();

  if (odometer && odometer > currentOdometer) {
    currentOdometer = odometer;
    localStorage.setItem('currentOdometer', odometer.toString());
    if (odometerValue) odometerValue.textContent = `${odometer.toLocaleString()}`;
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
    setActiveTab('home');
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
  
  if (typeof initializeCharts === 'function') {
    initializeCharts();
  }
  
  // Update fuel analytics on main dashboard
  updateFuelKPIs();
}

// ================================
// Update Fuel KPIs on Dashboard
// ================================
function updateFuelKPIs() {
  if (!db) return;
  
  const tx = db.transaction("fuelRecords", "readonly");
  const store = tx.objectStore("fuelRecords");
  const records = [];
  
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      records.push(cursor.value);
      cursor.continue();
    } else {
      // Calculate fuel analytics
      if (records.length >= 2) {
        const sortedRecords = records.sort((a, b) => a.odometer - b.odometer);
        const totalDistance = sortedRecords[sortedRecords.length - 1].odometer - sortedRecords[0].odometer;
        const totalLiters = sortedRecords.reduce((sum, r) => sum + r.liters, 0);
        const avgConsumption = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;
        
        if (kpiAvgFuelValue) {
          kpiAvgFuelValue.textContent = `${avgConsumption.toFixed(1)}`;
        }
        if (kpiAvgFuelSub) {
          kpiAvgFuelSub.textContent = 'L/100km';
        }
      } else {
        if (kpiAvgFuelValue) kpiAvgFuelValue.textContent = '—';
        if (kpiAvgFuelSub) kpiAvgFuelSub.textContent = 'L/100km';
      }
    }
  };
}

// ================================
// Render Sessions
// ================================
function renderSessions() {
  applyFilters();
}

function displaySessions(sessions, items) {
  if (!db || !sessionsList) return;
  sessionsList.innerHTML = "";
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

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
  if (!sessionsList) return;
  sessions.forEach(session => {
    const relatedItems = items.filter(i => i.sessionId === session.id);
    const total = relatedItems.reduce((sum, i) => sum + (i.price || 0), 0);

    const card = document.createElement("div");
    card.classList.add("session-card");
    card.style.cursor = "pointer";
    card.onclick = (e) => {
      if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
        viewSessionDetails(session.id);
      }
    };
    const relativeTime = getRelativeTime(session.date);
    const timeContextColor = getTimeContextColor(session.date);
    const tooltipDate = formatDateForTooltip(session.date);

    card.innerHTML = `
      <div class="session-header">
        <div class="session-header-main">
          <h3>${formatDateToBritish(session.date)}</h3>
          <span class="time-context time-context-${timeContextColor}" 
                title="Recorded on ${tooltipDate}">
            ${relativeTime}
          </span>
        </div>
      </div>
      <button class="edit-btn" onclick="event.stopPropagation(); editSession(${session.id})">✎</button>
      <button class="delete-btn" onclick="event.stopPropagation(); deleteSession(${session.id})">🗑</button>
      ${session.odometer && session.odometer > 0 ? `<p><strong>ODO:</strong> ${session.odometer.toLocaleString()} km</p>` : ''}
      ${session.merchant ? `<p><strong>Merchant:</strong> ${session.merchant}</p>` : ""}
      ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ""}
      <hr>
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
// Upcoming Items + Pagination
// ================================
let upcomingItemsAll = [];
let upcomingCurrentPage = 1;
const upcomingPerPage = 3;

function renderUpcoming() {
  if (!db) return;
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");
  const items = [];
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      items.push(cursor.value);
      cursor.continue();
    } else {
      prepareUpcomingPagination(items);
      displayCompletedItems(items);
    }
  };
}

function toggleCompletedItems() {
  if (!completedList || !toggleCompletedBtn) return;
  const isVisible = completedList.style.display !== 'none';
  completedList.style.display = isVisible ? 'none' : 'block';
  toggleCompletedBtn.textContent = isVisible ? 'Show Recently Completed' : 'Hide Recently Completed';
}

function displayCompletedItems(items) {
  if (!completedItems || !toggleCompletedBtn) return;
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
  if (!upcomingList || !db) return;
  upcomingList.innerHTML = "";
  const filtered = items.filter(i => i.nextDueKm && i.interval && i.interval > 0);
  filtered.sort((a, b) => a.nextDueKm - b.nextDueKm);

  upcomingItemsAll = filtered;
  upcomingCurrentPage = 1;
  renderUpcomingPage();
}

function prepareUpcomingPagination(items) {
  if (!upcomingList || !db) return;
  const filtered = items.filter(i => i.nextDueKm && i.interval && i.interval > 0);
  filtered.sort((a, b) => a.nextDueKm - b.nextDueKm);
  upcomingItemsAll = filtered;
  upcomingCurrentPage = 1;
  renderUpcomingPage();
}

function renderUpcomingPage() {
  if (!upcomingList || !db) return;
  upcomingList.innerHTML = "";

  if (!upcomingItemsAll || upcomingItemsAll.length === 0) {
    upcomingList.innerHTML = `
      <div class="no-upcoming">
        <div class="no-upcoming-icon">✓</div>
        <div class="no-upcoming-text">All maintenance up to date!</div>
      </div>
    `;

    if (upcomingPaginationControls) {
      upcomingPaginationControls.style.display = 'none';
    }
    return;
  }

  const totalPages = Math.ceil(upcomingItemsAll.length / upcomingPerPage);
  const startIndex = (upcomingCurrentPage - 1) * upcomingPerPage;
  const endIndex = startIndex + upcomingPerPage;
  const pageItems = upcomingItemsAll.slice(startIndex, endIndex);

  const tx = db.transaction("sessions", "readonly");
  const sessionStore = tx.objectStore("sessions");
  const sessions = {};

  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      pageItems.forEach(item => {
        if (!item.interval || item.interval <= 0) return;

        const kmSinceService = currentOdometer - (item.nextDueKm - item.interval);
        const progressPercent = Math.min(Math.max((kmSinceService / item.interval) * 100, 0), 100);
        const kmRemaining = item.nextDueKm - currentOdometer;

        let status = "status-ok";
        let progressColor = "#10b981";
        let urgencyText = "Good";

        if (progressPercent >= 100) {
          status = "status-danger";
          progressColor = "#ef4444";
          urgencyText = "Overdue";
        } else if (progressPercent >= 80) {
          status = "status-warning";
          progressColor = "#f59e0b";
          urgencyText = "Urgent";
        } else if (progressPercent >= 60) {
          status = "status-caution";
          progressColor = "#f59e0b";
          urgencyText = "Soon";
        }

        const session = sessions[item.sessionId];
        const sessionDate = session ? session.date : null;
        const relativeTime = sessionDate ? getRelativeTime(sessionDate) : '';
        const timeContextColor = sessionDate ? getTimeContextColor(sessionDate) : 'neutral';
        const tooltipDate = sessionDate ? formatDateForTooltip(sessionDate) : '';

        const div = document.createElement("div");
        div.classList.add("upcoming-item", status);

        const progressBar = `
          <div class="progress-container">
            <div class="progress-bar" style="width: ${progressPercent}%; background: ${progressColor};">
            </div>
          </div>
        `;

        div.innerHTML = `
          <div class="upcoming-content">
            <span class="urgency-badge ${status}">${urgencyText}</span>
            <div class="upcoming-info">
              <div class="item-header-row">
                <span class="item-name">${item.name}</span>
                ${relativeTime ? `<span class="time-context time-context-${timeContextColor}" title="Recorded on ${tooltipDate}">${relativeTime}</span>` : ''}
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

      if (upcomingPaginationControls && upcomingPageInfo && upcomingPrevPageBtn && upcomingNextPageBtn) {
        if (totalPages > 1) {
          upcomingPaginationControls.style.display = 'flex';
          upcomingPageInfo.textContent = `Page ${upcomingCurrentPage} of ${totalPages}`;
          upcomingPrevPageBtn.disabled = upcomingCurrentPage === 1;
          upcomingNextPageBtn.disabled = upcomingCurrentPage === totalPages;
        } else {
          upcomingPaginationControls.style.display = 'none';
        }
      }
    }
  };
}

function changeUpcomingPage(direction) {
  const totalPages = Math.ceil((upcomingItemsAll || []).length / upcomingPerPage);
  const newPage = upcomingCurrentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    upcomingCurrentPage = newPage;
    renderUpcomingPage();
  }
}

// ================================
// Total Cost (Including Fuel)
// ================================
function renderTotalCost() {
  if (!db) return;
  
  let maintenanceTotal = 0;
  let fuelTotal = 0;
  
  const tx = db.transaction(["items", "fuelRecords"], "readonly");
  const itemStore = tx.objectStore("items");
  const fuelStore = tx.objectStore("fuelRecords");
  
  itemStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      maintenanceTotal += cursor.value.price || 0;
      cursor.continue();
    } else {
      // Now get fuel total
      fuelStore.openCursor().onsuccess = e2 => {
        const cursor2 = e2.target.result;
        if (cursor2) {
          fuelTotal += cursor2.value.totalCost || 0;
          cursor2.continue();
        } else {
          const total = maintenanceTotal + fuelTotal;
          const formatted = total.toLocaleString();
          if (kpiTotalSpentValue) kpiTotalSpentValue.textContent = formatted;
        }
      };
    }
  };
}

// ================================
// Edit / Delete
// ================================
function editSession(id) {
  if (!db) return;
  const tx = db.transaction("sessions", "readonly");
  tx.objectStore("sessions").get(id).onsuccess = e => {
    const session = e.target.result;
    setActiveTab('record');
    openRecordForm(session);
  };
}

function loadItemsForEdit(sessionId) {
  if (!db) return;
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
  if (!db) return;
  const tx = db.transaction(["sessions", "items", "categories"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");

  sessionStore.get(id).onsuccess = e => {
    const session = e.target.result;
    if (!session) return;

    const items = [];
    itemStore.openCursor().onsuccess = e2 => {
      const cursor = e2.target.result;
      if (cursor) {
        if (cursor.value.sessionId === id) {
          items.push(cursor.value);
        }
        cursor.continue();
      } else {
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

  if (session.odometer && session.odometer > 0) {
    detailsHTML += `
          <div class="detail-item">
            <label>ODO:</label>
            <span>${session.odometer.toLocaleString()} km</span>
          </div>
    `;
  }

  if (session.merchant) {
    detailsHTML += `
      <div class="detail-item">
        <label>Merchant/Place:</label>
        <span>${session.merchant}</span>
      </div>
    `;
  }

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
  if (!db) return;
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");

  store.get(itemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      const updatedItem = { ...item, nextDueKm: null };
      store.put(updatedItem);

      tx.oncomplete = () => {
        renderAll();
      };
    }
  };
}

function editUpcomingItem(itemId) {
  if (!db) return;
  const tx = db.transaction("items", "readonly");
  const store = tx.objectStore("items");

  store.get(itemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      editingUpcomingItemId = itemId;
      editUpcomingItemName.value = item.name;
      editUpcomingInterval.value = item.interval || '';
      editUpcomingIntervalMonths.value = item.intervalMonths || '';
      upcomingEditPopup.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };
}

function closeUpcomingEditPopup() {
  upcomingEditPopup.classList.remove('active');
  document.body.classList.remove('modal-open');
  editingUpcomingItemId = null;
}

function saveUpcomingEdit() {
  if (!db || !editingUpcomingItemId) return;
  
  const newInterval = parseInt(editUpcomingInterval.value);
  const newIntervalMonths = parseInt(editUpcomingIntervalMonths.value) || null;
  
  if (!newInterval || isNaN(newInterval) || newInterval <= 0) {
    alert('Please enter a valid service interval');
    return;
  }
  
  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  
  store.get(editingUpcomingItemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      const updatedItem = {
        ...item,
        interval: newInterval,
        intervalMonths: newIntervalMonths,
        nextDueKm: currentOdometer + newInterval
      };
      store.put(updatedItem);
    }
  };
  
  tx.oncomplete = () => {
    closeUpcomingEditPopup();
    renderAll();
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
      sessionStore.get(item.sessionId).onsuccess = sessionEvent => {
        const session = sessionEvent.target.result;
        let nextDueKm;

        if (session && session.odometer) {
          nextDueKm = session.odometer + item.interval;
        } else {
          nextDueKm = currentOdometer + item.interval;
        }

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

function deleteSession(id) {
  if (!confirm("Delete this session permanently?")) return;
  if (!db) return;
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

  if (spendingMonthFilter && spendingYearFilter) {
    if (currentSpendingView === 'monthly') {
      spendingMonthFilter.style.display = 'inline-block';
      spendingYearFilter.style.display = 'inline-block';
    } else {
      spendingMonthFilter.style.display = 'none';
      spendingYearFilter.style.display = 'inline-block';
    }
  }

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

  populateChartFilters();
  updateSpendingChart();
  updateCategoryChart();
}

function updateChartButtons(activeId, inactiveId) {
  const activeBtn = document.getElementById(activeId);
  const inactiveBtn = document.getElementById(inactiveId);
  if (activeBtn) activeBtn.classList.add('active');
  if (inactiveBtn) inactiveBtn.classList.remove('active');
}

function updateSpendingChart() {
  const canvas = document.getElementById('spendingChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  if (!parent) return;

  getSpendingData(currentSpendingView).then(data => {
    if (spendingChart) {
      spendingChart.destroy();
    }

    const hasData = data.values && data.values.length > 0 && data.values.some(v => v > 0);

    let emptyMsg = parent.querySelector('.chart-empty-message');
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chart-empty-message';
      parent.appendChild(emptyMsg);
    }

    if (!hasData) {
      const filterText = selectedSpendingYear ? ` for ${selectedSpendingYear}` : '';
      const monthText = selectedSpendingMonth !== '' && selectedSpendingMonth !== null ? ` in ${new Date(2024, parseInt(selectedSpendingMonth)).toLocaleDateString('en-US', { month: 'long' })}` : '';
      emptyMsg.textContent = `No spending data${filterText}${monthText}`;
      emptyMsg.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

    emptyMsg.style.display = 'none';
    canvas.style.display = 'block';

    spendingChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Spending (EGP)',
          data: data.values,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
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
              callback: function (value) {
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
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  if (!parent) return;

  selectedCategoryMonth = selectedSpendingMonth;
  selectedCategoryYear = selectedSpendingYear;
  currentCategoryView = currentSpendingView;

  getCategorySpendingData(currentCategoryView).then(data => {
    if (categoryChart) {
      categoryChart.destroy();
    }

    const hasData = data.values && data.values.length > 0 && data.values.some(v => v > 0);

    let emptyMsg = parent.querySelector('.chart-empty-message');
    if (!emptyMsg) {
      emptyMsg = document.createElement('div');
      emptyMsg.className = 'chart-empty-message';
      parent.appendChild(emptyMsg);
    }

    if (!hasData) {
      const filterText = selectedCategoryYear ? ` for ${selectedCategoryYear}` : '';
      const monthText = selectedCategoryMonth !== '' && selectedCategoryMonth !== null ? ` in ${new Date(2024, parseInt(selectedCategoryMonth)).toLocaleDateString('en-US', { month: 'long' })}` : '';
      emptyMsg.textContent = `No category spending data${filterText}${monthText}`;
      emptyMsg.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

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
              label: function (context) {
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
    if (!db) {
      resolve({ labels: [], values: [] });
      return;
    }
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
    if (!db) {
      resolve({ labels: [], values: [], colors: [] });
      return;
    }
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
    const values = new Array(12).fill(0);
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = sessionDate.getMonth();

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

  const spendingByYear = {};
  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    const sessionYear = sessionDate.getFullYear();

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
    .sort(([, a], [, b]) => b.total - a.total);

  const labels = sortedCategories.map(([name]) => name);
  const values = sortedCategories.map(([, data]) => data.total);
  const colors = sortedCategories.map(([, data]) => data.color);

  if (labels.length === 0) {
    return { labels: [], values: [], colors: [] };
  }
  return { labels, values, colors };
}

function populateChartFilters() {
  if (!db) return;
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
      if (years.size === 0) years.add(currentYear);

      const spendingYearFilter = document.getElementById('spendingYearFilter');

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

      const spendingMonthFilter = document.getElementById('spendingMonthFilter');
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
  if (!db) return;
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

    if (selectedCategoryFilter) {
      const hasMatchingCategory = sessionItems.some(item =>
        item.categoryId && item.categoryId.toString() === selectedCategoryFilter
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

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
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderSessionsWithPagination() {
  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  if (filteredSessions.length > sessionsPerPage) {
    paginationControls.style.display = 'flex';
    updatePaginationControls(totalPages);
  } else {
    paginationControls.style.display = 'none';
  }

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
  if (!db) return;
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

    const relativeTime = getRelativeTime(session.date);
    const timeContextColor = getTimeContextColor(session.date);
    const tooltipDate = formatDateForTooltip(session.date);

    card.innerHTML = `
      <div class="session-header">
        <div class="session-header-main">
          <h3>${formatDateToBritish(session.date)}</h3>
          <span class="time-context time-context-${timeContextColor}" 
                title="Recorded on ${tooltipDate}">
            ${relativeTime}
          </span>
        </div>
      </div>
      <button class="edit-btn" onclick="event.stopPropagation(); editSession(${session.id})">✎</button>
      <button class="delete-btn" onclick="event.stopPropagation(); deleteSession(${session.id})">🗑</button>
      ${session.odometer && session.odometer > 0 ? `<p><strong>ODO:</strong> ${session.odometer.toLocaleString()} km</p>` : ''}
      ${session.merchant ? `<p><strong>Merchant:</strong> ${session.merchant}</p>` : ""}
      ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ""}
      <div class="item-list">
        ${itemsHTML}
        <div class="hidden-items-container" style="display: none;">
          ${hiddenItemsHTML}
        </div>
      </div>
      ${hasMoreItems ? `<button class="show-more-items" onclick="event.stopPropagation(); toggleSessionItems(event, ${session.id})">Show ${hiddenItems.length} more</button>` : ''}
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
  if (!db || !categoryFilter) return;
  const tx = db.transaction("categories", "readonly");
  const store = tx.objectStore("categories");

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
    color: color || '#3b82f6',
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

  document.getElementById('carManufacturerInput').value = carInfo.manufacturer || '';
  document.getElementById('carModelInput').value = carInfo.model || '';
  document.getElementById('carYearInput').value = carInfo.year || '';
  document.getElementById('carPlateInput').value = carInfo.plate || '';
  document.getElementById('carColorInput').value = carInfo.color || '#3b82f6';
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

  if (carInfoCard && carInfo.color) {
    const hex = carInfo.color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    carInfoCard.style.background = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.08) 0%, rgba(${r}, ${g}, ${b}, 0.03) 100%)`;
    carInfoCard.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(carInfo.licenseExpiry);
      expiry.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

      licenseExpiryBox.classList.remove('license-warning-urgent', 'license-warning-soon', 'license-warning-expired');

      if (daysUntilExpiry < 0) {
        licenseExpiryBox.classList.add('license-warning-expired');
      } else if (daysUntilExpiry <= 7) {
        licenseExpiryBox.classList.add('license-warning-urgent');
      } else if (daysUntilExpiry <= 30) {
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
  if (!db) {
    alert("Database not initialized. Please refresh the page.");
    return;
  }
  const tx = db.transaction(["sessions", "items", "categories", "fuelRecords", "fuelSessions"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");
  const fuelRecordStore = tx.objectStore("fuelRecords");
  const fuelSessionStore = tx.objectStore("fuelSessions");

  const sessions = [];
  const items = [];
  const categories = [];
  const fuelRecords = [];
  const fuelSessions = [];

  let completed = 0;
  const checkComplete = () => {
    completed++;
    if (completed === 5) {
      const exportData = {
        sessions,
        items,
        categories,
        fuelRecords,
        fuelSessions,
        currentOdometer,
        fuelPricePerLiter,
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

  fuelRecordStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      fuelRecords.push(cursor.value);
      cursor.continue();
    } else {
      checkComplete();
    }
  };

  fuelSessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      fuelSessions.push(cursor.value);
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
  reader.onload = function (event) {
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
  e.target.value = '';
}

function importAllData(importData) {
  if (!db) {
    alert("Database not initialized. Please refresh the page.");
    return;
  }
  const tx = db.transaction(["sessions", "items", "categories", "fuelRecords", "fuelSessions"], "readwrite");

  tx.objectStore("sessions").clear();
  tx.objectStore("items").clear();
  tx.objectStore("categories").clear();
  tx.objectStore("fuelRecords").clear();
  tx.objectStore("fuelSessions").clear();

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

  if (importData.fuelRecords) {
    importData.fuelRecords.forEach(record => {
      tx.objectStore("fuelRecords").add(record);
    });
  }

  if (importData.fuelSessions) {
    importData.fuelSessions.forEach(session => {
      tx.objectStore("fuelSessions").add(session);
    });
  }

  tx.oncomplete = () => {
    if (importData.currentOdometer) {
      currentOdometer = importData.currentOdometer;
      localStorage.setItem('currentOdometer', currentOdometer.toString());
      if (odometerValue) odometerValue.textContent = `${currentOdometer.toLocaleString()}`;
    }
    
    if (importData.fuelPricePerLiter) {
      fuelPricePerLiter = importData.fuelPricePerLiter;
      localStorage.setItem('fuelPricePerLiter', fuelPricePerLiter.toString());
      loadFuelSettings();
    }
    
    if (importData.carInfo) {
      carInfo = importData.carInfo;
      try {
        localStorage.setItem('carInfo', JSON.stringify(carInfo));
      } catch (e) {
        console.error('Failed to save imported carInfo to localStorage', e);
      }
      renderCarInfo();
    }

    // Reload fuel analytics if fuel app is initialized
    if (typeof fuelApp !== 'undefined' && fuelApp) {
      fuelApp.stateManager.loadSession('default');
    }

    alert('Data imported successfully!');
    renderAll();
    loadCategoriesForFilter();
  };

  tx.onerror = () => {
    alert('Error importing data. Please try again.');
  };
}

function resetAllData() {
  if (!confirm('Are you sure you want to reset ALL data? This action cannot be undone!')) {
    return;
  }

  if (!confirm('This will permanently delete all sessions, items, categories, and fuel records. Type "RESET" to confirm.')) {
    return;
  }

  if (!db) {
    alert("Database not initialized. Please refresh the page.");
    return;
  }

  const tx = db.transaction(["sessions", "items", "categories", "fuelRecords", "fuelSessions"], "readwrite");

  tx.objectStore("sessions").clear();
  tx.objectStore("items").clear();
  tx.objectStore("categories").clear();
  tx.objectStore("fuelRecords").clear();
  tx.objectStore("fuelSessions").clear();

  tx.oncomplete = () => {
    currentOdometer = 0;
    localStorage.setItem('currentOdometer', '0');
    if (odometerValue) odometerValue.textContent = '0';
    
    fuelPricePerLiter = 0;
    localStorage.setItem('fuelPricePerLiter', '0');
    loadFuelSettings();

    searchTerm = '';
    selectedCategoryFilter = '';
    selectedDateFilter = '';
    currentPage = 1;
    sessionSearch.value = '';
    categoryFilter.value = '';
    dateFilter.value = '';

    carInfo = {
      manufacturer: '',
      model: '',
      year: '',
      plate: '',
      color: '#3b82f6',
      licenseExpiry: ''
    };
    try {
      localStorage.removeItem('carInfo');
    } catch (e) {
      console.error('Failed to remove carInfo from localStorage', e);
    }
    renderCarInfo();

    // Reset fuel analytics
    if (typeof fuelApp !== 'undefined' && fuelApp) {
      fuelApp.stateManager.loadSession('default');
    }

    alert('All data has been reset!');
    renderAll();
    loadCategoriesForFilter();
  };

  tx.onerror = () => {
    alert('Error resetting data. Please try again.');
  };
}

// ================================
// Fuel Pagination Functions
// ================================
function renderFuelHistoryPaginated(records) {
  const container = document.getElementById('fuelHistoryList');
  if (!container) return;

  fuelRecordsAll = records.sort((a, b) => new Date(b.date) - new Date(a.date));
  fuelCurrentPage = 1;
  renderFuelPage();
}

function renderFuelPage() {
  const container = document.getElementById('fuelHistoryList');
  if (!container) return;

  if (!fuelRecordsAll || fuelRecordsAll.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⛽</div>
        <p>No fuel entries yet</p>
        <span>Record your first fuel refill to see analytics</span>
      </div>
    `;
    if (fuelPaginationControls) fuelPaginationControls.style.display = 'none';
    return;
  }

  const totalPages = Math.ceil(fuelRecordsAll.length / fuelPerPage);
  const startIndex = (fuelCurrentPage - 1) * fuelPerPage;
  const endIndex = startIndex + fuelPerPage;
  const pageRecords = fuelRecordsAll.slice(startIndex, endIndex);

  container.innerHTML = pageRecords.map(record => `
    <div class="fuel-history-item" data-record-id="${record.id}">
      <div class="fuel-history-main">
        <div class="fuel-history-date">
          <span class="date">${formatDateToBritish(record.date)}</span>
          ${record.isFullTank ? '<span class="full-tank-badge">Full Tank</span>' : ''}
        </div>
        <div class="fuel-history-details">
          <span class="odometer">${parseFloat(record.odometer).toLocaleString()} km</span>
          <span class="liters">${parseFloat(record.liters).toFixed(2)} L</span>
          <span class="price">${parseFloat(record.pricePerLiter).toFixed(2)} EGP/L</span>
        </div>
      </div>
      <div class="fuel-history-cost">
        <span class="total">${parseFloat(record.totalCost).toLocaleString()} EGP</span>
      </div>
      <div class="fuel-history-actions">
        <button class="edit-btn" onclick="editFuelRecord('${record.id}')" title="Edit">✎</button>
        <button class="delete-btn" onclick="deleteFuelRecord('${record.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');

  if (fuelPaginationControls && fuelPageInfo && fuelPrevPageBtn && fuelNextPageBtn) {
    if (totalPages > 1) {
      fuelPaginationControls.style.display = 'flex';
      fuelPageInfo.textContent = `Page ${fuelCurrentPage} of ${totalPages}`;
      fuelPrevPageBtn.disabled = fuelCurrentPage === 1;
      fuelNextPageBtn.disabled = fuelCurrentPage === totalPages;
    } else {
      fuelPaginationControls.style.display = 'none';
    }
  }
}

function changeFuelPage(direction) {
  const totalPages = Math.ceil((fuelRecordsAll || []).length / fuelPerPage);
  const newPage = fuelCurrentPage + direction;
  if (newPage >= 1 && newPage <= totalPages) {
    fuelCurrentPage = newPage;
    renderFuelPage();
  }
}

function editFuelRecord(recordId) {
  if (typeof fuelApp !== 'undefined' && fuelApp) {
    fuelApp.editRecord(recordId);
  }
}

function deleteFuelRecord(recordId) {
  if (typeof fuelApp !== 'undefined' && fuelApp) {
    fuelApp.deleteRecord(recordId);
  }
}

// ================================
// Global Function Exports
// ================================
window.restoreUpcomingItem = restoreUpcomingItem;
window.editSession = editSession;
window.deleteSession = deleteSession;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.markMaintenanceDone = markMaintenanceDone;
window.editUpcomingItem = editUpcomingItem;
window.toggleSessionItems = toggleSessionItems;
window.openCarInfoModal = openCarInfoModal;
window.deleteCompletedItem = deleteCompletedItem;
window.openCategoryEditPopup = openCategoryEditPopup;
window.closeCategoryEditPopup = closeCategoryEditPopup;
window.saveCategoryEdit = saveCategoryEdit;
window.closeUpcomingEditPopup = closeUpcomingEditPopup;
window.saveUpcomingEdit = saveUpcomingEdit;
window.editFuelRecord = editFuelRecord;
window.deleteFuelRecord = deleteFuelRecord;
