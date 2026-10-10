// ================================
// Floating Card Component
// ================================
class FloatingCard {
  constructor() {
    this.card = document.getElementById('floatingCard');
    this.title = document.getElementById('floatingCardTitle');
    this.message = document.getElementById('floatingCardMessage');
    this.input = document.getElementById('floatingCardInput');
    this.cancelBtn = document.getElementById('floatingCardCancel');
    this.confirmBtn = document.getElementById('floatingCardConfirm');
    this.closeBtn = document.getElementById('floatingCardClose');
    this.overlay = this.card?.querySelector('.floating-card-overlay');
    
    this.resolve = null;
    this.reject = null;
    this.isInitialized = false;
    
    // Try to initialize immediately
    this.tryInitialize();
    
    // Also try when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.tryInitialize());
    }
  }
  
  tryInitialize() {
    if (this.isInitialized) return;
    
    // Check if all required elements exist
    if (!this.card || !this.title || !this.message || !this.cancelBtn || !this.confirmBtn || !this.closeBtn) {
      return; // Elements not ready yet
    }
    
    this.isInitialized = true;
    this.initializeEventListeners();
  }
  
  initializeEventListeners() {
    if (!this.closeBtn || !this.cancelBtn || !this.confirmBtn) {
      console.error('Missing buttons for event listeners');
      return;
    }
    
    // Remove existing listeners to prevent duplicates
    this.closeBtn.removeEventListener('click', this.hideHandler);
    this.cancelBtn.removeEventListener('click', this.hideHandler);
    this.confirmBtn.removeEventListener('click', this.confirmHandler);
    if (this.overlay) {
      this.overlay.removeEventListener('click', this.hideHandler);
    }
    
    // Bind handlers to maintain context
    this.hideHandler = () => {
      this.hide();
    };
    
    this.confirmHandler = () => {
      this.confirm();
    };
    
    // Add new listeners
    this.closeBtn.addEventListener('click', this.hideHandler);
    this.cancelBtn.addEventListener('click', this.hideHandler);
    this.confirmBtn.addEventListener('click', this.confirmHandler);
    if (this.overlay) {
      this.overlay.addEventListener('click', this.hideHandler);
    }
    
    // Close on Escape key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.card && this.card.style.display !== 'none') {
        this.hide();
      }
    };
    
    document.addEventListener('keydown', this.escapeHandler);
  }
  
  show(options = {}) {
    console.log('FloatingCard.show() called with:', options);
    console.log('isInitialized:', this.isInitialized);
    console.log('Elements:', {
      card: !!this.card,
      title: !!this.title,
      message: !!this.message,
      cancelBtn: !!this.cancelBtn,
      confirmBtn: !!this.confirmBtn
    });
    
    return new Promise((resolve, reject) => {
      // Ensure initialization
      if (!this.isInitialized) {
        console.log('Trying to initialize floating card...');
        this.tryInitialize();
        if (!this.isInitialized) {
          console.error('Floating card: Cannot initialize - DOM elements not found');
          // Fallback to native dialogs
          const { type = 'confirm', message = '', title = '' } = options;
          if (type === 'alert') {
            alert(message);
            resolve();
          } else {
            resolve(confirm(message) ? 'true' : null);
          }
          return;
        }
      }
      
      console.log('Floating card initialized, showing modal...');
      this.resolve = resolve;
      this.reject = reject;
      
      const {
        title = 'Confirm',
        message = 'Are you sure?',
        type = 'confirm', // 'alert' or 'confirm'
        confirmText = 'OK',
        cancelText = 'Cancel',
        requireInput = false,
        inputPlaceholder = 'Type to confirm',
        inputValue = ''
      } = options;
      
      // Store the type and requireInput for later use in confirm()
      this.currentType = type;
      this.requireInput = !!requireInput;
      
      // Set content
      this.title.textContent = title;
      this.message.textContent = message;
      this.confirmBtn.textContent = confirmText;
      this.cancelBtn.textContent = cancelText;
      
      // Handle input field
      if (requireInput && this.input) {
        this.input.style.display = 'block';
        this.input.placeholder = inputPlaceholder;
        this.input.value = inputValue;
        this.input.focus();
      } else if (this.input) {
        this.input.style.display = 'none';
      }
      
      // Handle alert mode (hide cancel button)
      if (type === 'alert') {
        this.cancelBtn.style.display = 'none';
        this.confirmBtn.style.backgroundColor = '';
      } else {
        this.cancelBtn.style.display = 'block';
      }
      
      // Show card
      this.card.style.display = 'flex';
      document.body.classList.add('modal-open');
      
      // Focus management
      setTimeout(() => {
        if (requireInput && this.input) {
          this.input.focus();
        } else {
          this.confirmBtn.focus();
        }
      }, 100);
    });
  }
  
  hide() {
    if (!this.card) {
      return;
    }
    
    this.card.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (this.input) this.input.value = '';
    
    if (this.reject) {
      console.log('Rejecting with false');
      this.reject(false);
      this.resolve = null;
      this.reject = null;
    }
  }
  
  confirm() {
    if (!this.card) {
      return;
    }
    
    this.card.style.display = 'none';
    document.body.classList.remove('modal-open');
    const inputValue = this.input ? this.input.value : '';
    if (this.input) this.input.value = '';
    
    if (this.resolve) {
      let result;
      if (this.currentType === 'alert') {
        result = undefined; // Alerts don't need a return value
      } else if (this.requireInput && this.input) {
        result = inputValue; // Input dialogs return the input value
      } else {
        result = true; // Confirm dialogs return true
      }
      
      console.log('Resolving with:', result);
      this.resolve(result);
      this.resolve = null;
      this.reject = null;
    }
  }
}

// Initialize floating card immediately
const floatingCard = new FloatingCard();

// Global functions to replace alert and confirm
function showAlert(message, title = 'Alert') {
  return floatingCard.show({
    title,
    message,
    type: 'alert',
    confirmText: 'OK'
  });
}

function showConfirm(message, title = 'Confirm', options = {}) {
  return floatingCard.show({
    title,
    message,
    type: 'confirm',
    ...options
  });
}

// Validate data before saving to prevent corruption
function validateSessionData(session) {
  if (!session || typeof session !== 'object') return false;
  if (!session.date || !/^\d{4}-\d{2}-\d{2}$/.test(session.date)) return false;
  if (session.odometer !== undefined && (typeof session.odometer !== 'number' || session.odometer < 0)) return false;
  return true;
}

function validateItemData(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.name || typeof item.name !== 'string') return false;
  if (item.price !== undefined && (typeof item.price !== 'number' || item.price < 0)) return false;
  if (item.interval !== undefined && (typeof item.interval !== 'number' || item.interval < 0)) return false;
  return true;
}

// ================================
// Auto Backup System
// ================================
// Automatically backup data before critical operations
let lastAutoBackup = null;
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

async function autoBackupData() {
  const now = Date.now();
  // Only backup if 24 hours have passed since last backup
  if (lastAutoBackup && now - lastAutoBackup < AUTO_BACKUP_INTERVAL) {
    return;
  }
  
  try {
    const data = await exportAllDataInternal();
    const backupKey = `auto_backup_${new Date().toISOString().split('T')[0]}`;
    localStorage.setItem(backupKey, JSON.stringify(data));
    lastAutoBackup = now;
    console.log("Auto backup created:", backupKey);
    
    // Keep only last 7 backups
    const keys = Object.keys(localStorage).filter(k => k.startsWith('auto_backup_'));
    if (keys.length > 7) {
      keys.sort().slice(0, keys.length - 7).forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.error("Auto backup failed:", e);
  }
}

// Restore from auto backup
function restoreFromAutoBackup() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('auto_backup_'));
  if (keys.length === 0) {
    showAlert("No auto backups found");
    return;
  }
  
  keys.sort();
  const latestBackup = keys[keys.length - 1];
  const backupData = localStorage.getItem(latestBackup);
  
  if (backupData) {
    showConfirm(`Restore from backup: ${latestBackup.replace('auto_backup_', '')}?`).then(confirmed => {
      if (confirmed) {
        try {
          const data = JSON.parse(backupData);
          importDataInternal(data);
          showAlert("Backup restored successfully");
        } catch (e) {
          showAlert("Failed to restore backup");
        }
      }
    });
  }
}

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
function closeMoreTabsCard() {
  document.getElementById('moreTabsCard')?.classList.remove('show');
}

function setActiveTab(target) {
  // Update sidebar nav buttons
  const tabButtons = document.querySelectorAll('.sidebar-nav .nav-link[data-tab-target]');
  tabButtons.forEach(btn => {
    const t = btn.getAttribute('data-tab-target');
    btn.classList.toggle('active', t === target);
  });

  // Update mobile bottom navigation
  const mobileNavItems = document.querySelectorAll('.mobile-bottom-nav-item[data-tab-target]');
  mobileNavItems.forEach(item => {
    const t = item.getAttribute('data-tab-target');
    item.classList.toggle('active', t === target);
  });

  // Update body attribute
  document.body.setAttribute('data-active-tab', target);

  // Update page title
  const pageTitles = {
    'home': 'Dashboard',
    'analytics': 'Analytics',
    'fuel': 'Fuel',
    'finance': 'Finance',
    'record': 'Record',
    'settings': 'Settings'
  };
  if (pageTitle) {
    pageTitle.textContent = pageTitles[target] || 'Dashboard';
  }

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

  // Load and render fuel history when Fuel tab is shown
  if (target === 'fuel') {
    setTimeout(() => {
      if (typeof fuelApp !== 'undefined' && fuelApp) {
        const records = fuelApp.getRecords();
        if (fuelApp.uiRenderer) {
          fuelApp.uiRenderer.renderFuelHistory(records);
        }
        updateFuelTabKPIs();
      } else {
        // Fallback: load fuel records directly if fuelApp isn't initialized
        loadFuelRecordsDirectly();
      }
    }, 100);
  }

  if (target === 'fuel' && typeof fuelApp !== 'undefined' && fuelApp) {
    setTimeout(() => {
      const records = fuelApp.getRecords();
      if (fuelApp.uiRenderer) fuelApp.uiRenderer.renderFuelHistory(records);
      updateFuelTabKPIs();
    }, 100);
  }

  if (target === 'finance') {
    setTimeout(() => loadFinanceRecords(), 100);
  }

  setTimeout(() => initializeKPIDescriptions(), 150);
}

// ================================
// Event Listeners Setup
// ================================
function initializeEventListeners() {
  const tabButtons = document.querySelectorAll('.sidebar-nav .nav-link[data-tab-target]');
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab-target');
    setActiveTab(target);
    if (target === 'record') openRecordForm();
    else if (target === 'settings') {
      loadCategoriesList();
      loadFinanceCategoriesList();
    }
    if (window.innerWidth <= 991) {
      document.getElementById('sidebar')?.classList.remove('sidebar-open');
      document.getElementById('mobileOverlay')?.classList.remove('active');
    }
  }));

  const mobileNavItems = document.querySelectorAll('.mobile-bottom-nav-item[data-tab-target]');
  mobileNavItems.forEach(item => item.addEventListener('click', e => {
    e.preventDefault();
    const target = item.getAttribute('data-tab-target');
    if (target !== 'more') closeMoreTabsCard();
    setActiveTab(target);
    if (target === 'record') openRecordForm();
    else if (target === 'settings') {
      loadCategoriesList();
      loadFinanceCategoriesList();
    }
  }));

  const moreTabsBtn = document.getElementById('moreTabsBtn');
  const moreTabsCard = document.getElementById('moreTabsCard');
  moreTabsBtn?.addEventListener('click', e => {
    e.preventDefault();
    moreTabsCard?.classList.toggle('show');
  });
  document.getElementById('closeMoreTabs')?.addEventListener('click', closeMoreTabsCard);
  document.querySelectorAll('.more-tab-item[data-tab-target]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const target = item.getAttribute('data-tab-target');
      closeMoreTabsCard();
      setActiveTab(target);
      if (target === 'settings') {
        loadCategoriesList();
        loadFinanceCategoriesList();
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
  if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', restoreFromAutoBackup);
  if (deleteDatabaseBtn) deleteDatabaseBtn.addEventListener('click', deleteDatabase);
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const selectiveBackupInfo = document.getElementById('selectiveBackupInfo');
  const chkFuelRecords = document.getElementById('chk_fuelRecords');
  const chkFuelSessions = document.getElementById('chk_fuelSessions');
  const chkFinanceRecords = document.getElementById('chk_financeRecords');
  const chkSessions = document.getElementById('chk_sessions');

  if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', () => {
    const selected = Array.from(selectiveStoreButtons)
      .filter(btn => btn.classList.contains('active'))
      .map(btn => btn.dataset.store)
      .filter(Boolean);

    if (selected.length === 0) {
      showAlert('Please select at least one store to delete');
      return;
    }

    const labelList = selected.join(', ');
    showConfirm(`Delete selected stores: ${labelList}? A backup will be created and stored internally for up to 20 days. Proceed?`, 'Delete Selected').then(confirmed => {
      if (!confirmed) return;

      if (typeof exportAllDataInternal !== 'function') {
        showAlert('Backup function unavailable');
        return;
      }

      exportAllDataInternal().then(fullData => {
        const backup = { stores: {}, meta: { date: new Date().toISOString(), stores: selected } };
        selected.forEach(s => { backup.stores[s] = fullData[s] || []; });

        if (typeof saveSelectiveBackup === 'function') {
          saveSelectiveBackup(backup).then(() => {
            if (selectiveBackupInfo) selectiveBackupInfo.textContent = `Backed up: ${selected.join(', ')} (stored internally)`;
            const clearPromises = selected.map(s => clearObjectStore(s));
            Promise.all(clearPromises).then(() => {
              showAlert('Selected stores deleted');
              renderAll();
            }).catch(err => {
              console.error('Error clearing stores:', err);
              showAlert('Error deleting selected stores');
            });
          }).catch(err => {
            console.error('Failed to save internal backup:', err);
            showAlert('Failed to create backup — aborting delete');
          });
        } else {
          showAlert('Backup helper unavailable');
        }
      }).catch(err => {
        console.error('Failed to export data for backup:', err);
        showAlert('Failed to create backup — aborting delete');
      });
    });
  });

  const toggleSelectiveStore = (btn) => {
    if (!btn) return;
    btn.classList.toggle('active');
  };

  selectiveStoreButtons.forEach(btn => {
    btn.addEventListener('click', () => toggleSelectiveStore(btn));
  });
  if (deleteFuelDataBtn) deleteFuelDataBtn.addEventListener('click', () => {
    deleteFuelData().then(() => {
      showAlert('Fuel data deleted successfully');
      renderAll();
      if (typeof fuelApp !== 'undefined' && fuelApp && fuelApp.uiRenderer) {
        fuelApp.uiRenderer.renderFuelHistory([]);
      }
    }).catch(err => {
      if (err && err.message !== 'Cancelled') {
        showAlert('Error deleting fuel data');
        console.error(err);
      }
    });
  });
  if (deleteFinanceDataBtn) deleteFinanceDataBtn.addEventListener('click', () => {
    deleteFinanceData().then(() => {
      showAlert('Finance data deleted successfully');
      renderAll();
      loadFinanceRecords();
    }).catch(err => {
      if (err && err.message !== 'Cancelled') {
        showAlert('Error deleting finance data');
        console.error(err);
      }
    });
  });
  if (deleteSessionsDataBtn) deleteSessionsDataBtn.addEventListener('click', () => {
    deleteSessionsData().then(() => {
      showAlert('Sessions deleted successfully');
      renderAll();
    }).catch(err => {
      if (err && err.message !== 'Cancelled') {
        showAlert('Error deleting sessions');
        console.error(err);
      }
    });
  });
  if (resetAllDataBtn) resetAllDataBtn.addEventListener('click', resetAllData);

  // Fuel settings
  if (saveFuelSettingsBtn) saveFuelSettingsBtn.addEventListener('click', saveFuelSettings);
  if (saveFuelThresholdsBtn) saveFuelThresholdsBtn.addEventListener('click', () => {
    const maxInterval = parseInt(fuelMaxIntervalKmInput?.value);
    const minCons = parseFloat(fuelMinConsumptionInput?.value);
    const maxCons = parseFloat(fuelMaxConsumptionInput?.value);

    if (!isNaN(maxInterval) && maxInterval > 0) {
      localStorage.setItem('fuel_max_interval_km', maxInterval.toString());
    }
    if (!isNaN(minCons) && minCons > 0) {
      localStorage.setItem('fuel_min_consumption', minCons.toString());
    }
    if (!isNaN(maxCons) && maxCons > 0) {
      localStorage.setItem('fuel_max_consumption', maxCons.toString());
    }

    showAlert('Fuel thresholds saved. Charts and KPIs will update.');
    if (typeof fuelApp !== 'undefined' && fuelApp && fuelApp.stateManager) {
      // Recreate analytics engine so it picks up new thresholds
      try {
        fuelApp.stateManager.analyticsEngine = new FuelAnalyticsEngine();
      } catch (e) {
        console.warn('Failed to recreate analytics engine:', e);
      }

      if (fuelApp.uiRenderer) {
        const analytics = fuelApp.stateManager.analyticsEngine.computeAnalytics(fuelApp.getRecords());
        fuelApp.uiRenderer.renderCharts(analytics);
        fuelApp.uiRenderer.renderAnalyticsKPIs(analytics);
      }
    }
  });

  if (undoSelectiveDeleteBtn) undoSelectiveDeleteBtn.addEventListener('click', () => {
    restoreLastSelectiveBackup().then(meta => {
      showAlert('Selective-delete backup restored');
      renderAll();
      if (typeof fuelApp !== 'undefined' && fuelApp && fuelApp.stateManager) {
        try { fuelApp.stateManager.analyticsEngine = new FuelAnalyticsEngine(); } catch (e) { /* ignore */ }
        if (fuelApp.uiRenderer) {
          const records = fuelApp.getRecords();
          fuelApp.uiRenderer.renderFuelHistory(records);
          const analytics = fuelApp.stateManager.analyticsEngine.computeAnalytics(records);
          fuelApp.uiRenderer.renderCharts(analytics);
          fuelApp.uiRenderer.renderAnalyticsKPIs(analytics);
        }
      }
    }).catch(err => {
      if (err && err.message === 'DOWNLOAD_ONLY' && err.metadata) {
        // Prompt user to upload backup file to restore
        showAlert('Backup was saved as a downloaded file. Please upload that backup file to restore.');
        const uploadInput = document.createElement('input');
        uploadInput.type = 'file';
        uploadInput.accept = '.json,application/json';
        uploadInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function(ev) {
            try {
              const obj = JSON.parse(ev.target.result);
              if (typeof restoreBackupObject === 'function') {
                restoreBackupObject(obj).then(() => {
                  showAlert('Backup restored from uploaded file');
                  renderAll();
                }).catch(e2 => {
                  console.error('Restore from file failed', e2);
                  showAlert('Restore failed: ' + (e2.message || 'Unknown error'));
                });
              } else {
                showAlert('Restore helper not available');
              }
            } catch (e) {
              showAlert('Invalid backup file');
            }
          };
          reader.readAsText(file);
        });
        uploadInput.click();
      } else {
        showAlert(err.message || 'Failed to restore backup');
      }
    });
  });

  // Category pagination
  if (categoryPrevPageBtn) categoryPrevPageBtn.addEventListener('click', () => changeCategoryPage(-1));
  if (categoryNextPageBtn) categoryNextPageBtn.addEventListener('click', () => changeCategoryPage(1));

  // Finance category pagination
  if (financeIncomeCategoryPrevPageBtn) financeIncomeCategoryPrevPageBtn.addEventListener('click', () => changeFinanceCategoryPage(-1, 'income'));
  if (financeIncomeCategoryNextPageBtn) financeIncomeCategoryNextPageBtn.addEventListener('click', () => changeFinanceCategoryPage(1, 'income'));
  if (financeExpenseCategoryPrevPageBtn) financeExpenseCategoryPrevPageBtn.addEventListener('click', () => changeFinanceCategoryPage(-1, 'expense'));
  if (financeExpenseCategoryNextPageBtn) financeExpenseCategoryNextPageBtn.addEventListener('click', () => changeFinanceCategoryPage(1, 'expense'));

  // Category edit popup
  if (saveCategoryEditBtn) saveCategoryEditBtn.addEventListener('click', saveCategoryEdit);

  // Fuel pagination
  if (fuelPrevPageBtn) fuelPrevPageBtn.addEventListener('click', () => changeFuelPage(-1));
  if (fuelNextPageBtn) fuelNextPageBtn.addEventListener('click', () => changeFuelPage(1));

  // Upcoming edit popup
  if (saveUpcomingEditBtn) saveUpcomingEditBtn.addEventListener('click', saveUpcomingEdit);
  if (undoUpcomingRemoveBtn) undoUpcomingRemoveBtn.addEventListener('click', undoUpcomingReminderRemoval);

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

  // Initialize finance event listeners
  initializeFinanceEventListeners();

  // Clear button for Record tab odometer
  const clearSessionOdometerBtn = document.getElementById('clearSessionOdometer');
  const sessionOdometerInput = document.getElementById('sessionOdometer');
  if (clearSessionOdometerBtn && sessionOdometerInput) {
    clearSessionOdometerBtn.addEventListener('click', () => {
      sessionOdometerInput.value = '';
      sessionOdometerInput.focus();
    });
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

// Car name modal elements
const carNameModal = document.getElementById("carNameModal");
const closeCarNameModal = document.getElementById("closeCarNameModal");
const carNameInput = document.getElementById("carNameInput");
const saveCarNameBtn = document.getElementById("saveCarNameBtn");
const cancelCarNameBtn = document.getElementById("cancelCarNameBtn");
const carNameBtn = document.getElementById("carNameBtn");
const carNameDisplay = document.getElementById("carNameDisplay");

// Category management elements
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryColor = document.getElementById("newCategoryColor");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const restoreDefaultCategoriesBtn = document.getElementById("restoreDefaultCategoriesBtn");
const categoriesList = document.getElementById("categoriesList");

// Finance category management elements
const newFinanceCategoryName = document.getElementById("newFinanceCategoryName");
const newFinanceCategoryColor = document.getElementById("newFinanceCategoryColor");
const newFinanceCategoryType = document.getElementById("newFinanceCategoryType");
const addFinanceCategoryBtn = document.getElementById("addFinanceCategoryBtn");
const restoreDefaultFinanceCategoriesBtn = document.getElementById("restoreDefaultFinanceCategoriesBtn");

// Category pagination elements
const categoryPaginationControls = document.getElementById("categoryPaginationControls");
const categoryPrevPageBtn = document.getElementById("categoryPrevPageBtn");
const categoryNextPageBtn = document.getElementById("categoryNextPageBtn");
const categoryPageInfo = document.getElementById("categoryPageInfo");
const financeIncomeCategoryPaginationControls = document.getElementById('financeIncomeCategoryPaginationControls');
const financeIncomeCategoryPrevPageBtn = document.getElementById('financeIncomeCategoryPrevPageBtn');
const financeIncomeCategoryNextPageBtn = document.getElementById('financeIncomeCategoryNextPageBtn');
const financeIncomeCategoryPageInfo = document.getElementById('financeIncomeCategoryPageInfo');
const financeExpenseCategoryPaginationControls = document.getElementById('financeExpenseCategoryPaginationControls');
const financeExpenseCategoryPrevPageBtn = document.getElementById('financeExpenseCategoryPrevPageBtn');
const financeExpenseCategoryNextPageBtn = document.getElementById('financeExpenseCategoryNextPageBtn');
const financeExpenseCategoryPageInfo = document.getElementById('financeExpenseCategoryPageInfo');

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
const undoUpcomingRemoveBanner = document.getElementById("undoUpcomingRemoveBanner");
const undoUpcomingRemoveBtn = document.getElementById("undoUpcomingRemoveBtn");

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
const restoreBackupBtn = document.getElementById("restoreBackupBtn");
const deleteDatabaseBtn = document.getElementById("deleteDatabaseBtn");
const deleteFuelDataBtn = document.getElementById("deleteFuelDataBtn");
const deleteFinanceDataBtn = document.getElementById("deleteFinanceDataBtn");
const deleteSessionsDataBtn = document.getElementById("deleteSessionsDataBtn");
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const selectiveBackupInfo = document.getElementById('selectiveBackupInfo');
const selectiveStoreButtons = document.querySelectorAll('.selective-store-btn');
const resetAllDataBtn = document.getElementById("resetAllDataBtn");
const fuelPricePerLiterInput = document.getElementById("fuelPricePerLiter");
const oilPriceInput = document.getElementById("oilPrice");
const oilFilterPriceInput = document.getElementById("oilFilterPrice");
const oilChangeIntervalInput = document.getElementById("oilChangeIntervalKm");
const saveFuelSettingsBtn = document.getElementById("saveFuelSettingsBtn");
const fuelMaxIntervalKmInput = document.getElementById('fuelMaxIntervalKm');
const fuelMinConsumptionInput = document.getElementById('fuelMinConsumption');
const fuelMaxConsumptionInput = document.getElementById('fuelMaxConsumption');
const saveFuelThresholdsBtn = document.getElementById('saveFuelThresholdsBtn');
const undoSelectiveDeleteBtn = document.getElementById('undoSelectiveDeleteBtn');

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
let carName = localStorage.getItem('carName') || 'My Car';

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

// Finance category pagination state
let allFinanceCategories = [];
let financeCategoryCurrentPages = { income: 1, expense: 1 };
let financeCategoriesPerPage = 5;
let editingFinanceCategoryId = null;

// Fuel pagination state
let fuelRecordsAll = [];
let fuelCurrentPage = 1;
const fuelPerPage = 3;

// Upcoming edit state
let editingUpcomingItemId = null;
let lastRemovedUpcomingReminder = null;
let undoUpcomingRemoveTimeout = null;

// ================================
// Fuel Settings Management
// ================================
function loadFuelSettings() {
  if (fuelPricePerLiterInput) {
    fuelPricePerLiterInput.value = fuelPricePerLiter || '';
  }
  if (oilPriceInput) {
    oilPriceInput.value = parseFloat(localStorage.getItem('oilPrice')) || '';
  }
  if (oilFilterPriceInput) {
    oilFilterPriceInput.value = parseFloat(localStorage.getItem('oilFilterPrice')) || '';
  }
  if (oilChangeIntervalInput) {
    oilChangeIntervalInput.value = parseInt(localStorage.getItem('oilChangeIntervalKm')) || '';
  }

  // Load thresholds if present
  try {
    const maxInterval = localStorage.getItem('fuel_max_interval_km');
    const minCons = localStorage.getItem('fuel_min_consumption');
    const maxCons = localStorage.getItem('fuel_max_consumption');
    if (fuelMaxIntervalKmInput) fuelMaxIntervalKmInput.value = maxInterval || '';
    if (fuelMinConsumptionInput) fuelMinConsumptionInput.value = minCons || '';
    if (fuelMaxConsumptionInput) fuelMaxConsumptionInput.value = maxCons || '';
  } catch (e) {
    console.warn('Failed to load fuel thresholds from storage', e);
  }
}

function saveFuelSettings() {
  const price = parseFloat(fuelPricePerLiterInput?.value);
  const oilPrice = parseFloat(oilPriceInput?.value);
  const filterPrice = parseFloat(oilFilterPriceInput?.value);
  const oilInterval = parseInt(oilChangeIntervalInput?.value);

  if (price && price > 0) {
    fuelPricePerLiter = price;
    localStorage.setItem('fuelPricePerLiter', price.toString());

    if (!isNaN(oilPrice) && oilPrice > 0) {
      localStorage.setItem('oilPrice', oilPrice.toString());
    } else {
      localStorage.removeItem('oilPrice');
    }

    if (!isNaN(filterPrice) && filterPrice > 0) {
      localStorage.setItem('oilFilterPrice', filterPrice.toString());
    } else {
      localStorage.removeItem('oilFilterPrice');
    }

    if (!isNaN(oilInterval) && oilInterval > 0) {
      localStorage.setItem('oilChangeIntervalKm', oilInterval.toString());
    } else {
      localStorage.removeItem('oilChangeIntervalKm');
    }

    if (db) {
      try {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put({ key: 'fuelPricePerLiter', value: price });

        if (!isNaN(oilPrice) && oilPrice > 0) {
          store.put({ key: 'oilPrice', value: oilPrice });
        } else {
          store.delete('oilPrice');
        }

        if (!isNaN(filterPrice) && filterPrice > 0) {
          store.put({ key: 'oilFilterPrice', value: filterPrice });
        } else {
          store.delete('oilFilterPrice');
        }

        if (!isNaN(oilInterval) && oilInterval > 0) {
          store.put({ key: 'oilChangeIntervalKm', value: oilInterval });
        } else {
          store.delete('oilChangeIntervalKm');
        }
      } catch (error) {
        console.warn('Unable to save oil settings to database:', error);
      }
    }

    showAlert('Fuel and oil settings saved successfully!');
  } else {
    showAlert('Please enter a valid price per liter.');
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
// Car Name Button
// ================================
if (carNameBtn) {
  carNameBtn.addEventListener("click", () => {
    carNameInput.value = carName;
    carNameModal.style.display = "flex";
    document.body.classList.add('modal-open');
  });
}

if (closeCarNameModal) {
  closeCarNameModal.addEventListener("click", () => {
    carNameModal.style.display = "none";
    document.body.classList.remove('modal-open');
  });
}

if (cancelCarNameBtn) {
  cancelCarNameBtn.addEventListener("click", () => {
    carNameModal.style.display = "none";
    document.body.classList.remove('modal-open');
  });
}

if (saveCarNameBtn) {
  saveCarNameBtn.addEventListener("click", () => {
    const newName = carNameInput.value.trim();
    if (newName) {
      carName = newName;
      localStorage.setItem('carName', newName);
      if (carNameDisplay) carNameDisplay.textContent = newName;
    }
    carNameModal.style.display = "none";
    document.body.classList.remove('modal-open');
  });
}

// Close car name modal when clicking outside
window.addEventListener("click", function (e) {
  if (e.target === carNameModal) {
    carNameModal.style.display = "none";
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
      showAlert("Please enter a category name");
      return;
    }

    if (!db) {
      showAlert("Database not initialized. Please refresh the page.");
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
      showAlert("Category with this name already exists");
    };
  });
}

// Restore default categories
if (restoreDefaultCategoriesBtn) {
  restoreDefaultCategoriesBtn.addEventListener("click", restoreDefaultCategories);
}

// Finance category management
if (addFinanceCategoryBtn) {
  addFinanceCategoryBtn.addEventListener("click", addFinanceCategory);
}

if (restoreDefaultFinanceCategoriesBtn) {
  restoreDefaultFinanceCategoriesBtn.addEventListener("click", restoreDefaultFinanceCategories);
}

function restoreDefaultCategories() {
  if (!db) {
    showAlert("Database not initialized. Please refresh the page.");
    return;
  }

  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");
  let addedCount = 0;

  DEFAULT_MAINTENANCE_CATEGORIES.forEach(cat => {
    const request = store.index("name").get(cat.name);
    request.onsuccess = () => {
      if (!request.result) {
        store.add(cat);
        addedCount++;
      }
    };
  });

  tx.oncomplete = () => {
    if (addedCount > 0) {
      showAlert(`Restored ${addedCount} default categories`);
    } else {
      showAlert("All default categories already exist");
    }
    loadCategoriesList();
    loadCategoriesForFilter();
  };

  tx.onerror = () => {
    showAlert("Error restoring default categories");
  };
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
        <button class="category-edit-btn" onclick="openCategoryEditPopup(${category.id})" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="category-delete-btn" onclick="deleteCategory(${category.id})" title="Delete"><i class="fas fa-trash"></i></button>
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
        if (editFinanceCategoryTypeGroup) editFinanceCategoryTypeGroup.style.display = 'none';
      categoryEditPopup.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };
}

function closeCategoryEditPopup() {
  categoryEditPopup.classList.remove('active');
  if (editFinanceCategoryTypeGroup) editFinanceCategoryTypeGroup.style.display = 'none';
  document.body.classList.remove('modal-open');
  editingCategoryId = null;
  editingFinanceCategoryId = null;
}

function saveCategoryEdit() {
  if (!db) return;

  const newName = editCategoryName.value.trim();
  const newColor = editCategoryColor.value;

  if (!newName) {
    showAlert("Please enter a category name");
    return;
  }

  // Determine which category type we're editing based on which ID is set
  if (editingFinanceCategoryId) {
    const tx = db.transaction("financeCategories", "readwrite");
    const store = tx.objectStore("financeCategories");

    store.get(editingFinanceCategoryId).onsuccess = e => {
      const category = e.target.result;
      if (category) {
        const newType = editFinanceCategoryType?.value || category.type || inferFinanceCategoryType(category.name);
        store.getAll().onsuccess = allEvent => {
          const duplicate = allEvent.target.result.some(other => other.id !== category.id && (other.type || inferFinanceCategoryType(other.name)) === newType && other.name.toLowerCase() === newName.toLowerCase());
          if (duplicate) {
            showAlert("A category with this name already exists for this transaction type");
            return;
          }
          store.put({ ...category, name: newName, color: newColor, type: newType });
        };
      }
    };

    tx.oncomplete = () => {
      closeCategoryEditPopup();
      loadFinanceCategoriesList();
    };

    tx.onerror = () => {
      showAlert("Category with this name already exists");
    };
  } else if (editingCategoryId) {
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
      showAlert("Category with this name already exists");
    };
  }
}

function editCategory(id) {
  openCategoryEditPopup(id);
}

function deleteCategory(id) {
  showConfirm("Are you sure you want to delete this category? Items with this category will have no category assigned.").then(confirmed => {
    if (!confirmed) return;
    if (!db) return;
    const tx = db.transaction("categories", "readwrite");
    tx.objectStore("categories").delete(id);
    tx.oncomplete = () => {
      loadCategoriesList();
      loadCategoriesForFilter();
    };
  });
}

// ================================
// Finance Category Management
// ================================
function loadFinanceCategoriesList() {
  if (!db) return;

  const tx = db.transaction("financeCategories", "readonly");
  const store = tx.objectStore("financeCategories");

  allFinanceCategories = [];
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      const category = cursor.value;
      category.type = category.type || inferFinanceCategoryType(category.name);
      allFinanceCategories.push(category);
      cursor.continue();
    } else {
      renderFinanceCategoriesPage();
    }
  };
}

function renderFinanceCategoriesPage() {
  const incomeList = document.getElementById('financeIncomeCategoriesList');
  const expenseList = document.getElementById('financeExpenseCategoriesList');
  const renderList = (container, type, controls, previousButton, nextButton, pageInfo) => {
    if (!container) return;
    container.innerHTML = '';
    const categories = allFinanceCategories.filter(category => category.type === type);
    const totalPages = Math.ceil(categories.length / financeCategoriesPerPage);
    financeCategoryCurrentPages[type] = Math.min(
      financeCategoryCurrentPages[type],
      Math.max(1, totalPages)
    );
    const currentPage = financeCategoryCurrentPages[type];
    const startIndex = (currentPage - 1) * financeCategoriesPerPage;
    categories.slice(startIndex, startIndex + financeCategoriesPerPage).forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.classList.add('category-item');
      categoryDiv.innerHTML = `
        <div class="category-info">
          <div class="category-color" style="background-color: ${category.color}"></div>
          <span class="category-name"></span>
        </div>
        <div class="category-actions">
          <button class="category-edit-btn" onclick="openFinanceCategoryEditPopup(${category.id})" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="category-delete-btn" onclick="deleteFinanceCategory(${category.id})" title="Delete"><i class="fas fa-trash"></i></button>
        </div>`;
      categoryDiv.querySelector('.category-name').textContent = category.name;
      container.appendChild(categoryDiv);
    });
    if (controls && pageInfo) {
      controls.style.display = totalPages > 1 ? 'flex' : 'none';
      pageInfo.textContent = `Page ${currentPage} of ${Math.max(1, totalPages)}`;
      if (previousButton) previousButton.disabled = currentPage === 1;
      if (nextButton) nextButton.disabled = currentPage === totalPages || totalPages === 0;
    }
  };
  renderList(incomeList, 'income', financeIncomeCategoryPaginationControls, financeIncomeCategoryPrevPageBtn, financeIncomeCategoryNextPageBtn, financeIncomeCategoryPageInfo);
  renderList(expenseList, 'expense', financeExpenseCategoryPaginationControls, financeExpenseCategoryPrevPageBtn, financeExpenseCategoryNextPageBtn, financeExpenseCategoryPageInfo);
}

function changeFinanceCategoryPage(direction, type) {
  const categories = allFinanceCategories.filter(category => category.type === type);
  const totalPages = Math.ceil(categories.length / financeCategoriesPerPage);
  const newPage = financeCategoryCurrentPages[type] + direction;

  if (newPage >= 1 && newPage <= totalPages) {
    financeCategoryCurrentPages[type] = newPage;
    renderFinanceCategoriesPage();
  }
}

function openFinanceCategoryEditPopup(id) {
  if (!db) return;

  editingFinanceCategoryId = id;
  const tx = db.transaction("financeCategories", "readonly");
  tx.objectStore("financeCategories").get(id).onsuccess = e => {
    const category = e.target.result;
    if (category) {
      editCategoryName.value = category.name;
      editCategoryColor.value = category.color;
      if (editFinanceCategoryType) editFinanceCategoryType.value = category.type || 'expense';
      if (editFinanceCategoryTypeGroup) editFinanceCategoryTypeGroup.style.display = 'block';
      categoryEditPopup.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };
}

function saveFinanceCategoryEdit() {
  if (!db || !editingFinanceCategoryId) return;

  const newName = editCategoryName.value.trim();
  const newColor = editCategoryColor.value;

  if (!newName) {
    showAlert("Please enter a category name");
    return;
  }

  const tx = db.transaction("financeCategories", "readwrite");
  const store = tx.objectStore("financeCategories");

  store.get(editingFinanceCategoryId).onsuccess = e => {
    const category = e.target.result;
    if (category) {
      const updatedCategory = { ...category, name: newName, color: newColor };
      store.put(updatedCategory);
    }
  };

  tx.oncomplete = () => {
    closeCategoryEditPopup();
    loadFinanceCategoriesList();
  };

  tx.onerror = () => {
    showAlert("Category with this name already exists");
  };
}

function deleteFinanceCategory(id) {
  showConfirm("Are you sure you want to delete this finance category? Existing transactions will keep the old category name.").then(confirmed => {
    if (!confirmed) return;
    if (!db) return;
    const tx = db.transaction("financeCategories", "readwrite");
    tx.objectStore("financeCategories").delete(id);
    tx.oncomplete = () => {
      loadFinanceCategoriesList();
    };
  });
}

function addFinanceCategory() {
  const newFinanceCategoryName = document.getElementById('newFinanceCategoryName');
  const newFinanceCategoryColor = document.getElementById('newFinanceCategoryColor');

  if (!db) return;
  const name = newFinanceCategoryName.value.trim();
  const color = newFinanceCategoryColor.value;
  const type = newFinanceCategoryType?.value || 'expense';

  if (!name) {
    showAlert("Please enter a category name");
    return;
  }

  const tx = db.transaction("financeCategories", "readwrite");
  const store = tx.objectStore("financeCategories");
  const request = store.getAll();
  request.onsuccess = () => {
    const duplicate = request.result.some(category => (category.type || inferFinanceCategoryType(category.name)) === type && category.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      showAlert("A category with this name already exists for this transaction type");
      return;
    }
    store.add({ name, color, type });
  };
  tx.oncomplete = () => {
    newFinanceCategoryName.value = "";
    newFinanceCategoryColor.value = type === 'income' ? '#10b981' : '#ef4444';
    loadFinanceCategoriesList();
  };
}

function restoreDefaultFinanceCategories() {
  if (!db) return;

  const tx = db.transaction("financeCategories", "readwrite");
  const store = tx.objectStore("financeCategories");

  let addedCount = 0;
  store.getAll().onsuccess = event => {
    const existing = event.target.result;
    DEFAULT_FINANCE_CATEGORIES.forEach(category => {
      if (existing.some(item => item.type === category.type && item.name.toLowerCase() === category.name.toLowerCase())) return;
      store.add(category);
      addedCount++;
    });
  };

  tx.oncomplete = () => {
    if (addedCount > 0) {
      showAlert(`Restored ${addedCount} default finance categories`);
    } else {
      showAlert("All default finance categories already exist");
    }
    loadFinanceCategoriesList();
  };
}

// ================================
// Record Page Controls
// ================================
function openRecordForm(session = null) {
  itemsContainer.innerHTML = "";
  editingSessionId = session ? session.id : null;
  const maintenanceSource = document.getElementById('maintenanceFundingSource');
  const maintenanceFinanceIncluded = document.getElementById('maintenanceFinanceIncluded');

  if (session) {
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("sessionOdometer").value = session.odometer;
    document.getElementById("sessionMerchant").value = session.merchant || '';
    document.getElementById("sessionNotes").value = session.notes || '';
    if (maintenanceSource) maintenanceSource.value = session.fundingSource || 'personal';
    if (maintenanceFinanceIncluded) maintenanceFinanceIncluded.checked = session.financeIncluded !== false;
    loadItemsForEdit(session.id);
  } else {
    const iso = getTodayDateInput();
    document.getElementById("sessionDate").value = iso;
    document.getElementById("sessionOdometer").value = "";
    document.getElementById("sessionMerchant").value = "";
    document.getElementById("sessionNotes").value = "";
    if (maintenanceSource) maintenanceSource.value = 'personal';
    if (maintenanceFinanceIncluded) maintenanceFinanceIncluded.checked = true;
  }
}

function setFinanceToggleState(toggle, included) {
  if (!toggle) return;
  toggle.dataset.included = included ? 'true' : 'false';
  toggle.classList.toggle('toggle-on', included);
  toggle.classList.toggle('toggle-off', !included);
  toggle.textContent = included ? 'Included in Finance' : 'Not Included in Finance';
}

function isFinanceToggleIncluded(toggle) {
  return toggle?.dataset.included === 'true';
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
  const isNewItem = Object.keys(item).length === 0;
  // Get merchant from top field if not provided
  const topMerchant = document.getElementById("sessionMerchant").value.trim();
  const merchantValue = item.merchant || topMerchant || "";
  
  // Calculate item number
  const itemNumber = itemsContainer.querySelectorAll(".item-form").length + 1;
  
  div.innerHTML = `
    <div class="item-header">
      <span class="item-number">Item ${itemNumber}</span>
      <button class="delete-item-btn">✕</button>
    </div>
    <div class="item-inputs">
      <select class="itemCategory styled-input">
        <option value="">Select Category</option>
      </select>
      <input type="text" class="itemName styled-input" placeholder="Item / Service" value="${item.name || ""}">
      <input type="number" class="itemPrice styled-input" placeholder="Price (EGP)" value="${item.price || ""}">
    </div>
    <div class="item-reminder-section">
      <div class="reminder-header">Remind me once I reach</div>
      <div class="reminder-inputs">
        <input type="number" class="itemInterval styled-input" placeholder="Interval (km)" value="${item.interval || ""}">
        <input type="number" class="itemIntervalMonths styled-input" placeholder="Interval (months)" value="${item.intervalMonths || ""}" min="1">
      </div>
      <div class="item-controls-group">
        <button type="button" class="installation-status-btn ${item.installed !== false ? 'installed' : 'not-installed'}" data-installed="${item.installed !== false ? 'true' : 'false'}">
          ${item.installed !== false ? 'Reminder Active' : 'Reminder Inactive'}
        </button>
      </div>
    </div>
    <div class="item-notes">
      <input type="text" class="itemMerchant styled-input" placeholder="Merchant (optional)" value="${merchantValue}">
      <textarea class="itemNotes styled-input" placeholder="Notes (optional)">${item.notes || ""}</textarea>
    </div>
  `;
  
  div.querySelector(".delete-item-btn").onclick = () => {
    div.remove();
    updateItemNumbers();
  };
  
  // Handle installation status button
  const statusBtn = div.querySelector(".installation-status-btn");
  statusBtn.onclick = () => {
    const isInstalled = statusBtn.dataset.installed === 'true';
    statusBtn.dataset.installed = isInstalled ? 'false' : 'true';
    
    if (isInstalled) {
      statusBtn.classList.remove('installed');
      statusBtn.classList.add('not-installed');
      statusBtn.querySelector('i').className = 'fas fa-bell';
      statusBtn.querySelector('span').textContent = 'Reminder Inactive';
    } else {
      statusBtn.classList.remove('not-installed');
      statusBtn.classList.add('installed');
      statusBtn.querySelector('i').className = 'fas fa-check';
      statusBtn.querySelector('span').textContent = 'Installed / Completed · Reminder Active';
    }
  };

  itemsContainer.appendChild(div);

  loadCategoriesForSelect(div.querySelector(".itemCategory"), item.categoryId);
}

function updateItemNumbers() {
  const items = itemsContainer.querySelectorAll(".item-form");
  items.forEach((item, index) => {
    const numberSpan = item.querySelector(".item-number");
    if (numberSpan) {
      numberSpan.textContent = `Item ${index + 1}`;
    }
  });
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
    showAlert("Database not initialized. Please refresh the page.");
    return;
  }

  // Auto-backup before saving
  autoBackupData();

  let date = document.getElementById("sessionDate").value;

  if (!date) {
    date = getTodayDateInput();
  }

  const odometer = parseInt(document.getElementById("sessionOdometer").value) || 0;
  const merchant = document.getElementById("sessionMerchant").value.trim();
  const notes = document.getElementById("sessionNotes").value.trim();
  const fundingSource = document.getElementById('maintenanceFundingSource')?.value || 'personal';
  const financeIncluded = document.getElementById('maintenanceFinanceIncluded')?.checked !== false;
  const time = getCurrentTimeInput();
  const eventAt = combineEventDateTime(date, time);

  if (odometer && odometer > currentOdometer) {
    currentOdometer = odometer;
    localStorage.setItem('currentOdometer', odometer.toString());
    if (odometerValue) odometerValue.textContent = `${odometer.toLocaleString()}`;
  }

  const sessionObj = { id: editingSessionId || Date.now(), date, time, eventAt, odometer, merchant, notes, financeIncluded, fundingSource };

  const itemEls = itemsContainer.querySelectorAll(".item-form");
  const items = Array.from(itemEls).map(el => {
    const intervalVal = parseFloat(el.querySelector(".itemInterval").value);
    const intervalMonthsVal = parseInt(el.querySelector(".itemIntervalMonths").value) || null;
    const categoryId = parseInt(el.querySelector(".itemCategory").value) || null;
    const statusBtn = el.querySelector(".installation-status-btn");
    const installed = statusBtn ? statusBtn.dataset.installed === 'true' : true;
    
    return {
      sessionId: sessionObj.id,
      name: el.querySelector(".itemName").value.trim(),
      price: parseFloat(el.querySelector(".itemPrice").value) || 0,
      interval: intervalVal || null,
      intervalMonths: intervalMonthsVal,
      merchant: el.querySelector(".itemMerchant").value.trim(),
      notes: el.querySelector(".itemNotes").value.trim(),
      categoryId: categoryId,
      installed: installed,
      lastServiceOdometer: installed && intervalVal ? odometer : null,
      nextDueKm: intervalVal && installed ? odometer + intervalVal : null,
      financeIncluded: true
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
        if (String(cursor.value.sessionId) === String(editingSessionId)) cursor.delete();
        cursor.continue();
      } else {
        items.forEach(i => {
          const addRequest = itemStore.add(i);
          addRequest.onsuccess = () => { i.id = addRequest.result; };
        });

      }
    };
  } else {
    const addReq = sessionStore.add(sessionObj);
    addReq.onsuccess = e => {
      const newSessionId = e.target.result;
      items.forEach(i => {
        const addRequest = itemStore.add(i);
        addRequest.onsuccess = () => { i.id = addRequest.result; };
      });

    };
  }

  tx.oncomplete = function () {
    syncMaintenanceFinance(sessionObj.id, date, items, merchant, financeIncluded, fundingSource, eventAt).catch(error => console.error(error));
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
      // Calculate fuel analytics - exclude first record's liters (baseline fill)
      if (records.length >= 2) {
        const sortedRecords = records.sort((a, b) => a.odometer - b.odometer);
        const analyticsEngine = new FuelAnalyticsEngine();
        const analytics = analyticsEngine.computeAnalytics(sortedRecords);
        const avgConsumption = analytics.avgConsumption;

        if (kpiAvgFuelValue) {
          kpiAvgFuelValue.textContent = `${avgConsumption.toFixed(1)}`;
        }
        if (kpiAvgFuelSub) {
          kpiAvgFuelSub.textContent = 'L/100km';
        }

        if (avgConsumption > 0) {
          updateFuelEfficiencyIndicator(avgConsumption, 'homeFuelEfficiencyIndicator');
        }
      } else {
        if (kpiAvgFuelValue) kpiAvgFuelValue.textContent = '—';
        if (kpiAvgFuelSub) kpiAvgFuelSub.textContent = 'L/100km';

        const indicator = document.getElementById('homeFuelEfficiencyIndicator');
        if (indicator) {
          indicator.style.display = 'none';
        }
      }
    }
  };
}

// ================================
// Update Fuel Tab KPIs
// ================================
function updateFuelTabKPIs() {
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
      updateFuelTabKPIDisplay(records);
    }
  };
}

function updateFuelTabKPIDisplay(records) {
  // Get DOM elements
  const timeBetweenRecordsEl = document.getElementById('timeBetweenRecords');
  const kmBetweenRecordsEl = document.getElementById('kmBetweenRecords');
  const lastRefillDaysEl = document.getElementById('lastRefillDays');
  const lastRefillKPIEl = document.getElementById('lastRefillKPI');
  const currentOdometerEl = document.getElementById('odometerValue');

  if (!timeBetweenRecordsEl || !kmBetweenRecordsEl || !lastRefillDaysEl || !lastRefillKPIEl) return;

  if (records.length === 0) {
    timeBetweenRecordsEl.textContent = '--';
    kmBetweenRecordsEl.textContent = '--';
    lastRefillDaysEl.textContent = '--';
    lastRefillKPIEl.innerHTML = '<p class="empty-text">No refill recorded</p>';
    return;
  }

  // Sort records by date
  const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate difference between last two records (not average)
  let daysBetweenLastTwo = 0;
  let kmBetweenLastTwo = 0;

  if (sortedRecords.length >= 2) {
    const lastRecord = sortedRecords[sortedRecords.length - 1];
    const secondLastRecord = sortedRecords[sortedRecords.length - 2];
    
    daysBetweenLastTwo = Math.ceil((new Date(lastRecord.date) - new Date(secondLastRecord.date)) / (1000 * 60 * 60 * 24));
    kmBetweenLastTwo = lastRecord.odometer - secondLastRecord.odometer;
  }

  // Calculate time since last refill
  const lastRecord = sortedRecords[sortedRecords.length - 1];
  const daysSinceLastRefill = Math.ceil((new Date() - new Date(lastRecord.date)) / (1000 * 60 * 60 * 24));

  // Update display
  timeBetweenRecordsEl.textContent = daysBetweenLastTwo > 0 ? daysBetweenLastTwo.toString() : '--';
  kmBetweenRecordsEl.textContent = kmBetweenLastTwo > 0 ? kmBetweenLastTwo.toString() : '--';
  lastRefillDaysEl.textContent = daysSinceLastRefill > 0 ? daysSinceLastRefill.toString() : '0';

  // Update Last Refill KPI
  if (lastRefillKPIEl) {
    const pricePerLiter = parseFloat(lastRecord.pricePerLiter) || 0;
    lastRefillKPIEl.innerHTML = `
      <div class="last-refill-kpi-content">
        <div class="last-refill-date">${formatDateToBritish(lastRecord.date)}</div>
        <div class="last-refill-details">
          <span class="last-refill-liters">${lastRecord.liters} L</span>
          <span class="last-refill-odometer">@ ${lastRecord.odometer.toLocaleString()} km</span>
        </div>
        <div class="last-refill-cost">${lastRecord.totalCost.toLocaleString()} EGP</div>
        ${pricePerLiter > 0 ? `<div class="last-refill-price">${pricePerLiter.toFixed(2)} EGP/L</div>` : ''}
      </div>
    `;
  }
}

// Make function globally available
window.updateFuelTabKPIs = updateFuelTabKPIs;

// ================================
// Fuel Efficiency Indicator
// ================================
function updateFuelEfficiencyIndicator(consumption, indicatorId) {
  const indicator = document.getElementById(indicatorId);
  if (!indicator) return;

  const badge = indicator.querySelector('.efficiency-badge');
  const text = indicator.querySelector('.efficiency-text');

  if (!badge || !text) return;

  // Define efficiency ranges (L/100km)
  // Good: 6-8L/100km (compact cars, efficient sedans)
  // Average: 8-10L/100km (mid-size cars, SUVs)
  // Poor: >10L/100km (large SUVs, trucks, or inefficient driving)

  let efficiencyClass = '';
  let efficiencyLabel = '';

  if (consumption <= 8) {
    efficiencyClass = 'efficiency-good';
    efficiencyLabel = 'Good Efficiency';
  } else if (consumption <= 10) {
    efficiencyClass = 'efficiency-average';
    efficiencyLabel = 'Average Efficiency';
  } else {
    efficiencyClass = 'efficiency-poor';
    efficiencyLabel = 'High Consumption';
  }

  // Remove existing classes
  indicator.classList.remove('efficiency-good', 'efficiency-average', 'efficiency-poor');

  // Add new class
  indicator.classList.add(efficiencyClass);

  // Update text
  text.textContent = efficiencyLabel;

  // Show indicator
  indicator.style.display = 'flex';
}

// Make function available globally for fuel-analytics.js
window.updateFuelEfficiencyIndicator = updateFuelEfficiencyIndicator;

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
      <button class="edit-btn" onclick="event.stopPropagation(); editSession(${session.id})"><i class="fas fa-edit"></i></button>
      <button class="delete-btn" onclick="event.stopPropagation(); deleteSession(${session.id})"><i class="fas fa-trash"></i></button>
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
  // Only show items that were installed and then marked as done (not items that were never installed)
  const completed = items.filter(i => i.interval && !i.nextDueKm && i.installed !== false);

  if (completed.length === 0) {
    toggleCompletedBtn.style.display = 'none';
    return;
  }

  toggleCompletedBtn.style.display = 'block';
  completedItems.innerHTML = "";

  // Load sessions to get dates for sorting
  const tx = db.transaction("sessions", "readonly");
  const sessionStore = tx.objectStore("sessions");
  const sessions = {};

  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      // Sort by session date (oldest to newest)
      completed.sort((a, b) => {
        const sessionA = sessions[a.sessionId];
        const sessionB = sessions[b.sessionId];
        const dateA = sessionA ? new Date(sessionA.date) : new Date(0);
        const dateB = sessionB ? new Date(sessionB.date) : new Date(0);
        return dateA - dateB;
      });

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
  };
}

function displayUpcoming(items) {
  if (!upcomingList || !db) return;
  upcomingList.innerHTML = "";
  // Include items with interval set (km or months) and either installed with nextDueKm set, or not installed (exclude completed items)
  const filtered = items.filter(i => 
    (i.interval && i.interval > 0 || i.intervalMonths && i.intervalMonths > 0) && 
    (i.nextDueKm !== null || i.installed === false)
  );
  
  // Load sessions to get dates for sorting
  const tx = db.transaction("sessions", "readonly");
  const sessionStore = tx.objectStore("sessions");
  const sessions = {};
  
  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      // Sort by session date (oldest to newest)
      filtered.sort((a, b) => {
        const sessionA = sessions[a.sessionId];
        const sessionB = sessions[b.sessionId];
        const dateA = sessionA ? new Date(sessionA.date) : new Date(0);
        const dateB = sessionB ? new Date(sessionB.date) : new Date(0);
        return dateA - dateB;
      });
      
      upcomingItemsAll = filtered;
      upcomingCurrentPage = 1;
      renderUpcomingPage();
    }
  };
}

function prepareUpcomingPagination(items) {
  if (!upcomingList || !db) return;
  // Include items with interval set (km or months) and either installed with nextDueKm set, or not installed (exclude completed items)
  const filtered = items.filter(i => 
    (i.interval && i.interval > 0 || i.intervalMonths && i.intervalMonths > 0) && 
    (i.nextDueKm !== null || i.installed === false)
  );
  
  // Load sessions to get dates for sorting
  const tx = db.transaction("sessions", "readonly");
  const sessionStore = tx.objectStore("sessions");
  const sessions = {};
  
  sessionStore.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      sessions[cursor.value.id] = cursor.value;
      cursor.continue();
    } else {
      // Sort by session date (oldest to newest)
      filtered.sort((a, b) => {
        const sessionA = sessions[a.sessionId];
        const sessionB = sessions[b.sessionId];
        const dateA = sessionA ? new Date(sessionA.date) : new Date(0);
        const dateB = sessionB ? new Date(sessionB.date) : new Date(0);
        return dateA - dateB;
      });
      
      upcomingItemsAll = filtered;
      upcomingCurrentPage = 1;
      renderUpcomingPage();
    }
  };
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
        if ((!item.interval || item.interval <= 0) && (!item.intervalMonths || item.intervalMonths <= 0)) return;

        const isInstalled = item.installed !== false;
        const session = sessions[item.sessionId];
        const sessionDate = session ? session.date : null;
        const relativeTime = sessionDate ? getRelativeTime(sessionDate) : '';
        const timeContextColor = sessionDate ? getTimeContextColor(sessionDate) : 'neutral';
        const tooltipDate = sessionDate ? formatDateForTooltip(sessionDate) : '';

        let status, progressColor, urgencyText, progressBar, kmInfo, nextDue;
        const isKmInterval = item.interval && item.interval > 0;
        const isMonthsInterval = item.intervalMonths && item.intervalMonths > 0;

        if (!isInstalled) {
          // Standby/Pending state for not installed parts
          status = "status-standby";
          progressColor = "#9ca3af";
          urgencyText = "Pending";
          progressBar = '';
          if (isKmInterval && isMonthsInterval) {
            kmInfo = `Interval: ${item.interval.toLocaleString()} km / ${item.intervalMonths} months`;
          } else if (isKmInterval) {
            kmInfo = `Interval: ${item.interval.toLocaleString()} km`;
          } else if (isMonthsInterval) {
            kmInfo = `Interval: ${item.intervalMonths} months`;
          }
          nextDue = 'Waiting for activation';
        } else {
          // Normal state for installed parts
          if (isKmInterval) {
            const sessionOdometer = session && typeof session.odometer === 'number' ? session.odometer : null;
            const lastServiceOdometer = item.lastServiceOdometer != null
              ? item.lastServiceOdometer
              : sessionOdometer != null
                ? sessionOdometer
                : (item.nextDueKm != null ? item.nextDueKm - item.interval : null);
            const nextDueKm = item.nextDueKm != null
              ? item.nextDueKm
              : (lastServiceOdometer != null ? lastServiceOdometer + item.interval : null);
            const kmSinceService = lastServiceOdometer != null ? currentOdometer - lastServiceOdometer : 0;
            const progressPercent = Math.min(Math.max((kmSinceService / item.interval) * 100, 0), 100);
            const kmRemaining = nextDueKm != null ? nextDueKm - currentOdometer : null;

            status = "status-ok";
            progressColor = "#10b981";
            urgencyText = "Good";

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

            progressBar = `
              <div class="progress-container">
                <div class="progress-bar" style="width: ${progressPercent}%; background: ${progressColor};">
                </div>
              </div>
            `;
            kmInfo = `${kmSinceService.toLocaleString()} / ${item.interval.toLocaleString()} km`;
            nextDue = `Due: ${nextDueKm != null ? nextDueKm.toLocaleString() : 'Unknown'} km (${kmRemaining != null ? (kmRemaining > 0 ? kmRemaining.toLocaleString() + ' km left' : 'Overdue') : 'Unknown'})`;
          } else if (isMonthsInterval) {
            // For months-based intervals, show as pending/standby for now
            // TODO: Implement months-based tracking with date calculations
            status = "status-standby";
            progressColor = "#9ca3af";
            urgencyText = "Pending";
            progressBar = '';
            kmInfo = `Interval: ${item.intervalMonths} months`;
            nextDue = 'Months-based tracking';
          }
        }

        const div = document.createElement("div");
        div.classList.add("upcoming-item", status);

        // Action buttons based on installation status
        let actionButtons = `
          <button class="remove-upcoming-btn" onclick="removeUpcomingReminder(${item.id})" title="Remove Reminder">
            <i class="fas fa-times"></i>
          </button>
        `;
        if (!isInstalled) {
          actionButtons += `
            <button class="activate-reminder-btn" onclick="activateReminder(${item.id})" title="Start Reminder Tracking">
              <i class="fas fa-play"></i>
            </button>
            <button class="edit-upcoming-btn" onclick="editUpcomingItem(${item.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
          `;
        } else {
          actionButtons += `
            <span class="urgency-badge ${status}">${urgencyText}</span>
            <button class="mark-done-btn" onclick="markMaintenanceDone(${item.id})" title="Mark as Done">
              <i class="fas fa-check"></i>
            </button>
            <button class="undo-activation-btn" onclick="undoActivation(${item.id})" title="Undo Activation">
              <i class="fas fa-undo"></i>
            </button>
            <button class="edit-upcoming-btn" onclick="editUpcomingItem(${item.id})" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
          `;
        }

        div.innerHTML = `
          <div class="upcoming-content">
            <div class="upcoming-info">
              <div class="item-header-row">
                <div class="item-header-left">
                  <span class="item-name">${item.name}</span>
                  ${relativeTime ? `<span class="time-context time-context-${timeContextColor}" title="Recorded on ${tooltipDate}">${relativeTime}</span>` : ''}
                </div>
              </div>
              <div class="item-details">
                <span class="km-info">${kmInfo}</span>
                <span class="next-due">${nextDue}</span>
              </div>
            </div>
            <div class="upcoming-actions">
              ${actionButtons}
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
      if (String(cursor.value.sessionId) === String(sessionId)) addItemField(cursor.value);
      cursor.continue();
    }
  };
}

function viewSessionDetails(id) {
  if (!db) return;
  const sessionId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
  const tx = db.transaction(["sessions", "items", "categories"], "readonly");
  const sessionStore = tx.objectStore("sessions");
  const itemStore = tx.objectStore("items");
  const categoryStore = tx.objectStore("categories");

  sessionStore.get(sessionId).onsuccess = e => {
    const session = e.target.result;
    if (!session) return;

    const items = [];
    itemStore.openCursor().onsuccess = e2 => {
      const cursor = e2.target.result;
      if (cursor) {
        if (String(cursor.value.sessionId) === String(sessionId)) {
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
  showConfirm("Mark this maintenance as done? It will be removed from upcoming maintenance.").then(confirmed => {
    if (!confirmed) return;
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

    tx.onerror = () => {
      console.error("Error marking maintenance as done:", tx.error);
    };
  });
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

  const newName = editUpcomingItemName.value.trim();
  const newInterval = parseInt(editUpcomingInterval.value) || null;
  const newIntervalMonths = parseInt(editUpcomingIntervalMonths.value) || null;

  if ((!newInterval || isNaN(newInterval) || newInterval <= 0) && (!newIntervalMonths || isNaN(newIntervalMonths) || newIntervalMonths <= 0)) {
    showAlert('Please enter a valid service interval (km or months)');
    return;
  }

  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");

  store.get(editingUpcomingItemId).onsuccess = e => {
    const item = e.target.result;
    if (item) {
      let lastServiceOdometer = item.lastServiceOdometer != null
        ? item.lastServiceOdometer
        : (item.nextDueKm != null && item.interval ? item.nextDueKm - item.interval : null);

      let newNextDueKm = null;

      if (item.installed !== false && newInterval && newInterval > 0) {
        if (lastServiceOdometer != null) {
          newNextDueKm = lastServiceOdometer + newInterval;
        } else if (item.nextDueKm != null && item.interval) {
          lastServiceOdometer = item.nextDueKm - item.interval;
          newNextDueKm = lastServiceOdometer + newInterval;
        } else {
          lastServiceOdometer = currentOdometer;
          newNextDueKm = currentOdometer + newInterval;
        }
      } else if (item.installed !== false && item.nextDueKm != null) {
        newNextDueKm = item.nextDueKm;
      }

      const updatedItem = {
        ...item,
        name: newName,
        interval: newInterval,
        intervalMonths: newIntervalMonths,
        nextDueKm: newNextDueKm,
        lastServiceOdometer: lastServiceOdometer
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
  showConfirm("Restore this item to upcoming maintenance? This will recalculate the next due date.").then(confirmed => {
    if (!confirmed) return;
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
            installed: true,
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
      showAlert("Error restoring item. Please try again.");
    };
  });
}

function deleteCompletedItem(itemId) {
  showConfirm("Are you sure you want to delete this item from history? This action cannot be undone.").then(confirmed => {
    if (!confirmed) {
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
      showAlert("Error deleting item. Please try again.");
    };
  });
}

function removeUpcomingReminder(itemId) {
  showConfirm("Remove the km/months reminder from this item? This will clear the reminder from its session record.").then(confirmed => {
    if (!confirmed) return;
    if (!db) return;

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.get(itemId).onsuccess = e => {
      const item = e.target.result;
      if (item) {
        lastRemovedUpcomingReminder = { ...item };

        const updatedItem = {
          ...item,
          interval: null,
          intervalMonths: null,
          nextDueKm: null,
          installed: false,
          lastServiceOdometer: null
        };
        store.put(updatedItem);
      }
    };

    tx.oncomplete = () => {
      renderAll();
      showUndoUpcomingRemoveBanner();
    };

    tx.onerror = () => {
      console.error("Error removing reminder:", tx.error);
      showAlert("Error removing reminder. Please try again.");
    };
  });
}

function undoUpcomingReminderRemoval() {
  if (!lastRemovedUpcomingReminder || !db) return;

  const tx = db.transaction("items", "readwrite");
  const store = tx.objectStore("items");
  store.put(lastRemovedUpcomingReminder);

  tx.oncomplete = () => {
    lastRemovedUpcomingReminder = null;
    hideUndoUpcomingRemoveBanner();
    renderAll();
  };

  tx.onerror = () => {
    console.error("Error restoring removed reminder:", tx.error);
    showAlert("Error restoring reminder. Please try again.");
  };
}

function showUndoUpcomingRemoveBanner() {
  if (!undoUpcomingRemoveBanner || !undoUpcomingRemoveBtn) return;

  undoUpcomingRemoveBanner.style.display = 'flex';
  undoUpcomingRemoveBtn.disabled = false;

  if (undoUpcomingRemoveTimeout) {
    clearTimeout(undoUpcomingRemoveTimeout);
  }

  undoUpcomingRemoveTimeout = setTimeout(() => {
    hideUndoUpcomingRemoveBanner();
    lastRemovedUpcomingReminder = null;
  }, 10000);
}

function hideUndoUpcomingRemoveBanner() {
  if (!undoUpcomingRemoveBanner) return;
  undoUpcomingRemoveBanner.style.display = 'none';
  if (undoUpcomingRemoveTimeout) {
    clearTimeout(undoUpcomingRemoveTimeout);
    undoUpcomingRemoveTimeout = null;
  }
}

function activateReminder(itemId) {
  showConfirm("Start tracking this reminder? Confirm that the part or service has been installed.", 'Start Reminder Tracking').then(confirmed => {
    if (!confirmed) return;
    if (!db) return;

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.get(itemId).onsuccess = e => {
      const item = e.target.result;
      if (item) {
        const lastServiceOdometer = item.lastServiceOdometer != null
          ? item.lastServiceOdometer
          : (item.nextDueKm != null && item.interval ? item.nextDueKm - item.interval : currentOdometer);

        const nextDueKm = item.nextDueKm != null
          ? item.nextDueKm
          : (item.interval && item.interval > 0 ? lastServiceOdometer + item.interval : null);

        const updatedItem = {
          ...item,
          installed: true,
          nextDueKm: nextDueKm,
          lastServiceOdometer: lastServiceOdometer
        };
        store.put(updatedItem);
      }
    };

    tx.oncomplete = () => {
      renderAll();
    };

    tx.onerror = () => {
      console.error("Error activating reminder:", tx.error);
      showAlert("Error activating reminder. Please try again.");
    };
  });
}

function undoActivation(itemId) {
  showConfirm("Undo activation? This will mark the part as not installed and stop tracking maintenance.").then(confirmed => {
    if (!confirmed) return;
    if (!db) return;

    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    store.get(itemId).onsuccess = e => {
      const item = e.target.result;
      if (item) {
        const updatedItem = {
          ...item,
          installed: false
        };
        store.put(updatedItem);
      }
    };

    tx.oncomplete = () => {
      renderAll();
    };

    tx.onerror = () => {
      console.error("Error undoing activation:", tx.error);
      showAlert("Error undoing activation. Please try again.");
    };
  });
}

function deleteSession(id) {
  showConfirm("Delete this session permanently?").then(confirmed => {
    if (!confirmed) return;
    if (!db) return;

    const tx = db.transaction(["sessions", "items"], "readwrite");
    tx.objectStore("sessions").delete(id);
    const itemStore = tx.objectStore("items");
    itemStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (String(cursor.value.sessionId) === String(id)) cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => {
      deleteFinanceRecordsBySession(id).then(() => {
        renderAll();
        if (document.body.getAttribute('data-active-tab') === 'finance') loadFinanceRecords();
      }).catch(error => console.error('Error deleting linked finance records:', error));
    };
    tx.onerror = () => {
      console.error("Error deleting session:", tx.error);
      showAlert("Error deleting session. Please try again.");
    };
  });
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

    const sessionItems = items.filter(item => String(item.sessionId) === String(session.id));
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

    const sessionItems = items.filter(item => String(item.sessionId) === String(session.id));

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
    const sessionItems = items.filter(item => String(item.sessionId) === String(session.id));

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
      <button class="edit-btn" onclick="event.stopPropagation(); editSession(${session.id})"><i class="fas fa-edit"></i></button>
      <button class="delete-btn" onclick="event.stopPropagation(); deleteSession(${session.id})"><i class="fas fa-trash"></i></button>
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

      licenseExpiryBox.classList.remove('license-warning-ok', 'license-warning-urgent', 'license-warning-soon', 'license-warning-expired');

      if (daysUntilExpiry < 0) {
        licenseExpiryBox.classList.add('license-warning-expired');
      } else if (daysUntilExpiry <= 7) {
        licenseExpiryBox.classList.add('license-warning-urgent');
      } else if (daysUntilExpiry <= 30) {
        licenseExpiryBox.classList.add('license-warning-soon');
      } else {
        licenseExpiryBox.classList.add('license-warning-ok');
      }
    } else {
      licenseExpiryEl.textContent = '—';
      licenseExpiryBox.classList.remove('license-warning-ok', 'license-warning-urgent', 'license-warning-soon', 'license-warning-expired');
    }
  }
}

// ================================
// Export/Import Functions
// ================================
// Internal export function that returns data (for auto-backup)
async function exportAllDataInternal() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    const tx = db.transaction(["sessions", "items", "categories", "fuelRecords", "fuelSessions", "financeRecords", "financeCategories", "settings"], "readonly");
    const sessionStore = tx.objectStore("sessions");
    const itemStore = tx.objectStore("items");
    const categoryStore = tx.objectStore("categories");
    const fuelRecordStore = tx.objectStore("fuelRecords");
    const fuelSessionStore = tx.objectStore("fuelSessions");
    const financeStore = tx.objectStore("financeRecords");
    const financeCategoryStore = tx.objectStore("financeCategories");
    const settingsStore = tx.objectStore("settings");

    const sessions = [];
    const items = [];
    const categories = [];
    const fuelRecords = [];
    const fuelSessions = [];
    const financeRecords = [];
    const financeCategories = [];
    const settings = [];

    let completed = 0;
    const checkComplete = () => {
      completed++;
      if (completed === 8) {
        const exportData = {
          sessions,
          items,
          categories,
          fuelRecords,
          fuelSessions,
          financeRecords,
          financeCategories,
          settings,
          currentOdometer,
          fuelPricePerLiter,
          oilPrice: parseFloat(localStorage.getItem('oilPrice')) || 0,
          oilFilterPrice: parseFloat(localStorage.getItem('oilFilterPrice')) || 0,
          oilChangeIntervalKm: parseInt(localStorage.getItem('oilChangeIntervalKm')) || 0,
          carInfo,
          exportDate: new Date().toISOString()
        };
        resolve(exportData);
      }
    };

    tx.onerror = () => reject(tx.error);

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

    financeStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        financeRecords.push(cursor.value);
        cursor.continue();
      } else {
        checkComplete();
      }
    };

    financeCategoryStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        financeCategories.push(cursor.value);
        cursor.continue();
      } else {
        checkComplete();
      }
    };

    settingsStore.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        settings.push(cursor.value);
        cursor.continue();
      } else {
        checkComplete();
      }
    };
  });
}

function exportAllData() {
  if (!db) {
    showAlert("Database not initialized. Please refresh the page.");
    return;
  }
  
  exportAllDataInternal().then(exportData => {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `car-maintenance-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    localStorage.setItem('lastExportDate', exportData.exportDate);
    if (typeof updateLastExportCounter === 'function') {
      updateLastExportCounter();
    }
  }).catch(error => {
    console.error("Export failed:", error);
    showAlert("Export failed: " + error.message);
  });
}

function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const importData = JSON.parse(event.target.result);

      showConfirm(`This will replace all existing data with the imported data. Are you sure you want to continue?`).then(confirmed => {
        if (!confirmed) return;
        importAllData(importData);
      });
    } catch (error) {
      showAlert('Error reading file. Please make sure it\'s a valid JSON file.');
    }
  };

  reader.readAsText(file);
  e.target.value = '';
}

// Internal import function (for auto-backup restore)
function importDataInternal(importData) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    
    const tx = db.transaction(["sessions", "items", "categories", "fuelRecords", "fuelSessions", "financeRecords", "financeCategories", "settings"], "readwrite");

    tx.onerror = () => reject(tx.error);

    tx.objectStore("sessions").clear();
    tx.objectStore("items").clear();
    tx.objectStore("categories").clear();
    tx.objectStore("fuelRecords").clear();
    tx.objectStore("fuelSessions").clear();
    tx.objectStore("financeRecords").clear();
    if (Array.isArray(importData.financeCategories)) tx.objectStore("financeCategories").clear();
    tx.objectStore("settings").clear();

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

    if (importData.financeRecords) {
      importData.financeRecords.forEach(record => {
        const normalizedRecord = {
          ...record,
          categoryType: record.categoryType || record.type || inferFinanceCategoryType(record.category || ''),
          fundingSource: record.fundingSource || (record.fuelRecordId ? 'uber' : 'personal')
        };
        tx.objectStore("financeRecords").add(normalizedRecord);
      });
    }

    if (importData.financeCategories) {
      importData.financeCategories.forEach(category => {
        tx.objectStore("financeCategories").add({
          ...category,
          type: category.type || inferFinanceCategoryType(category.name || '')
        });
      });
    }

    if (importData.settings) {
      importData.settings.forEach(setting => {
        tx.objectStore("settings").put(setting);
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
      }

      if (importData.oilPrice !== undefined && importData.oilPrice !== null) {
        if (importData.oilPrice > 0) {
          localStorage.setItem('oilPrice', importData.oilPrice.toString());
        } else {
          localStorage.removeItem('oilPrice');
        }
      }

      if (importData.oilFilterPrice !== undefined && importData.oilFilterPrice !== null) {
        if (importData.oilFilterPrice > 0) {
          localStorage.setItem('oilFilterPrice', importData.oilFilterPrice.toString());
        } else {
          localStorage.removeItem('oilFilterPrice');
        }
      }

      if (importData.oilChangeIntervalKm !== undefined && importData.oilChangeIntervalKm !== null) {
        if (importData.oilChangeIntervalKm > 0) {
          localStorage.setItem('oilChangeIntervalKm', importData.oilChangeIntervalKm.toString());
        } else {
          localStorage.removeItem('oilChangeIntervalKm');
        }
      }

      if (importData.carInfo) {
        carInfo = importData.carInfo;
        localStorage.setItem('carInfo', JSON.stringify(carInfo));
      }

      loadFuelSettings();
      
      resolve();
    };
  });
}

function importAllData(importData) {
  importDataInternal(importData).then(() => {
    // Reload fuel analytics if fuel app is initialized
    if (typeof fuelApp !== 'undefined' && fuelApp) {
      fuelApp.stateManager.loadSession('default');
    }

    if (importData.exportDate) {
      localStorage.setItem('lastExportDate', importData.exportDate);
    } else {
      localStorage.setItem('lastExportDate', new Date().toISOString());
    }
    if (typeof updateLastExportCounter === 'function') {
      updateLastExportCounter();
    }

    showAlert('Data imported successfully!');
    renderAll();
    loadCategoriesForFilter();
    loadFinanceRecords();
    updateFinanceKPIs();
  }).catch(error => {
    console.error("Import failed:", error);
    showAlert('Error importing data. Please try again.');
  });
}

// Function to delete the entire database (useful when database is corrupted)
function resetAllData() {
  showConfirm('Are you sure you want to reset ALL data? This action cannot be undone!').then(confirmed => {
    if (!confirmed) return;

    return showConfirm('This permanently deletes all records, settings, saved backups, and custom categories. Default maintenance and finance categories will be restored. Are you sure?', 'Confirm');
  }).then(confirmed => {
    if (!confirmed) return;

    if (!db) {
      showAlert("Database not initialized. Please refresh the page.");
      return;
    }

    try {
      const storeNames = ["sessions", "items", "categories", "fuelRecords", "fuelSessions", "financeRecords", "financeCategories", "settings", SELECTIVE_BACKUP_STORE];
      const tx = db.transaction(storeNames, "readwrite");
      const maintenanceCategories = tx.objectStore("categories");
      const financeCategories = tx.objectStore("financeCategories");

      storeNames.forEach(name => tx.objectStore(name).clear());
      DEFAULT_MAINTENANCE_CATEGORIES.forEach(category => maintenanceCategories.add(category));
      DEFAULT_FINANCE_CATEGORIES.forEach(category => financeCategories.add(category));

      tx.oncomplete = () => {
        Object.keys(localStorage)
          .filter(key => key.startsWith('auto_backup_'))
          .forEach(key => localStorage.removeItem(key));
        [
          'carInfo',
          'carName',
          'fuelPricePerLiter',
          'oilPrice',
          'oilFilterPrice',
          'oilChangeIntervalKm',
          'fuel_max_interval_km',
          'fuel_min_consumption',
          'fuel_max_consumption',
          'lastExportDate',
          'siteDataBlurred'
        ].forEach(key => localStorage.removeItem(key));
        lastAutoBackup = null;
        document.body.classList.remove('data-blurred');
        const blurIcon = document.querySelector('#headerBlurBtn i');
        if (blurIcon) {
          blurIcon.classList.remove('fa-eye-slash');
          blurIcon.classList.add('fa-eye');
        }

        // Reset odometer
        currentOdometer = 0;
        localStorage.setItem('currentOdometer', '0');
        if (odometerValue) odometerValue.textContent = '0';

        // Reset car info
        carName = 'My Car';
        if (carNameDisplay) carNameDisplay.textContent = carName;
        carInfo = {
          manufacturer: '',
          model: '',
          year: '',
          plate: '',
          color: '#3b82f6',
          licenseExpiry: ''
        };
        renderCarInfo();
        updateLastExportCounter();

        // Reset fuel price per liter
        fuelPricePerLiter = 0;
        loadFuelSettings();

        // Reset fuel analytics
        if (typeof fuelApp !== 'undefined' && fuelApp) {
          fuelApp.stateManager.analyticsEngine = new FuelAnalyticsEngine();
          fuelApp.stateManager.loadSession('default');
        }

        // Reset finance records
        allFinanceRecords = [];
        financeCurrentPage = 1;

        financeCategoryCurrentPages = { income: 1, expense: 1 };
        showAlert('All data has been reset. Default categories have been restored.');
        renderAll();
        loadCategoriesList();
        loadFinanceCategoriesList();
        loadCategoriesForFilter();

        // Refresh finance if on finance tab
        if (document.body.getAttribute('data-active-tab') === 'finance') {
          loadFinanceRecords();
        }
      };

      tx.onerror = () => {
        showAlert('Error resetting data: ' + (tx.error ? tx.error.message : 'Please try again.'));
      };

    } catch (err) {
      showAlert('Error resetting data: ' + (err && err.message ? err.message : 'Please try again.'));
    }
  }).catch(() => {});
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
        <div class="empty-icon"><i class="fas fa-gas-pump"></i></div>
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

  container.innerHTML = pageRecords.map(record => {
    const pricePerLiter = record.pricePerLiter || (record.totalCost && record.liters ? record.totalCost / record.liters : 0);
    return `
    <div class="fuel-history-item" data-record-id="${record.id}">
      <div class="fuel-history-header">
        <div class="fuel-history-header-main">
          <span class="date">${formatDateToBritish(record.date)}</span>
          ${record.isFullTank ? '<span class="full-tank-badge">Full Tank</span>' : ''}
        </div>
        <button class="edit-btn" onclick="editFuelRecord('${record.id}')" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" onclick="deleteFuelRecord('${record.id}')" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
      <div class="fuel-history-details">
        <span class="odometer">${parseFloat(record.odometer || 0).toLocaleString()} km</span>
        <span class="liters">${parseFloat(record.liters || 0).toFixed(2)} L</span>
        <span class="price">${parseFloat(pricePerLiter).toFixed(2)} EGP/L</span>
        <span class="total">${parseFloat(record.totalCost || 0).toLocaleString()} EGP</span>
      </div>
    </div>
  `;
  }).join('');

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
    setActiveTab('fuel');
    fuelApp.editRecord(recordId);
  }
}

function deleteFuelRecord(recordId) {
  if (typeof fuelApp !== 'undefined' && fuelApp) {
    fuelApp.deleteRecord(recordId);
  } else {
    // Fallback: delete directly from database
    if (!db) return;
    showConfirm('Delete this fuel record?').then(confirmed => {
      if (!confirmed) return;
      const tx = db.transaction('fuelRecords', 'readwrite');
      const store = tx.objectStore('fuelRecords');
      store.delete(recordId);
      tx.oncomplete = () => {
        showAlert('Fuel record deleted');
        loadFuelRecordsDirectly();
      };
    });
  }
}

// Fallback function to load fuel records directly without fuelApp
function loadFuelRecordsDirectly() {
  if (!db) return;
  const tx = db.transaction('fuelRecords', 'readonly');
  const store = tx.objectStore('fuelRecords');
  const records = [];
  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      records.push(cursor.value);
      cursor.continue();
    } else {
      renderFuelHistoryPaginated(records);
    }
  };
}

// ================================
// FINANCE MANAGEMENT
// ================================

// Finance DOM Elements
const addFundsBtn = document.getElementById('addFundsBtn');
const clearFinanceHistoryBtn = document.getElementById('clearFinanceHistoryBtn');
const undoFinanceFreshBtn = document.getElementById('undoFinanceFreshBtn');
const addFundsPopup = document.getElementById('addFundsPopup');
const saveFundBtn = document.getElementById('saveFundBtn');
const fundDate = document.getElementById('fundDate');
const fundExcludeFromKpis = document.getElementById('fundExcludeFromKpis');
const fundAmount = document.getElementById('fundAmount');
const fundSource = document.getElementById('fundSource');
const fundType = document.getElementById('fundType');
const fundCategory = document.getElementById('fundCategory');
const fundNotes = document.getElementById('fundNotes');
const transactionsList = document.getElementById('transactionsList');
const financePaginationControls = document.getElementById('financePaginationControls');
const financePrevPageBtn = document.getElementById('financePrevPageBtn');
const financeNextPageBtn = document.getElementById('financeNextPageBtn');
const financePageInfo = document.getElementById('financePageInfo');
const financeEmptyState = document.getElementById('financeEmptyState');
const financeTotalSavings = document.getElementById('financeTotalSavings');
const financeMonthlyIncome = document.getElementById('financeMonthlyIncome');
const financeMonthlyExpenses = document.getElementById('financeMonthlyExpenses');
const financeNetBalance = document.getElementById('financeNetBalance');
const financePersonalBalance = document.getElementById('financePersonalBalance');
const financeUberBalance = document.getElementById('financeUberBalance');
const financeTypeFilter = document.getElementById('financeTypeFilter');
const financeSourceFilter = document.getElementById('financeSourceFilter');
const financeSortOrder = document.getElementById('financeSortOrder');
const toggleFinanceFiltersBtn = document.getElementById('toggleFinanceFiltersBtn');
const financeHistoryControls = document.getElementById('financeHistoryControls');
const fundingSource = document.getElementById('fundingSource');
const editTransactionType = document.getElementById('editTransactionType');
const editTransactionFundingSource = document.getElementById('editTransactionFundingSource');
const editFinanceCategoryType = document.getElementById('editFinanceCategoryType');
const editFinanceCategoryTypeGroup = document.getElementById('editFinanceCategoryTypeGroup');
const pageTitle = document.getElementById('pageTitle');
const editTransactionPopup = document.getElementById('editTransactionPopup');
const editTransactionId = document.getElementById('editTransactionId');
const editTransactionDate = document.getElementById('editTransactionDate');
const editTransactionExcludeFromKpis = document.getElementById('editTransactionExcludeFromKpis');
const editTransactionAmount = document.getElementById('editTransactionAmount');
const editTransactionDescription = document.getElementById('editTransactionDescription');
const editTransactionCategory = document.getElementById('editTransactionCategory');
const editTransactionNotes = document.getElementById('editTransactionNotes');
const saveTransactionEditBtn = document.getElementById('saveTransactionEditBtn');

// Finance State
let allFinanceRecords = [];
let filteredFinanceRecords = [];
let financeCurrentPage = 1;
const financePerPage = 8;

function getCurrentTimeInput() {
  return new Date().toTimeString().slice(0, 5);
}

function getTodayDateInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function combineEventDateTime(date, time = '00:00') {
  if (!date) return '';
  const localDate = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(localDate.getTime()) ? '' : localDate.toISOString();
}

function getRecordEventTimestamp(record) {
  if (record?.eventAt) {
    const timestamp = new Date(record.eventAt).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
  if (record?.date) {
    const legacyTimestamp = new Date(`${record.date}T${record.time || '00:00'}:00`).getTime();
    if (!Number.isNaN(legacyTimestamp)) return legacyTimestamp;
  }
  return 0;
}

function getRecordTimeInput(record) {
  if (record?.time && /^\d{2}:\d{2}$/.test(record.time)) return record.time;
  if (record?.eventAt) {
    const date = new Date(record.eventAt);
    if (!Number.isNaN(date.getTime())) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return '00:00';
}

// Migrate old maintenance and fuel data to finance records
function migrateOldDataToFinance(silent = false) {
  if (!db) {
    if (!silent) showAlert('Database not initialized');
    return;
  }

  if (!silent) {
    showConfirm('This will migrate your old maintenance sessions and fuel records to the transaction history. This may take a moment. Continue?', 'Migrate Old Data').then(confirmed => {
      if (!confirmed) return;
      performMigration(silent);
    });
  } else {
    performMigration(silent);
  }
}

function performMigration(silent = false) {
  let migratedCount = 0;

    // Start with a single transaction for all migration
    const tx = db.transaction(['sessions', 'items', 'fuelRecords', 'financeRecords', 'financeCategories'], 'readwrite');
    const sessionStore = tx.objectStore('sessions');
    const itemStore = tx.objectStore('items');
    const fuelStore = tx.objectStore('fuelRecords');
    const financeStore = tx.objectStore('financeRecords');
    const categoryStore = tx.objectStore('financeCategories');

    // Get all sessions first
    let allSessions = [];
    const getSessionsRequest = sessionStore.openCursor();
    getSessionsRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        allSessions.push(cursor.value);
        cursor.continue();
      } else {
        // All sessions collected, now process them
        processSessions();
      }
    };

    const processSessions = () => {
      let processed = 0;

      allSessions.forEach(session => {
        // Get items for this session
        const itemsRequest = itemStore.index('sessionId').getAll(session.id);
        itemsRequest.onsuccess = (event) => {
          const items = event.target.result || [];
          const financeItems = items.filter(i => i.financeIncluded === true);
          const totalCost = financeItems.reduce((sum, i) => sum + (i.price || 0), 0);

          if (totalCost > 0 && (session.financeIncluded === true || financeItems.length > 0)) {
            // Check if already migrated
            const checkRequest = financeStore.index('sessionId').get(session.id);
            checkRequest.onsuccess = (checkEvent) => {
              if (!checkEvent.target.result) {
                // Not migrated, so add it
                const record = {
                  date: session.date,
                  amount: totalCost,
                  description: session.merchant ? `Maintenance - ${session.merchant}` : 'Maintenance Session',
                  category: 'Maintenance',
                  categoryColor: '#f59e0b',
                  notes: financeItems.map(i => `${i.name} (${i.price} EGP)`).join(', '),
                  type: 'expense',
                  sessionId: session.id,
                  createdAt: new Date().toISOString()
                };

                const addRequest = financeStore.add(record);
                addRequest.onsuccess = () => {
                  migratedCount++;
                };
                addRequest.onerror = () => {
                  console.error('Error adding maintenance record:', addRequest.error);
                };
              }
            };
          }

          processed++;
          if (processed === allSessions.length) {
            // All sessions processed, now do fuel records
            processFuel();
          }
        };
      });

      if (allSessions.length === 0) {
        processFuel();
      }
    };

    const processFuel = () => {
      let allFuels = [];
      const getFuelsRequest = fuelStore.openCursor();
      getFuelsRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          allFuels.push(cursor.value);
          cursor.continue();
        } else {
          let processed = 0;

          allFuels.forEach(fuel => {
            if (fuel.totalCost > 0 && fuel.financeIncluded === true) {
              // Check if already migrated
              const checkRequest = financeStore.index('fuelRecordId').get(fuel.id);
              checkRequest.onsuccess = (checkEvent) => {
                if (!checkEvent.target.result) {
                  // Not migrated, so add it
                  const record = {
                    date: fuel.date,
                    amount: fuel.totalCost,
                    description: `Fuel - ${parseFloat(fuel.liters || 0).toFixed(2)} L @ ${parseFloat(fuel.odometer || 0).toLocaleString()} km`,
                    category: 'Fuel',
                    categoryColor: '#ef4444',
                    notes: fuel.notes || '',
                    type: 'expense',
                    fuelRecordId: fuel.id,
                    createdAt: new Date().toISOString()
                  };

                  const addRequest = financeStore.add(record);
                  addRequest.onsuccess = () => {
                    migratedCount++;
                  };
                  addRequest.onerror = () => {
                    console.error('Error adding fuel record:', addRequest.error);
                  };
                }
              };
            }

            processed++;
            if (processed === allFuels.length) {
              // Done processing fuel
            }
          });
        }
      };
    };

    tx.oncomplete = () => {
      if (!silent) {
        if (migratedCount === 0) {
          showAlert('No new records to migrate. All records have already been migrated.');
        } else {
          showAlert(`Migration completed! ${migratedCount} records added to transaction history.`);
        }
      }
      loadFinanceRecords();
      updateFinanceKPIs();
    };

    tx.onerror = () => {
      console.error('Migration error:', tx.error);
      if (!silent) showAlert('Migration failed. Please try again.');
    };
}

// Finance Event Listeners
function initializeFinanceEventListeners() {
  fundType?.addEventListener('change', () => populateFinanceCategorySelect(fundCategory, fundType.value));
  editTransactionType?.addEventListener('change', () => populateFinanceCategorySelect(editTransactionCategory, editTransactionType.value));
  [financeTypeFilter, financeSourceFilter, financeSortOrder].forEach(control => {
    control?.addEventListener('change', () => {
      financeCurrentPage = 1;
      renderFinancePage();
    });
  });
  toggleFinanceFiltersBtn?.addEventListener('click', () => {
    const expanded = toggleFinanceFiltersBtn.getAttribute('aria-expanded') === 'true';
    toggleFinanceFiltersBtn.setAttribute('aria-expanded', String(!expanded));
    if (financeHistoryControls) financeHistoryControls.hidden = expanded;
  });
  if (addFundsBtn) {
    addFundsBtn.addEventListener('click', openAddFundsPopup);
  }
  clearFinanceHistoryBtn?.addEventListener('click', clearFinanceHistory);
  undoFinanceFreshBtn?.addEventListener('click', undoFinanceFresh);
  refreshFinanceFreshUndoButton();
  if (saveFundBtn) {
    saveFundBtn.addEventListener('click', saveFund);
  }
  if (saveTransactionEditBtn) {
    saveTransactionEditBtn.addEventListener('click', saveTransactionEdit);
  }
  if (financePrevPageBtn) {
    financePrevPageBtn.addEventListener('click', () => changeFinancePage(-1));
  }
  if (financeNextPageBtn) {
    financeNextPageBtn.addEventListener('click', () => changeFinancePage(1));
  }
  const migrateOldDataBtn = document.getElementById('migrateOldDataBtn');
  if (migrateOldDataBtn) {
    migrateOldDataBtn.addEventListener('click', migrateOldDataToFinance);
  }

  // KPI card click -> show floating breakdown popup
  const totalSavingsCard = document.querySelector('.finance-kpi-card[data-kpi="totalSavings"]');
  if (totalSavingsCard && totalSavingsCard.dataset.detailsBound !== 'true') {
    totalSavingsCard.dataset.detailsBound = 'true';
    totalSavingsCard.style.cursor = 'pointer';
    totalSavingsCard.setAttribute('role', 'button');
    totalSavingsCard.setAttribute('tabindex', '0');
    totalSavingsCard.setAttribute('aria-label', 'Show total savings and money source details');
    totalSavingsCard.addEventListener('click', () => showFinanceKPIDetails('totalSavings'));
    totalSavingsCard.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showFinanceKPIDetails('totalSavings');
      }
    });
  }
}

function populateFinanceCategorySelect(selectElement, type, selectedName = '') {
  if (!db || !selectElement) return;
  const tx = db.transaction('financeCategories', 'readonly');
  const request = tx.objectStore('financeCategories').getAll();
  request.onsuccess = () => {
    selectElement.innerHTML = '<option value="">Select category...</option>';
    request.result
      .filter(category => (category.type || inferFinanceCategoryType(category.name)) === type)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        option.dataset.color = category.color || '#6b7280';
        if (category.name === selectedName) option.selected = true;
        selectElement.appendChild(option);
      });
  };
}

function inferFinanceCategoryType(name) {
  return ['Savings', 'Monthly Savings', 'Salary', 'Bonus', 'Refund', 'Uber Driving'].includes(name) ? 'income' : 'expense';
}

// Open Add Funds Popup
function openAddFundsPopup() {
  const today = getTodayDateInput();
  if (fundDate) fundDate.value = today;
  if (fundExcludeFromKpis) fundExcludeFromKpis.checked = false;
  if (fundAmount) fundAmount.value = '';
  if (fundSource) fundSource.value = '';
  if (fundType) fundType.value = 'income';
  if (fundingSource) fundingSource.value = 'personal';
  if (fundNotes) fundNotes.value = '';
  populateFinanceCategorySelect(fundCategory, 'income');

  if (addFundsPopup) {
    addFundsPopup.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

// Close Add Funds Popup
function closeAddFundsPopup() {
  if (addFundsPopup) {
    addFundsPopup.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

function clearFinanceHistory() {
  if (!db) return;

  showConfirm(
    'Hide Finance entries created from maintenance and fuel records? The source records and unrelated Finance transactions will remain saved. You can undo this from Settings.',
    'Start Fresh'
  ).then(confirmed => {
    if (!confirmed || !db) return;

    getLatestFinanceFreshBackup().then(existingBackup => {
      if (existingBackup) {
        showAlert('Finance Start Fresh is already active. Use Undo Start Fresh in Settings before starting again.');
        return false;
      }
      return Promise.all([getStoreRecords('sessions'), getStoreRecords('fuelRecords')])
        .then(([sessions, fuelRecords]) => {
          const sessionFinanceFlags = sessions
            .filter(session => session.financeIncluded !== false)
            .map(({ id, financeIncluded }) => ({ id, financeIncluded }));
          const fuelFinanceFlags = fuelRecords
            .filter(record => record.financeIncluded !== false)
            .map(({ id, financeIncluded }) => ({ id, financeIncluded }));

          if (!sessionFinanceFlags.length && !fuelFinanceFlags.length) {
            showAlert('There are no included maintenance or fuel records to hide.');
            return false;
          }
          if (typeof saveSelectiveBackup !== 'function') {
            throw new Error('Finance undo marker helper unavailable');
          }

          return saveSelectiveBackup({
            stores: {},
            meta: { action: 'finance-start-fresh', sessionFinanceFlags, fuelFinanceFlags }
          }).then(() => new Promise((resolve, reject) => {
            const tx = db.transaction(['sessions', 'fuelRecords'], 'readwrite');
            [
              ['sessions', sessionFinanceFlags],
              ['fuelRecords', fuelFinanceFlags]
            ].forEach(([storeName, records]) => {
              const ids = new Set(records.map(record => String(record.id)));
              const store = tx.objectStore(storeName);
              store.openCursor().onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) return;
                if (ids.has(String(cursor.value.id))) {
                  cursor.update({ ...cursor.value, financeIncluded: false });
                }
                cursor.continue();
              };
            });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('Could not hide linked Finance entries'));
          })).then(() => true);
        });
    }).then(didStartFresh => {
      if (!didStartFresh || !db) return;
      reconcileLinkedFinanceRecords().then(() => {
        loadFinanceRecordsFromStore();
        updateFinanceKPIs();
        refreshFinanceFreshUndoButton();
        if (typeof fuelApp !== 'undefined' && fuelApp) {
          fuelApp.stateManager.loadSession('default');
        }
        showAlert('Maintenance and fuel Finance entries are hidden. You can undo this from Settings.');
      }).catch(error => {
        console.error('Could not refresh Finance after Start Fresh:', error);
        showAlert('The source records were preserved, but Finance could not be refreshed. Please reload and try again.');
      });
    }).catch(error => {
      console.error('Could not apply Finance Start Fresh:', error);
      showAlert('Could not start fresh in Finance. Please try again.');
    });
  });
}

function getLatestFinanceFreshBackup() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    try {
      const tx = db.transaction([SELECTIVE_BACKUP_STORE], 'readonly');
      const request = tx.objectStore(SELECTIVE_BACKUP_STORE)
        .index('createdAt')
        .openCursor(null, 'prev');

      request.onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve(null);
          return;
        }
        if (cursor.value.backup?.meta?.action === 'finance-start-fresh') {
          resolve(cursor.value);
          return;
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error || new Error('Could not read Finance backup'));
    } catch (error) {
      reject(error);
    }
  });
}

function refreshFinanceFreshUndoButton() {
  if (!undoFinanceFreshBtn) return;
  undoFinanceFreshBtn.disabled = true;
  getLatestFinanceFreshBackup().then(backup => {
    undoFinanceFreshBtn.disabled = !backup;
  }).catch(error => {
    console.error('Could not check for a Finance Start Fresh backup:', error);
  });
}

function undoFinanceFresh() {
  if (!db) return;

  getLatestFinanceFreshBackup().then(backupRecord => {
    if (!backupRecord?.backup) {
      showAlert('No Start Fresh backup is available to restore.');
      refreshFinanceFreshUndoButton();
      return;
    }

    showConfirm(
      'Show Finance entries again for the maintenance and fuel records that Start Fresh hid? Current source records will be reread, and unrelated Finance transactions will not be changed.',
      'Undo Start Fresh'
    ).then(confirmed => {
      if (!confirmed || !db) return;

      const backup = backupRecord.backup;
      const transaction = db.transaction(['sessions', 'fuelRecords', SELECTIVE_BACKUP_STORE], 'readwrite');
      [
        ['sessions', backup.meta.sessionFinanceFlags || []],
        ['fuelRecords', backup.meta.fuelFinanceFlags || []]
      ].forEach(([storeName, flags]) => {
        const originalFlags = new Map(flags.map(({ id, financeIncluded }) => [String(id), financeIncluded]));
        const store = transaction.objectStore(storeName);
        store.openCursor().onsuccess = event => {
          const cursor = event.target.result;
          if (!cursor) return;

          const key = String(cursor.value.id);
          if (originalFlags.has(key) && cursor.value.financeIncluded === false) {
            const restoredRecord = { ...cursor.value };
            const financeIncluded = originalFlags.get(key);
            if (financeIncluded === undefined) delete restoredRecord.financeIncluded;
            else restoredRecord.financeIncluded = financeIncluded;
            cursor.update(restoredRecord);
          }
          cursor.continue();
        };
      });
      transaction.objectStore(SELECTIVE_BACKUP_STORE).openCursor().onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (cursor.value.backup?.meta?.action === 'finance-start-fresh') cursor.delete();
        cursor.continue();
      };

      transaction.oncomplete = () => {
        financeCurrentPage = 1;
        reconcileLinkedFinanceRecords().then(() => {
          loadFinanceRecordsFromStore();
          updateFinanceKPIs();
          refreshFinanceFreshUndoButton();
          if (typeof fuelApp !== 'undefined' && fuelApp) {
            fuelApp.stateManager.loadSession('default');
          }
          showAlert('Finance entries were reread from the current maintenance and fuel records.');
        }).catch(error => {
          console.error('Could not reconcile Finance after Undo Start Fresh:', error);
          showAlert('The source records were restored, but Finance could not be refreshed. Please reload.');
        });
      };

      transaction.onerror = () => {
        console.error('Could not undo Finance Start Fresh:', transaction.error);
        showAlert('Could not undo Finance Start Fresh. Please try again.');
      };
    });
  }).catch(error => {
    console.error('Could not load Finance Start Fresh backup:', error);
    showAlert('Could not load the Finance backup. Please try again.');
  });
}

// Save Fund
function saveFund() {
  if (!db) return;

  // Prevent double submission
  if (saveFund.isSubmitting) return;
  saveFund.isSubmitting = true;

  const date = fundDate?.value;
  const time = getCurrentTimeInput();
  const amount = parseFloat(fundAmount?.value);
  const source = fundSource?.value?.trim();
  const category = fundCategory?.value || 'Uncategorized';
  const type = fundType?.value || 'income';
  const notes = fundNotes?.value?.trim();
  const moneySource = fundingSource?.value || 'personal';
  const eventAt = combineEventDateTime(date, time);

  if (!date || isNaN(amount) || amount <= 0) {
    showAlert('Please enter a valid date and amount');
    saveFund.isSubmitting = false;
    return;
  }

  // Description fallback to category name if source is empty
  const description = source || category || (type === 'income' ? 'Income' : 'Expense');

  // Get category color from database
  let categoryColor = '#6b7280'; // Default gray
  if (category) {
    const tx = db.transaction('financeCategories', 'readonly');
    const store = tx.objectStore('financeCategories');
    const request = store.getAll();

    request.onsuccess = e => {
      const categoryRecord = e.target.result.find(item => item.name === category && (item.type || inferFinanceCategoryType(item.name)) === type);
      if (categoryRecord && categoryRecord.color) {
        categoryColor = categoryRecord.color;
      }

      const record = {
        date: date,
        time: time,
        eventAt,
        amount: amount,
        description: description,
        category: category,
        categoryColor: categoryColor,
        categoryType: type,
        fundingSource: moneySource,
        notes: notes,
        type: type,
        excludeFromKpis: fundExcludeFromKpis?.checked === true,
        sessionId: null,
        fuelRecordId: null,
        createdAt: new Date().toISOString()
      };

      const tx2 = db.transaction('financeRecords', 'readwrite');
      const store2 = tx2.objectStore('financeRecords');
      store2.add(record);

      tx2.oncomplete = () => {
        closeAddFundsPopup();
        loadFinanceRecords();
        updateFinanceKPIs();
        saveFund.isSubmitting = false;
      };

      tx2.onerror = () => {
        showAlert('Error saving transaction. Please try again.');
        saveFund.isSubmitting = false;
      };
    };

    request.onerror = () => {
      // Fallback if category lookup fails
      const record = {
        date: date,
        time: time,
        eventAt,
        amount: amount,
        description: description,
        category: category,
        categoryColor: categoryColor,
        categoryType: type,
        fundingSource: moneySource,
        notes: notes,
        type: type,
        excludeFromKpis: fundExcludeFromKpis?.checked === true,
        sessionId: null,
        fuelRecordId: null,
        createdAt: new Date().toISOString()
      };

      const tx2 = db.transaction('financeRecords', 'readwrite');
      const store2 = tx2.objectStore('financeRecords');
      store2.add(record);

      tx2.oncomplete = () => {
        closeAddFundsPopup();
        loadFinanceRecords();
        updateFinanceKPIs();
        saveFund.isSubmitting = false;
      };

      tx2.onerror = () => {
        showAlert('Error saving transaction. Please try again.');
        saveFund.isSubmitting = false;
      };
    };
  } else {
    // No category selected
    const record = {
      date: date,
      time: time,
      eventAt,
      amount: amount,
      description: description,
      category: 'Other',
      categoryColor: categoryColor,
      categoryType: type,
      fundingSource: moneySource,
      notes: notes,
      type: type,
      excludeFromKpis: fundExcludeFromKpis?.checked === true,
      sessionId: null,
      fuelRecordId: null,
      createdAt: new Date().toISOString()
    };

    const tx2 = db.transaction('financeRecords', 'readwrite');
    const store2 = tx2.objectStore('financeRecords');
    store2.add(record);

    tx2.oncomplete = () => {
      closeAddFundsPopup();
      loadFinanceRecords();
      updateFinanceKPIs();
      saveFund.isSubmitting = false;
    };

    tx2.onerror = () => {
      showAlert('Error saving transaction. Please try again.');
      saveFund.isSubmitting = false;
    };
  }
}

// Load Finance Records
function loadFinanceRecords() {
  if (!db || !transactionsList) return;

  reconcileLinkedFinanceRecords().then(() => loadFinanceRecordsFromStore()).catch(error => {
    console.error('Finance reconciliation failed:', error);
    loadFinanceRecordsFromStore();
  });
}

function getStoreRecords(storeName) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function reconcileLinkedFinanceRecords() {
  const [sessions, items, fuelRecords] = await Promise.all([
    getStoreRecords('sessions'),
    getStoreRecords('items'),
    getStoreRecords('fuelRecords')
  ]);

  const expected = [];
  sessions.forEach(session => {
    if (session.financeIncluded === false) return;
    const sessionItems = items.filter(item => String(item.sessionId) === String(session.id));
    const financeItems = sessionItems.filter(item => (parseFloat(item.price) || 0) > 0);
    const amount = financeItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    if (amount > 0) {
      expected.push({
        sourceField: 'sessionId', sourceId: session.id, amount,
        date: session.date,
        description: session.merchant ? `Maintenance - ${session.merchant}` : 'Maintenance Session',
        category: 'Maintenance', categoryColor: '#f59e0b',
        fundingSource: session.fundingSource || 'personal',
        eventAt: session.eventAt || combineEventDateTime(session.date, session.time || '00:00'),
        time: session.time || getRecordTimeInput(session),
        notes: financeItems.map(item => `${item.name} (${item.price} EGP)`).join(', '),
        odometer: session.odometer || 0,
        includedItems: financeItems.map(item => ({ id: item.id, name: item.name, price: parseFloat(item.price) || 0 }))
      });
    }
  });

  fuelRecords.forEach(fuelRecord => {
    if (fuelRecord.financeIncluded === false || !(parseFloat(fuelRecord.totalCost) > 0)) return;
    expected.push({
      sourceField: 'fuelRecordId', sourceId: fuelRecord.id,
      amount: parseFloat(fuelRecord.totalCost), date: fuelRecord.date,
      description: `Fuel - ${parseFloat(fuelRecord.liters || 0).toFixed(2)} L @ ${parseFloat(fuelRecord.odometer || 0).toLocaleString()} km`,
      category: 'Fuel', categoryColor: '#ef4444', fundingSource: fuelRecord.fundingSource || 'uber',
      eventAt: fuelRecord.eventAt || combineEventDateTime(fuelRecord.date, fuelRecord.time || '00:00'),
      time: fuelRecord.time || getRecordTimeInput(fuelRecord), notes: fuelRecord.notes || ''
    });
  });

  return new Promise((resolve, reject) => {
    const tx = db.transaction('financeRecords', 'readwrite');
    const store = tx.objectStore('financeRecords');
    const expectedKeys = new Set(expected.map(record => `${record.sourceField}:${record.sourceId}`));
    const retainedKeys = new Set();
    const linkedRecords = [];

    store.openCursor().onsuccess = event => {
      const cursor = event.target.result;
      if (cursor) {
        const record = cursor.value;
        if (record.sessionId != null || record.fuelRecordId != null) {
          linkedRecords.push(record);
        }
        cursor.continue();
      } else {
        linkedRecords.forEach(record => {
          const sourceField = record.sessionId != null ? 'sessionId' : 'fuelRecordId';
          const key = `${sourceField}:${record[sourceField]}`;
          if (!expectedKeys.has(key) || retainedKeys.has(key)) store.delete(record.id);
          else retainedKeys.add(key);
        });
        expected.forEach(record => {
          const existing = linkedRecords.find(candidate =>
            String(candidate[record.sourceField]) === String(record.sourceId)
          );
          store.put({
            ...(existing || {}),
            date: record.date,
            amount: record.amount,
            description: record.description,
            category: record.category,
            categoryColor: record.categoryColor,
            fundingSource: record.fundingSource,
            eventAt: record.eventAt,
            time: record.time,
            notes: record.notes,
            odometer: record.odometer,
            includedItems: record.includedItems,
            type: 'expense',
            [record.sourceField]: record.sourceId,
            createdAt: existing?.createdAt || new Date().toISOString()
          });
        });
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Finance reconciliation failed'));
  });
}

function loadFinanceRecordsFromStore() {
  if (!db || !transactionsList) return;

  // Reset the array to prevent duplicates
  allFinanceRecords = [];

  const tx = db.transaction('financeRecords', 'readonly');
  const store = tx.objectStore('financeRecords');

  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (cursor) {
      allFinanceRecords.push(cursor.value);
      cursor.continue();
    } else {
      // Remove duplicates based on record id
      const uniqueIds = new Set();
      allFinanceRecords = allFinanceRecords.filter(record => {
        if (uniqueIds.has(record.id)) {
          return false;
        }
        uniqueIds.add(record.id);
        return true;
      });

      // Sort by date descending (newest first)
      financeCurrentPage = Math.max(1, Math.min(financeCurrentPage, Math.max(1, Math.ceil(getFilteredFinanceRecords().length / financePerPage))));
      renderFinancePage();
      updateFinanceKPIs();
      setupTransactionCardEventListeners();
    }
  };
}

function getFinanceRecordSource(record) {
  return record.fundingSource || (record.fuelRecordId ? 'uber' : 'personal');
}

function getFilteredFinanceRecords() {
  const typeFilter = financeTypeFilter?.value || 'all';
  const sourceFilter = financeSourceFilter?.value || 'all';
  const sortOrder = financeSortOrder?.value || 'newest';
  const records = allFinanceRecords.filter(record =>
    (typeFilter === 'all' || record.type === typeFilter) &&
    (sourceFilter === 'all' || getFinanceRecordSource(record) === sourceFilter)
  );
  records.sort((a, b) => {
    if (sortOrder === 'oldest' || sortOrder === 'newest') {
      const difference = getRecordEventTimestamp(a) - getRecordEventTimestamp(b);
      if (difference !== 0) return sortOrder === 'oldest' ? difference : -difference;
      const createdDifference = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (createdDifference !== 0) return sortOrder === 'oldest' ? createdDifference : -createdDifference;
      return sortOrder === 'oldest' ? Number(a.id || 0) - Number(b.id || 0) : Number(b.id || 0) - Number(a.id || 0);
    }
    const amountDifference = (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
    if (amountDifference !== 0) return sortOrder === 'amount-asc' ? amountDifference : -amountDifference;
    return getRecordEventTimestamp(b) - getRecordEventTimestamp(a);
  });
  return records;
}

// Render Finance Page
function renderFinancePage() {
  if (!transactionsList) return;

  filteredFinanceRecords = getFilteredFinanceRecords();
  if (filteredFinanceRecords.length === 0) {
    transactionsList.innerHTML = '';
    if (financeEmptyState) {
      financeEmptyState.style.display = 'block';
      const message = financeEmptyState.querySelector('p');
      const hint = financeEmptyState.querySelector('span');
      if (message) message.textContent = allFinanceRecords.length ? 'No matching transactions' : 'No transactions yet';
      if (hint) hint.textContent = allFinanceRecords.length ? 'Try changing the filters above.' : 'Add funds or record maintenance to see transactions';
    }
    if (financePaginationControls) financePaginationControls.style.display = 'none';
    return;
  }

  if (financeEmptyState) financeEmptyState.style.display = 'none';

  const totalPages = Math.ceil(filteredFinanceRecords.length / financePerPage);
  const startIndex = (financeCurrentPage - 1) * financePerPage;
  const endIndex = startIndex + financePerPage;
  const pageRecords = filteredFinanceRecords.slice(startIndex, endIndex);
  const monthTotals = new Map();
  const monthLastIndexes = new Map();
  filteredFinanceRecords.forEach((record, index) => {
    const date = new Date(getRecordEventTimestamp(record));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const totals = monthTotals.get(key) || { income: 0, expenses: 0, label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
    const amount = parseFloat(record.amount) || 0;
    if (record.type === 'income') totals.income += amount;
    else totals.expenses += amount;
    monthTotals.set(key, totals);
    monthLastIndexes.set(key, index);
  });

  transactionsList.innerHTML = pageRecords.map((record, pageIndex) => {
    const absoluteIndex = startIndex + pageIndex;
    const isIncome = record.type === 'income';
    const typeClass = isIncome ? 'income' : 'expense';
    const typeLabel = isIncome ? 'Income' : 'Expense';
    const amountPrefix = isIncome ? '+' : '-';
    const amountColor = isIncome ? 'var(--color-success)' : 'var(--color-danger)';

    // Get category color (use gray if no color set)
    const categoryColor = record.categoryColor || '#9ca3af';
    const categoryStyle = `background-color: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;`;

    // Determine if this is a linked record (maintenance or fuel)
    const isMaintenance = record.sessionId;
    const isFuel = record.fuelRecordId;

    const sourceName = getFinanceRecordSource(record) === 'uber' ? 'Uber Earnings' : 'Personal Savings';
    const eventDate = new Date(getRecordEventTimestamp(record));
    const eventTimeLabel = Number.isNaN(eventDate.getTime()) ? '' : eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventMonthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthTotals = monthTotals.get(eventMonthKey);
    const previousRecord = absoluteIndex > 0 ? filteredFinanceRecords[absoluteIndex - 1] : null;
    const previousDate = previousRecord ? new Date(getRecordEventTimestamp(previousRecord)) : null;
    const previousMonthKey = previousDate ? `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}` : null;
    const showMonthHeading = pageIndex === 0 || absoluteIndex === 0 || eventMonthKey !== previousMonthKey;
    const monthHeading = showMonthHeading
      ? `<div class="finance-month-separator"><span class="finance-month-label">${currentMonthTotals.label}</span><span class="finance-month-connector" aria-hidden="true"></span><span class="finance-month-totals" aria-label="Monthly income and spending"><span class="month-income-total">+${currentMonthTotals.income.toLocaleString()}</span><span class="month-expense-total">−${currentMonthTotals.expenses.toLocaleString()}</span></span></div>`
      : '';
    let editAction = '';
    if (isMaintenance) {
      editAction = `data-action="edit-maintenance" data-session-id="${record.sessionId}" title="Edit Maintenance Session"`;
    } else if (isFuel) {
      editAction = `data-action="edit-fuel" data-fuel-record-id="${record.fuelRecordId}" title="Edit Fuel Entry"`;
    } else {
      editAction = `data-action="edit-finance" data-record-id="${record.id}" title="Edit Transaction"`;
    }
    const actionsHtml = `
      <div class="transaction-actions">
        <button class="edit-btn finance-action-btn" ${editAction}><i class="fas fa-edit"></i><span class="sr-only">Edit</span></button>
        <button class="finance-action-btn finance-exclude-btn" data-action="exclude-finance" data-record-id="${record.id}" title="Remove from Finance"><i class="fas fa-eye-slash"></i><span class="sr-only">Remove from Finance</span></button>
        <button class="delete-btn finance-action-btn" data-action="delete-everywhere" data-record-id="${record.id}" title="Delete everywhere"><i class="fas fa-trash"></i><span class="sr-only">Delete everywhere</span></button>
      </div>`;

    // Calculate relative event date
    const relativeTime = getRelativeTime(record.date);
    const timeContextColor = getTimeContextColor(record.date);
    const tooltipDate = formatDateForTooltip(record.date);

    return `${monthHeading}
      <div class="transaction-card transaction-card-${typeClass}" data-record-id="${record.id}">
        <div class="transaction-header">
          <div class="transaction-header-main">
            <h3>${formatDateToBritish(record.date)}</h3>
            <div class="transaction-date-meta">
              <span class="transaction-event-time">${eventTimeLabel}</span>
              <span class="time-context transaction-relative-time time-context-${timeContextColor}" 
                  title="Recorded on ${tooltipDate}">
                ${relativeTime}
              </span>
            </div>
          </div>
        </div>
        ${actionsHtml}
        <p><strong>Money Source:</strong> ${sourceName}</p>
        <p><strong>Description:</strong> ${isMaintenance ? 'Maintenance Session' : isFuel ? 'Fuel Entry' : record.description}</p>
        ${isMaintenance && record.odometer ? `<p><strong>Odometer:</strong> ${record.odometer.toLocaleString()} km</p>` : ''}
        ${isMaintenance ? `<p><strong>Included Items:</strong> ${record.includedItems?.length || 0}</p>` : ''}
        <p><strong>Type:</strong> <span class="transaction-type ${typeClass}">${typeLabel}</span></p>
        <p><strong>Category:</strong> <span style="${categoryStyle}">${record.category || '-'}</span></p>
        <div class="transaction-total ${typeClass}">
          <span class="transaction-total-label">Total</span>
          <strong>${amountPrefix}${record.amount.toLocaleString()} EGP</strong>
        </div>
      </div>
    `;
  }).join('');

  if (financePaginationControls && financePageInfo) {
    if (totalPages > 1) {
      financePaginationControls.style.display = 'flex';
      financePageInfo.textContent = `Page ${financeCurrentPage} of ${totalPages}`;
      if (financePrevPageBtn) financePrevPageBtn.disabled = financeCurrentPage === 1;
      if (financeNextPageBtn) financeNextPageBtn.disabled = financeCurrentPage === totalPages;
    } else {
      financePaginationControls.style.display = 'none';
    }
  }
}

// Change Finance Page
function changeFinancePage(direction) {
  const totalPages = Math.ceil(filteredFinanceRecords.length / financePerPage);
  const newPage = financeCurrentPage + direction;

  if (newPage >= 1 && newPage <= totalPages) {
    financeCurrentPage = newPage;
    renderFinancePage();
  }
}

// Handle transaction card button clicks (delegated event listener)
function setupTransactionCardEventListeners() {
  const transactionsList = document.getElementById('transactionsList');
  if (!transactionsList) return;
  if (transactionsList.dataset.financeEventsBound === 'true') return;
  transactionsList.dataset.financeEventsBound = 'true';

  transactionsList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const excludeBtn = e.target.closest('.finance-exclude-btn');

    if (editBtn) {
      e.stopPropagation();
      const action = editBtn.dataset.action;
      if (action === 'edit-maintenance') {
        editSession(parseInt(editBtn.dataset.sessionId));
      } else if (action === 'edit-fuel') {
        editFuelRecord(editBtn.dataset.fuelRecordId);
      } else if (action === 'edit-finance') {
        editFinanceRecord(editBtn.dataset.recordId);
      }
    }

    if (deleteBtn) {
      e.stopPropagation();
      const action = deleteBtn.dataset.action;
      if (action === 'delete-everywhere') deleteFinanceRecordEverywhere(deleteBtn.dataset.recordId);
    }
    if (excludeBtn) {
      e.stopPropagation();
      removeTransactionFromFinance(excludeBtn.dataset.recordId);
    }
    if (!editBtn && !deleteBtn && !excludeBtn) {
      const card = e.target.closest('.transaction-card[data-record-id]');
      if (card) viewTransactionDetails(card.dataset.recordId);
    }
  });
}

// Update Finance KPIs
function updateFinanceKPIs() {
  // Add immediate visual feedback by triggering animation
  const kpiElements = [financeTotalSavings, financeMonthlyIncome, financeMonthlyExpenses, financeNetBalance];
  kpiElements.forEach(el => {
    if (el) {
      el.style.transition = 'color 0.3s ease';
      el.style.color = 'var(--color-primary)';
      setTimeout(() => {
        el.style.color = 'var(--text-primary)';
      }, 300);
    }
  });

  if (!allFinanceRecords.length) {
    if (financeTotalSavings) financeTotalSavings.textContent = '0';
    if (financeMonthlyIncome) financeMonthlyIncome.textContent = '0';
    if (financeMonthlyExpenses) financeMonthlyExpenses.textContent = '0';
    if (financeNetBalance) financeNetBalance.textContent = '0';
    if (financePersonalBalance) {
      financePersonalBalance.textContent = '0';
      financePersonalBalance.style.color = '#10b981';
    }
    if (financeUberBalance) {
      financeUberBalance.textContent = '0';
      financeUberBalance.style.color = '#10b981';
    }
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalSavings = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  const sourceBalances = { personal: 0, uber: 0 };

  allFinanceRecords.forEach(record => {
    if (record.excludeFromKpis === true) return;
    const recordDate = new Date(record.date);
    const amount = parseFloat(record.amount) || 0;
    const source = record.fundingSource || (record.fuelRecordId ? 'uber' : 'personal');
    const sourceKey = source === 'uber' ? 'uber' : 'personal';

    if (record.type === 'income') {
      totalSavings += amount;
      sourceBalances[sourceKey] += amount;
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        monthlyIncome += amount;
      }
    } else {
      totalSavings -= amount;
      sourceBalances[sourceKey] -= amount;
      if (recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear) {
        monthlyExpenses += amount;
      }
    }
  });

  // Balance is cumulative; monthly figures are informational only.
  const netBalance = totalSavings;

  if (financeTotalSavings) {
    financeTotalSavings.textContent = totalSavings.toLocaleString();
    financeTotalSavings.style.color = totalSavings >= 0 ? '#10b981' : '#ef4444';
  }
  if (financeMonthlyIncome) financeMonthlyIncome.textContent = monthlyIncome.toLocaleString();
  if (financeMonthlyExpenses) financeMonthlyExpenses.textContent = monthlyExpenses.toLocaleString();
  if (financeNetBalance) {
    financeNetBalance.textContent = netBalance.toLocaleString();
    financeNetBalance.style.color = netBalance >= 0 ? '#10b981' : '#ef4444';
  }
  if (financePersonalBalance) {
    financePersonalBalance.textContent = sourceBalances.personal.toLocaleString();
    financePersonalBalance.style.color = sourceBalances.personal >= 0 ? '#10b981' : '#ef4444';
    financePersonalBalance.classList.toggle('balance-negative', sourceBalances.personal < 0);
  }
  if (financeUberBalance) {
    financeUberBalance.textContent = sourceBalances.uber.toLocaleString();
    financeUberBalance.style.color = sourceBalances.uber >= 0 ? '#10b981' : '#ef4444';
    financeUberBalance.classList.toggle('balance-negative', sourceBalances.uber < 0);
  }
}

function syncLinkedFinanceRecord(sourceField, sourceId, included, recordData) {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('financeRecords', 'readwrite');
    const store = tx.objectStore('financeRecords');
    store.index(sourceField).get(sourceId).onsuccess = event => {
      const existing = event.target.result;
      if (!included || !recordData || recordData.amount <= 0) {
        if (existing) store.delete(existing.id);
      } else {
        store.put({ ...(existing || {}), ...recordData, [sourceField]: sourceId, type: 'expense', createdAt: existing?.createdAt || new Date().toISOString() });
      }
    };
    tx.oncomplete = () => { loadFinanceRecords(); updateFinanceKPIs(); resolve(); };
    tx.onerror = () => reject(new Error('Failed to sync linked finance record'));
  });
}

function syncMaintenanceFinance(sessionId, date, items, merchant, included, fundingSource = 'personal', eventAt = '') {
  const includedItems = items.filter(item => (parseFloat(item.price) || 0) > 0);
  return syncLinkedFinanceRecord('sessionId', sessionId, included, {
    date,
    amount: includedItems.reduce((sum, item) => sum + (item.price || 0), 0),
    description: merchant ? `Maintenance - ${merchant}` : 'Maintenance Session',
    category: 'Maintenance', categoryColor: '#f59e0b',
    fundingSource,
    eventAt: eventAt || combineEventDateTime(date, '00:00'),
    time: eventAt ? getRecordTimeInput({ eventAt }) : '00:00',
    notes: includedItems.map(item => `${item.name} (${item.price} EGP)`).join(', '),
    includedItems: includedItems.map(item => ({ id: item.id, name: item.name, price: parseFloat(item.price) || 0 }))
  });
}

function addMaintenanceExpense(sessionId, date, items, merchant) {
  return syncMaintenanceFinance(sessionId, date, items, merchant, true, 'personal');
}

function addFuelExpense(fuelRecord) {
  return syncLinkedFinanceRecord('fuelRecordId', fuelRecord.id, fuelRecord.financeIncluded !== false, {
    date: fuelRecord.date,
    eventAt: fuelRecord.eventAt || combineEventDateTime(fuelRecord.date, fuelRecord.time || '00:00'),
    time: fuelRecord.time || getRecordTimeInput(fuelRecord),
    amount: fuelRecord.totalCost,
    description: `Fuel - ${parseFloat(fuelRecord.liters).toFixed(2)} L @ ${parseFloat(fuelRecord.odometer).toLocaleString()} km`,
    category: 'Fuel', categoryColor: '#ef4444', fundingSource: fuelRecord.fundingSource || 'uber', notes: fuelRecord.notes || ''
  });
}

// Delete Finance Records by Fuel Record ID (called when fuel entry is deleted)
function deleteFinanceRecordsByFuelRecord(fuelRecordId) {
  if (!db) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('financeRecords', 'readwrite');
    const store = tx.objectStore('financeRecords');
    const recordsToDelete = [];

    // Find records with matching fuelRecordId
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.fuelRecordId === fuelRecordId) {
          recordsToDelete.push(cursor.primaryKey);
        }
        cursor.continue();
      } else {
        recordsToDelete.forEach(id => store.delete(id));
      }
    };

    tx.oncomplete = () => {
      // Refresh finance if on finance tab
      if (document.body.getAttribute('data-active-tab') === 'finance') {
        loadFinanceRecords();
      }
      // Update KPIs
      updateFinanceKPIs();
      resolve();
    };

    tx.onerror = () => {
      reject(new Error('Failed to delete fuel finance records'));
    };
  });
}
function deleteFinanceRecordsBySession(sessionId) {
  if (!db) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('financeRecords', 'readwrite');
    const store = tx.objectStore('financeRecords');
    const index = store.index('sessionId');
    const recordsToDelete = [];

    index.openCursor(sessionId).onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        recordsToDelete.push(cursor.primaryKey);
        cursor.continue();
      } else {
        recordsToDelete.forEach(id => store.delete(id));
      }
    };

    tx.oncomplete = () => {
      // Refresh finance if on finance tab
      if (document.body.getAttribute('data-active-tab') === 'finance') {
        loadFinanceRecords();
      }
      // Update KPIs
      updateFinanceKPIs();
      resolve();
    };

    tx.onerror = () => {
      reject(new Error('Failed to delete finance records'));
    };
  });
}

// Delete single finance record
function deleteFinanceRecord(recordId, customWarning = null) {
  if (!db) return;
  const numericRecordId = typeof recordId === 'string' ? parseInt(recordId, 10) : recordId;
  if (!Number.isFinite(numericRecordId)) {
    showAlert('Invalid transaction ID');
    return;
  }

  const warning = customWarning || 'Are you sure you want to delete this transaction?';
  showConfirm(warning).then(confirmed => {
    if (!confirmed) return;

    const tx = db.transaction('financeRecords', 'readwrite');
    const store = tx.objectStore('financeRecords');

    store.delete(numericRecordId);

    tx.oncomplete = () => {
      loadFinanceRecords();
      updateFinanceKPIs();
    };

    tx.onerror = () => {
      showAlert('Error deleting record. Please try again.');
    };
  });
}

function removeTransactionFromFinance(recordId) {
  if (!db) return;
  const numericRecordId = Number(recordId);
  const record = allFinanceRecords.find(item => Number(item.id) === numericRecordId);
  if (!record) return;
  const linkedStore = record.sessionId != null ? 'sessions' : record.fuelRecordId != null ? 'fuelRecords' : null;
  const message = linkedStore
    ? 'Remove this transaction from Finance? The original maintenance or fuel record will remain saved.'
    : 'Remove this transaction from Finance?';
  showConfirm(message, 'Remove from Finance').then(confirmed => {
    if (!confirmed || !db) return;
    const stores = linkedStore ? [linkedStore, 'financeRecords'] : ['financeRecords'];
    const tx = db.transaction(stores, 'readwrite');
    if (linkedStore) {
      const sourceId = linkedStore === 'sessions' ? record.sessionId : record.fuelRecordId;
      const sourceStore = tx.objectStore(linkedStore);
      sourceStore.get(sourceId).onsuccess = event => {
        const sourceRecord = event.target.result;
        if (sourceRecord) sourceStore.put({ ...sourceRecord, financeIncluded: false });
      };
    }
    tx.objectStore('financeRecords').delete(numericRecordId);
    tx.oncomplete = () => {
      loadFinanceRecords();
      updateFinanceKPIs();
      if (typeof fuelApp !== 'undefined' && fuelApp) fuelApp.stateManager.loadSession('default');
    };
    tx.onerror = () => showAlert('Could not remove this transaction from Finance.');
  });
}

function deleteFinanceRecordEverywhere(recordId) {
  if (!db) return;
  const numericRecordId = Number(recordId);
  const record = allFinanceRecords.find(item => Number(item.id) === numericRecordId);
  if (!record) return;
  const linkedType = record.sessionId != null ? 'maintenance session and its items' : record.fuelRecordId != null ? 'fuel record' : '';
  const confirmMessage = linkedType
    ? `Permanently delete this Finance transaction and its linked ${linkedType}?`
    : 'Permanently delete this Finance transaction?';
  showConfirm(confirmMessage, 'Delete everywhere').then(async confirmed => {
    if (!confirmed || !db) return;
    try {
      if (record.sessionId != null) {
        const tx = db.transaction(['sessions', 'items', 'financeRecords'], 'readwrite');
        tx.objectStore('sessions').delete(record.sessionId);
        tx.objectStore('financeRecords').delete(numericRecordId);
        const items = tx.objectStore('items');
        items.openCursor().onsuccess = event => {
          const cursor = event.target.result;
          if (!cursor) return;
          if (String(cursor.value.sessionId) === String(record.sessionId)) cursor.delete();
          cursor.continue();
        };
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('Could not delete maintenance record'));
        });
      } else if (record.fuelRecordId != null) {
        if (typeof FuelDataManager !== 'undefined') {
          await FuelDataManager.deleteRecord(record.fuelRecordId);
        } else {
          const sourceTx = db.transaction('fuelRecords', 'readwrite');
          sourceTx.objectStore('fuelRecords').delete(record.fuelRecordId);
          await new Promise((resolve, reject) => {
            sourceTx.oncomplete = resolve;
            sourceTx.onerror = () => reject(sourceTx.error || new Error('Could not delete fuel record'));
          });
        }
        const financeTx = db.transaction('financeRecords', 'readwrite');
        financeTx.objectStore('financeRecords').delete(numericRecordId);
        await new Promise((resolve, reject) => {
          financeTx.oncomplete = resolve;
          financeTx.onerror = () => reject(financeTx.error || new Error('Could not delete Finance transaction'));
        });
        if (typeof fuelApp !== 'undefined' && fuelApp) await fuelApp.stateManager.loadSession('default');
      } else {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('financeRecords', 'readwrite');
          tx.objectStore('financeRecords').delete(numericRecordId);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('Could not delete transaction'));
        });
      }
      renderAll();
      loadFinanceRecords();
    } catch (error) {
      console.error('Delete everywhere failed:', error);
      showAlert(error.message || 'Could not delete this transaction everywhere.');
    }
  });
}

// Edit Finance Record - Open Popup
function editFinanceRecord(recordId) {
  if (!db || !editTransactionPopup) return;
  const numericRecordId = typeof recordId === 'string' ? parseInt(recordId, 10) : recordId;
  if (!Number.isFinite(numericRecordId)) return;

  const tx = db.transaction('financeRecords', 'readonly');
  const store = tx.objectStore('financeRecords');

  store.get(numericRecordId).onsuccess = e => {
    const record = e.target.result;
    if (!record) return;

    // Populate the edit form
    editTransactionId.value = record.id;
    editTransactionDate.value = record.date;
    if (editTransactionExcludeFromKpis) editTransactionExcludeFromKpis.checked = record.excludeFromKpis === true;
    editTransactionAmount.value = record.amount;
    editTransactionDescription.value = record.description;
    if (editTransactionType) editTransactionType.value = record.type || 'expense';
    if (editTransactionFundingSource) editTransactionFundingSource.value = record.fundingSource || (record.fuelRecordId ? 'uber' : 'personal');
    populateFinanceCategorySelect(editTransactionCategory, record.type || 'expense', record.category || '');
    editTransactionNotes.value = record.notes || '';

    // Show the popup
    editTransactionPopup.classList.add('active');
    document.body.classList.add('modal-open');
  };
}

// Close Edit Transaction Popup
function closeEditTransactionPopup() {
  if (editTransactionPopup) {
    editTransactionPopup.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// Save Transaction Edit
function saveTransactionEdit() {
  if (!db) return;

  const id = parseInt(editTransactionId.value);
  const date = editTransactionDate?.value;
  const time = getCurrentTimeInput();
  const amount = parseFloat(editTransactionAmount?.value);
  const description = editTransactionDescription?.value?.trim();
  const category = editTransactionCategory?.value?.trim();
  const notes = editTransactionNotes?.value?.trim();
  const type = editTransactionType?.value || 'expense';
  const moneySource = editTransactionFundingSource?.value || 'personal';

  if (!date || isNaN(amount) || amount <= 0) {
    showAlert('Please enter a valid date and amount');
    return;
  }

  if (!description) {
    showAlert('Please enter a description');
    return;
  }

  const tx = db.transaction('financeRecords', 'readwrite');
  const store = tx.objectStore('financeRecords');

  store.get(id).onsuccess = e => {
    const record = e.target.result;
    if (!record) {
      showAlert('Record not found');
      return;
    }

    // Update the record
    const previousCategoryType = record.categoryType || inferFinanceCategoryType(record.category);
    const updatedCategory = category || (previousCategoryType === type ? record.category : 'Uncategorized');
    const updatedRecord = {
      ...record,
      date: date,
      time,
      eventAt: combineEventDateTime(date, time),
      amount: amount,
      description: description,
      category: updatedCategory,
      categoryColor: editTransactionCategory?.selectedOptions?.[0]?.dataset.color || record.categoryColor || '#6b7280',
      categoryType: type,
      type,
      fundingSource: moneySource,
      notes: notes,
      excludeFromKpis: editTransactionExcludeFromKpis?.checked === true
    };

    store.put(updatedRecord);
  };

  tx.oncomplete = () => {
    closeEditTransactionPopup();
    loadFinanceRecords();
    updateFinanceKPIs();
  };

  tx.onerror = () => {
    showAlert('Error saving changes. Please try again.');
  };
}

// View Transaction Details Popup
const transactionDetailsPopup = document.getElementById('transactionDetailsPopup');
const transactionDetailsContent = document.getElementById('transactionDetailsContent');

function viewTransactionDetails(recordId) {
  if (!db || !transactionDetailsPopup || !transactionDetailsContent) return;

  // IDB autoIncrement keys are integers; onclick passes strings — coerce to int
  const numericId = typeof recordId === 'string' ? parseInt(recordId, 10) : recordId;

  const tx = db.transaction('financeRecords', 'readonly');
  const store = tx.objectStore('financeRecords');

  store.get(numericId).onsuccess = e => {
    const record = e.target.result;
    if (!record) return;

    const isIncome = record.type === 'income';
    const typeClass = isIncome ? 'income' : 'expense';
    const typeLabel = isIncome ? 'Income' : 'Expense';
    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const amountPrefix = isIncome ? '+' : '-';

    // Check if this is a linked record
    if (record.sessionId) {
      // Load maintenance session details
      const sessionTx = db.transaction(['sessions', 'items'], 'readonly');
      const sessionStore = sessionTx.objectStore('sessions');
      const itemsStore = sessionTx.objectStore('items');

      // sessionId may be timestamp (number) or autoIncrement int — normalise
      const sessionKey = typeof record.sessionId === 'string' ? parseInt(record.sessionId, 10) : record.sessionId;

      sessionStore.get(sessionKey).onsuccess = sessionEvent => {
        const session = sessionEvent.target.result;
        if (!session) {
          showLinkedRecordFallback(record, isIncome, typeClass, typeLabel, amountClass, amountPrefix);
          return;
        }

        // items store has no sessionId index — use a cursor scan instead
        const collectedItems = [];
        itemsStore.openCursor().onsuccess = cursorEvt => {
          const cursor = cursorEvt.target.result;
          if (cursor) {
            if (cursor.value.sessionId == record.sessionId &&
              (!Array.isArray(record.includedItems) || record.includedItems.some(item => String(item.id) === String(cursor.value.id)))) {
              collectedItems.push(cursor.value);
            }
            cursor.continue();
          } else {
            // cursor done — render
            const items = collectedItems;
            // (items found, fall through to render)
            renderMaintenanceDetail(items);
          }
        };

        function renderMaintenanceDetail(items) {
          transactionDetailsContent.innerHTML = `
            <div class="linked-record-header">
              <h4>
                <i class="fas fa-wrench" style="color: #f59e0b; font-size: 1.2rem;"></i> Maintenance Session
              </h4>
              <button class="secondary-btn details-link-btn" onclick="closeTransactionDetailsPopup(); viewSessionDetails(${JSON.stringify(record.sessionId)})"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Details</span></button>
            </div>
            <div class="transaction-detail-row">
              <label style="font-weight: 600;">Date:</label>
              <span>${formatDateToBritish(session.date)}</span>
            </div>
            <div class="transaction-detail-row"><label style="font-weight: 600;">Time:</label><span>${new Date(getRecordEventTimestamp(record)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div class="transaction-detail-row"><label style="font-weight: 600;">Money Source:</label><span>${record.fundingSource === 'uber' ? 'Uber Earnings' : 'Personal Savings'}</span></div>
            <div class="transaction-detail-row">
              <label style="font-weight: 600;">Odometer:</label>
              <span>${session.odometer?.toLocaleString() || '-'} km</span>
            </div>
            <div class="transaction-detail-row">
              <label style="font-weight: 600;">Merchant:</label>
              <span>${session.merchant || '-'}</span>
            </div>
            ${session.notes ? `
            <div class="transaction-detail-row">
              <label style="font-weight: 600;">Notes:</label>
              <span style="white-space: pre-wrap;">${session.notes}</span>
            </div>
            ` : ''}
            <section class="maintenance-items-panel transaction-items-row">
              <h4>Included services <span>${items.length}</span></h4>
              <div class="linked-items-list">
                ${items.length ? items.map(item => `
                  <div class="linked-item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${(parseFloat(item.price) || 0).toLocaleString()} EGP</span>
                  </div>
                `).join('') : '<em style="color:var(--text-muted);font-size:0.85rem;">No items recorded</em>'}
              </div>
              <div class="maintenance-items-total"><span>Total deducted from Finance</span><strong class="${amountClass}">${amountPrefix}${record.amount.toLocaleString()} EGP</strong></div>
            </section>
          `;

          transactionDetailsPopup.classList.add('active');
          document.body.classList.add('modal-open');
        };
      };
    } else if (record.fuelRecordId) {
      // Load fuel record details
      const fuelTx = db.transaction('fuelRecords', 'readonly');
      const fuelStore = fuelTx.objectStore('fuelRecords');

      fuelStore.get(record.fuelRecordId).onsuccess = fuelEvent => {
        const fuelRecord = fuelEvent.target.result;
        if (!fuelRecord) {
          showLinkedRecordFallback(record, isIncome, typeClass, typeLabel, amountClass, amountPrefix);
          return;
        }

        transactionDetailsContent.innerHTML = `
          <div class="linked-record-header">
            <h4>
              <i class="fas fa-gas-pump" style="color: #ef4444; font-size: 1.2rem;"></i> Fuel Entry
            </h4>
            <button class="secondary-btn details-link-btn" onclick="closeTransactionDetailsPopup(); editFuelRecord('${record.fuelRecordId}')"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Details</span></button>
          </div>
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Date:</label>
            <span>${formatDateToBritish(fuelRecord.date)}</span>
          </div>
          <div class="transaction-detail-row"><label style="font-weight: 600;">Time:</label><span>${new Date(getRecordEventTimestamp(record)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <div class="transaction-detail-row"><label style="font-weight: 600;">Money Source:</label><span>${record.fundingSource === 'personal' ? 'Personal Savings' : 'Uber Earnings'}</span></div>
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Odometer:</label>
            <span>${parseFloat(fuelRecord.odometer).toLocaleString()} km</span>
          </div>
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Liters Added:</label>
            <span style="font-weight: 600; color: var(--color-primary);">${parseFloat(fuelRecord.liters).toFixed(2)} L</span>
          </div>
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Price per Liter:</label>
            <span>${parseFloat(fuelRecord.pricePerLiter).toFixed(2)} EGP/L</span>
          </div>
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Full Tank Refill:</label>
            <span>${fuelRecord.isFullTank ? '<i class="fas fa-check" style="color: #10b981;"></i> Yes' : '<i class="fas fa-times" style="color: #ef4444;"></i> No'}</span>
          </div>
          ${fuelRecord.notes ? `
          <div class="transaction-detail-row">
            <label style="font-weight: 600;">Notes:</label>
            <span style="white-space: pre-wrap;">${fuelRecord.notes}</span>
          </div>
          ` : ''}
          <div class="transaction-detail-row transaction-details-total">
            <label style="font-weight: 600;">Total Cost:</label>
            <span class="${amountClass}" style="font-weight: 600; font-size: 1.1rem;">${amountPrefix}${parseFloat(fuelRecord.totalCost).toLocaleString()} EGP</span>
          </div>
        `;

        transactionDetailsPopup.classList.add('active');
        document.body.classList.add('modal-open');
      };
    } else {
      // Manual transaction - show basic details
      transactionDetailsContent.innerHTML = `
        <div class="linked-record-header">
          <h4>
            ${isIncome ? '<i class="fas fa-money-bill-wave" style="color: #10b981; font-size: 1.2rem;"></i>' : '<i class="fas fa-credit-card" style="color: #ef4444; font-size: 1.2rem;"></i>'}
            ${record.description}
          </h4>
          <span class="transaction-type ${typeClass}">${typeLabel}</span>
        </div>
        <div class="transaction-detail-row">
          <label style="font-weight: 600;">Date:</label>
          <span>${formatDateToBritish(record.date)}</span>
        </div>
        <div class="transaction-detail-row"><label style="font-weight: 600;">Time:</label><span>${new Date(getRecordEventTimestamp(record)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="transaction-detail-row">
          <label style="font-weight: 600;">Category:</label>
          <span style="display: inline-block; padding: 4px 12px; background-color: ${record.categoryColor || '#9ca3af'}; color: white; border-radius: 4px; font-size: 0.85rem;">${record.category || '-'}</span>
        </div>
        <div class="transaction-detail-row"><label style="font-weight: 600;">Money Source:</label><span>${record.fundingSource === 'uber' ? 'Uber Earnings' : 'Personal Savings'}</span></div>
        ${record.notes ? `
        <div class="transaction-detail-row">
          <label style="font-weight: 600;">Notes:</label>
          <span style="white-space: pre-wrap; background: var(--bg-hover); padding: var(--space-2); border-radius: var(--radius-sm);">${record.notes}</span>
        </div>
        ` : ''}
        <div class="transaction-detail-row transaction-details-total">
          <label style="font-weight: 600;">Amount:</label>
          <span class="${amountClass}" style="font-weight: 600; font-size: 1.1rem;">${amountPrefix}${record.amount.toLocaleString()} EGP</span>
        </div>
      `;

      transactionDetailsPopup.classList.add('active');
      document.body.classList.add('modal-open');
    }
  };
}

function showLinkedRecordFallback(record, isIncome, typeClass, typeLabel, amountClass, amountPrefix) {
  transactionDetailsContent.innerHTML = `
    <div class="linked-record-header warning">
      <h4><i class="fas fa-exclamation-triangle"></i> Linked Record Not Found</h4>
    </div>
    <div class="transaction-detail-row">
      <label>Date:</label>
      <span>${formatDateToBritish(record.date)}</span>
    </div>
    <div class="transaction-detail-row">
      <label>Description:</label>
      <span>${record.description}</span>
    </div>
    <div class="transaction-detail-row">
      <label>Type:</label>
      <span><span class="transaction-type ${typeClass}">${typeLabel}</span></span>
    </div>
    <div class="transaction-detail-row">
      <label>Amount:</label>
      <span class="${amountClass}">${amountPrefix}${record.amount.toLocaleString()} EGP</span>
    </div>
    <div class="transaction-detail-row">
      <label>Note:</label>
      <span>The linked ${record.sessionId ? 'maintenance session' : 'fuel entry'} may have been deleted.</span>
    </div>
  `;

  transactionDetailsPopup.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeTransactionDetailsPopup() {
  if (transactionDetailsPopup) {
    transactionDetailsPopup.classList.remove('active');
    document.body.classList.remove('modal-open');
    transactionDetailsContent.innerHTML = '';
  }
}

// Ensure popup closes on escape key
if (document && transactionDetailsPopup) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && transactionDetailsPopup && transactionDetailsPopup.classList.contains('active')) {
      closeTransactionDetailsPopup();
    }
  });
}

// ================================
// Finance KPI Detail Popup
// ================================
function showFinanceKPIDetails(kpiType) {
  const kpiRecords = allFinanceRecords.filter(record => record.excludeFromKpis !== true);
  if (!kpiRecords.length && kpiType !== 'totalSavings') {
    showAlert('No finance records yet. Add a transaction first.');
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const kpiPopup = document.getElementById('financeKpiDetailPopup');
  const kpiPopupTitle = document.getElementById('financeKpiDetailTitle');
  const kpiPopupBody = document.getElementById('financeKpiDetailBody');

  if (!kpiPopup || !kpiPopupTitle || !kpiPopupBody) return;

  let title = '';
  let html = '';

  if (kpiType === 'totalSavings') {
    title = 'Total Savings Breakdown';
    const totalIn = kpiRecords.filter(r => r.type === 'income').reduce((s, r) => s + parseFloat(r.amount), 0);
    const totalOut = kpiRecords.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount), 0);
    const net = totalIn - totalOut;
    const personalBalance = kpiRecords.filter(r => getFinanceRecordSource(r) === 'personal')
      .reduce((sum, record) => sum + (record.type === 'income' ? 1 : -1) * (parseFloat(record.amount) || 0), 0);
    const uberBalance = kpiRecords.filter(r => getFinanceRecordSource(r) === 'uber')
      .reduce((sum, record) => sum + (record.type === 'income' ? 1 : -1) * (parseFloat(record.amount) || 0), 0);

    html = `
      <div class="kpi-detail-row">
        <span class="kpi-detail-label">Total Income (all time)</span>
        <span class="kpi-detail-value income-text">+${totalIn.toLocaleString()} EGP</span>
      </div>
      <div class="kpi-detail-row">
        <span class="kpi-detail-label">Total Expenses (all time)</span>
        <span class="kpi-detail-value expense-text">-${totalOut.toLocaleString()} EGP</span>
      </div>
      <div class="kpi-detail-divider"></div>
      <div class="kpi-detail-row kpi-detail-total">
        <span class="kpi-detail-label">Net Savings</span>
        <span class="kpi-detail-value ${net >= 0 ? 'income-text' : 'expense-text'}">${net >= 0 ? '+' : ''}${net.toLocaleString()} EGP</span>
      </div>
      <div class="kpi-detail-divider"></div>
      <div class="kpi-detail-row"><span class="kpi-detail-label">Personal Savings remaining</span><span class="kpi-detail-value">${personalBalance.toLocaleString()} EGP</span></div>
      <div class="kpi-detail-row"><span class="kpi-detail-label">Uber Earnings remaining</span><span class="kpi-detail-value">${uberBalance.toLocaleString()} EGP</span></div>
      <p class="kpi-detail-note">Based on ${kpiRecords.length} included transaction${kpiRecords.length !== 1 ? 's' : ''}</p>
    `;
  } else if (kpiType === 'monthlyIncome') {
    title = 'Monthly Income Breakdown';
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthRecords = kpiRecords.filter(r => {
      const d = new Date(r.date);
      return r.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const total = monthRecords.reduce((s, r) => s + parseFloat(r.amount), 0);

    if (monthRecords.length === 0) {
      html = `<p class="kpi-detail-note">No income recorded for ${monthName}.</p>`;
    } else {
      html = monthRecords.map(r => `
        <div class="kpi-detail-row">
          <span class="kpi-detail-label">
            <span class="kpi-cat-dot" style="background:${r.categoryColor || '#6b7280'}"></span>
            ${r.description || r.category || '-'}
          </span>
          <span class="kpi-detail-value income-text">+${parseFloat(r.amount).toLocaleString()} EGP</span>
        </div>
      `).join('');
      html += `<div class="kpi-detail-divider"></div>
        <div class="kpi-detail-row kpi-detail-total">
          <span class="kpi-detail-label">Total (${monthName})</span>
          <span class="kpi-detail-value income-text">+${total.toLocaleString()} EGP</span>
        </div>`;
    }
  } else if (kpiType === 'monthlyExpenses') {
    title = 'Monthly Expenses Breakdown';
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthRecords = kpiRecords.filter(r => {
      const d = new Date(r.date);
      return r.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const total = monthRecords.reduce((s, r) => s + parseFloat(r.amount), 0);

    if (monthRecords.length === 0) {
      html = `<p class="kpi-detail-note">No expenses recorded for ${monthName}.</p>`;
    } else {
      html = monthRecords.map(r => `
        <div class="kpi-detail-row">
          <span class="kpi-detail-label">
            <span class="kpi-cat-dot" style="background:${r.categoryColor || '#6b7280'}"></span>
            ${r.description || r.category || '-'}
          </span>
          <span class="kpi-detail-value expense-text">-${parseFloat(r.amount).toLocaleString()} EGP</span>
        </div>
      `).join('');
      html += `<div class="kpi-detail-divider"></div>
        <div class="kpi-detail-row kpi-detail-total">
          <span class="kpi-detail-label">Total (${monthName})</span>
          <span class="kpi-detail-value expense-text">-${total.toLocaleString()} EGP</span>
        </div>`;
    }
  } else if (kpiType === 'netBalance') {
    title = 'Net Balance Breakdown';
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthIncome = kpiRecords
      .filter(r => { const d = new Date(r.date); return r.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
      .reduce((s, r) => s + parseFloat(r.amount), 0);
    const monthExpenses = kpiRecords
      .filter(r => { const d = new Date(r.date); return r.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
      .reduce((s, r) => s + parseFloat(r.amount), 0);
    const net = monthIncome - monthExpenses;

    html = `
      <div class="kpi-detail-row">
        <span class="kpi-detail-label">Income (${monthName})</span>
        <span class="kpi-detail-value income-text">+${monthIncome.toLocaleString()} EGP</span>
      </div>
      <div class="kpi-detail-row">
        <span class="kpi-detail-label">Expenses (${monthName})</span>
        <span class="kpi-detail-value expense-text">-${monthExpenses.toLocaleString()} EGP</span>
      </div>
      <div class="kpi-detail-divider"></div>
      <div class="kpi-detail-row kpi-detail-total">
        <span class="kpi-detail-label">Net Balance</span>
        <span class="kpi-detail-value ${net >= 0 ? 'income-text' : 'expense-text'}">${net >= 0 ? '+' : ''}${net.toLocaleString()} EGP</span>
      </div>
      <p class="kpi-detail-note">${net >= 0 ? '✅ Spending less than earned this month.' : '⚠️ Spending more than earned this month.'}</p>
    `;
  }

  kpiPopupTitle.textContent = title;
  kpiPopupBody.innerHTML = html;
  kpiPopup.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeFinanceKPIDetailPopup() {
  const kpiPopup = document.getElementById('financeKpiDetailPopup');
  if (kpiPopup) {
    kpiPopup.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// ================================
// KPI Description Toggle Functionality
// ================================
function initializeKPIDescriptions() {
  const kpiCards = document.querySelectorAll('[data-kpi]');

  kpiCards.forEach(card => {
    const descriptionContainer = card.querySelector('.kpi-description-container');
    const description = card.querySelector('.kpi-description');
    const showMoreBtn = card.querySelector('.kpi-show-more');

    if (!description || !showMoreBtn || !descriptionContainer) return;

    // Check if description is truncated using computed line-height and data-max-lines
    const checkTruncation = () => {
      const isExpanded = description.classList.contains('expanded');

      // Always keep container visible (so mobile users can read full text when needed)
      descriptionContainer.style.display = '';

      // Determine max allowed height from line-height and data-max-lines attribute
      const maxLines = parseInt(description.dataset.maxLines, 10) || 2;
      const computed = window.getComputedStyle(description);
      let lineHeight = parseFloat(computed.lineHeight);
      // Fallback if line-height is 'normal' or unavailable
      if (!lineHeight || isNaN(lineHeight)) {
        const fontSize = parseFloat(computed.fontSize) || 14;
        lineHeight = fontSize * 1.4;
      }
      const maxHeight = lineHeight * maxLines;

      // Ensure collapsed state for measuring when not expanded
      if (!isExpanded) description.classList.add('collapsed');

      // Force reflow
      void description.offsetHeight;

      const actualHeight = description.scrollHeight;
      const isTruncated = actualHeight > maxHeight + 1;

      if (isExpanded) {
        // If expanded, show 'Show Less' control
        showMoreBtn.style.display = 'inline-flex';
        showMoreBtn.textContent = 'Show Less';
      } else if (isTruncated) {
        showMoreBtn.style.display = 'inline-flex';
        showMoreBtn.textContent = 'Show More';
      } else {
        showMoreBtn.style.display = 'none';
      }
    };

    // Initial check after a short delay to ensure content is rendered
    setTimeout(checkTruncation, 150);

    // Re-check on window resize (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkTruncation, 120);
    });

    // Replace any existing click handler to avoid duplicates
    const toggleHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = description.classList.contains('expanded');

      if (isExpanded) {
        description.classList.remove('expanded');
        description.classList.add('collapsed');
        showMoreBtn.classList.remove('expanded');
        showMoreBtn.textContent = 'Show More';
        // Allow layout to update then re-run truncation check
        setTimeout(checkTruncation, 80);
      } else {
        description.classList.remove('collapsed');
        description.classList.add('expanded');
        showMoreBtn.classList.add('expanded');
        showMoreBtn.textContent = 'Show Less';
      }
    };

    showMoreBtn.onclick = toggleHandler;
  });
}

// Initialize KPI descriptions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeKPIDescriptions();
});

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
window.removeUpcomingReminder = removeUpcomingReminder;
window.undoUpcomingReminderRemoval = undoUpcomingReminderRemoval;
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
window.openAddFundsPopup = openAddFundsPopup;
window.closeAddFundsPopup = closeAddFundsPopup;
window.saveFund = saveFund;
window.viewTransactionDetails = viewTransactionDetails;
window.closeTransactionDetailsPopup = closeTransactionDetailsPopup;
window.addFuelExpense = addFuelExpense;
window.deleteFinanceRecordsByFuelRecord = deleteFinanceRecordsByFuelRecord;
window.deleteFinanceRecord = deleteFinanceRecord;
window.editFinanceRecord = editFinanceRecord;
window.closeEditTransactionPopup = closeEditTransactionPopup;
window.saveTransactionEdit = saveTransactionEdit;
window.updateLastExportCounter = updateLastExportCounter;
window.showFinanceKPIDetails = showFinanceKPIDetails;
window.closeFinanceKPIDetailPopup = closeFinanceKPIDetailPopup;

// ========================================
// Header Actions: Data Blur & Export
// ========================================
function initializeHeaderActions() {
  const blurBtn = document.getElementById("headerBlurBtn");
  const exportBtn = document.getElementById("headerExportBtn");

  if (blurBtn) {
    // Load initial blur state
    const isBlurred = localStorage.getItem("siteDataBlurred") === "true";
    if (isBlurred) {
      document.body.classList.add("data-blurred");
      const icon = blurBtn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    }

    // Toggle blur state
    blurBtn.addEventListener("click", () => {
      const currentlyBlurred = document.body.classList.toggle("data-blurred");
      localStorage.setItem("siteDataBlurred", currentlyBlurred.toString());

      const icon = blurBtn.querySelector("i");
      if (icon) {
        if (currentlyBlurred) {
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportAllData();
    });
  }

  updateLastExportCounter();
}

function updateLastExportCounter() {
  const counterEl = document.getElementById("exportCounter");
  const daysEl = document.getElementById("exportCounterDays");

  if (!counterEl || !daysEl) return;

  const lastExportDate = localStorage.getItem("lastExportDate");

  // Reset classes
  counterEl.classList.remove("export-safe", "export-warning", "export-danger");

  if (!lastExportDate) {
    daysEl.textContent = "Never";
    counterEl.classList.add("export-danger");
    return;
  }

  const exportTime = new Date(lastExportDate).getTime();
  const now = new Date().getTime();
  const diffTime = now - exportTime;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If for some reason clock skew puts export in the future, treat as 0
  const days = Math.max(0, diffDays);

  daysEl.textContent = days.toString();
  if (days <= 7) {
    counterEl.classList.add("export-safe");
  } else if (days <= 14) {
    counterEl.classList.add("export-warning");
  } else {
    counterEl.classList.add("export-danger");
  }
}
