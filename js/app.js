/**
 * app.js - Main Application Orchestrator & Router
 */

import { initDB, getActivities } from './db.js?v=1.0.8';
import { formatSystemTime, showToast } from './utils.js?v=1.0.8';
import { initDashboard } from './dashboard.js?v=1.0.8';
import { initStaffDirectory, renderStaffList, openAddWizard } from './staff.js?v=1.0.8';
import { initReports } from './reports.js?v=1.0.8';
import { initAttendance } from './attendance.js?v=1.0.8';

// Global variables
let currentTab = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize databases
  initDB();

  // 2. Set up dynamic system clock
  startSystemClock();

  // 3. Set up routing & tab switching
  setupRouting();

  // 4. Initialize first view (Dashboard)
  initDashboard();

  // 5. Initialize secondary views (so events are wired up)
  initStaffDirectory();
  initReports();
  initAttendance();

  // 6. Connect global sync events
  setupSyncEvents();

  // Ready Toast
  showToast('Portal Active', ' Oswald Stack Staff Portal is initialized and ready.', 'success', 3000);
});

/**
 * Updates header time displays every second
 */
function startSystemClock() {
  const clockNode = document.getElementById('current-datetime');
  if (!clockNode) return;

  const updateClock = () => {
    clockNode.innerText = formatSystemTime(new Date());
  };
  
  updateClock();
  setInterval(updateClock, 1000);
}

/**
 * Handles tab transitions with View Transition API support
 */
function setupRouting() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const targetTab = link.getAttribute('data-tab');
      if (targetTab === currentTab) return;

      // Handle transitions
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          switchTab(targetTab);
        });
      } else {
        // Fallback for unsupported browsers
        switchTab(targetTab);
      }
    });
  });

  // Wire header quick action triggers
  document.getElementById('quick-add-staff')?.addEventListener('click', () => {
    openAddWizard();
  });



  // Listen to navigation events dispatched from dashboard cards
  window.addEventListener('navigate_to_tab', (e) => {
    const { tab, subtab, filter } = e.detail;

    // Switch main tab
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        switchTab(tab);
        applyNavigationSideEffects(tab, subtab, filter);
      });
    } else {
      switchTab(tab);
      applyNavigationSideEffects(tab, subtab, filter);
    }
  });
}

/**
 * Applies tab-specific filter and sub-tab selection states
 */
function applyNavigationSideEffects(tab, subtab, filter) {
  if (tab === 'staff' && filter) {
    const select = document.getElementById('filter-compliance');
    if (select) {
      select.value = filter;
      select.dispatchEvent(new Event('change'));
    }
  }
}

/**
 * Toggle view sections, update titles and styles
 */
function switchTab(tabId) {
  currentTab = tabId;

  // 1. Update active sidebar classes
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 2. Toggle main body viewport active classes
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `${tabId}-view`) {
      panel.classList.add('active-panel');
    } else {
      panel.classList.remove('active-panel');
    }
  });

  // 3. Update view header text
  const viewTitleNode = document.getElementById('view-title');
  if (viewTitleNode) {
    viewTitleNode.innerText = getTabTitle(tabId);
  }

  // 4. Force redraw specific tab components to ensure fresh data load
  refreshActiveTab(tabId);
}

function getTabTitle(tabId) {
  switch (tabId) {
    case 'dashboard': return 'Dashboard & Analytics';
    case 'staff': return 'Staff Directory';
    case 'payroll': return 'Stipends & Payroll';
    case 'reports': return 'Reports & Analytics';
    default: return 'Oswald Stack';
  }
}

/**
 * Forces specific views refresh when tab becomes active
 */
function refreshActiveTab(tabId) {
  if (tabId === 'dashboard') {
    initDashboard();
  } else if (tabId === 'staff') {
    renderStaffList();
  } else if (tabId === 'reports') {
    initReports();
  }
}

/**
 * Synced custom events ensuring updates in one tab redraw the rest
 */
function setupSyncEvents() {
  // Listen for database changes (CRUD / payroll runs)
  window.addEventListener('db_updated', () => {
    // Redraw whichever view is active to sync counts/analytics
    refreshActiveTab(currentTab);
  });

  // Listen for timeline updates
  window.addEventListener('activity_updated', () => {
    if (currentTab === 'dashboard') {
      const activities = getActivities();
      // Directly refresh the dashboard timeline without fully reloading charts
      const container = document.getElementById('recent-activity-list');
      if (container && activities) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        container.innerHTML = activities.map(act => {
          const pastDate = new Date(act.time);
          const timeFormatted = pastDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return `
            <div class="activity-item">
              <div class="activity-node"></div>
              <div class="activity-content">
                <p><strong>${act.user}</strong>: ${act.text}</p>
                <span class="activity-time">${timeFormatted}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  });
}
