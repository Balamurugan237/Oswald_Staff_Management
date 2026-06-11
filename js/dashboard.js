/**
 * dashboard.js - Dashboard view and analytics engine
 */

import { getStaff, getActivities, getAttendance } from './db.js?v=1.0.8';
import { formatCurrency, formatDate } from './utils.js?v=1.0.8';

/**
 * Initializes and renders the dashboard analytics
 */
export function initDashboard() {
  const staff = getStaff();
  const activities = getActivities();

  renderKPIs(staff);
  renderCharts(staff);
  renderComplianceAlerts(staff);
  renderActivityTimeline(activities);
  setupKPIClicks();
}

/**
 * Calculates and displays the KPI numbers
 */
function renderKPIs(staff) {
  // 1. Total Staff
  document.getElementById('stat-total-staff').innerText = staff.length;
  document.getElementById('stat-staff-subtext').innerText = `${staff.filter(s => s.employmentType === 'Full-time').length} full-time personnel`;

  // Get today's date in local context system format
  const activeDate = '2026-06-09';
  const attendance = getAttendance();
  const todayRecs = attendance.filter(a => a.date === activeDate);
  const presentToday = todayRecs.filter(a => a.status === 'Present').length;
  const halfToday = todayRecs.filter(a => a.status === 'Half-day').length;
  const absentToday = todayRecs.filter(a => a.status === 'Absent').length;
  const leaveToday = todayRecs.filter(a => a.status === 'On leave').length;

  // 2. Present Today
  document.getElementById('stat-present-today').innerText = presentToday + halfToday;
  document.getElementById('stat-present-subtext').innerText = `${halfToday} half-day active`;

  // 3. Absent Today
  document.getElementById('stat-absent-today').innerText = absentToday;
  document.getElementById('stat-absent-subtext').innerText = absentToday > 0 ? `${absentToday} members missing` : 'No absences';

  // 4. On Leave Today
  document.getElementById('stat-leave-today').innerText = leaveToday;
  document.getElementById('stat-leave-subtext').innerText = `${leaveToday} approved leaves`;
}

function renderCharts(staff) {
  if (staff.length === 0) {
    renderEmptyCharts();
    return;
  }

  renderDepartmentChart(staff);
}

/**
 * Renders a circular SVG Donut Chart representing Staff by Department
 */
function renderDepartmentChart(staff) {
  const wrapper = document.getElementById('department-chart-wrapper');
  const legend = document.getElementById('department-chart-legend');
  
  if (!wrapper || !legend) return;

  // Calculate department frequencies
  const deptCounts = {};
  staff.forEach(s => {
    deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
  });

  const data = Object.keys(deptCounts).map(dept => ({
    name: dept,
    value: deptCounts[dept]
  }));

  const total = staff.length;
  const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Generate Donut SVG
  let currentOffset = 0;
  const radius = 35;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * radius; // ~219.91

  let svgHtml = `<svg viewBox="0 0 100 100" width="100%" height="100%" class="chart-donut-svg">`;
  
  // Base circle under-glow
  svgHtml += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="transparent" stroke="rgba(255, 255, 255, 0.02)" stroke-width="12"></circle>`;

  data.forEach((item, index) => {
    const color = colors[index % colors.length];
    const percentage = item.value / total;
    const strokeDash = percentage * circumference;
    const strokeOffset = circumference - currentOffset;

    svgHtml += `
      <circle cx="${cx}" cy="${cy}" r="${radius}" 
              fill="transparent" 
              stroke="${color}" 
              stroke-width="10" 
              stroke-dasharray="${strokeDash} ${circumference}" 
              stroke-dashoffset="${strokeOffset}" 
              transform="rotate(-90 ${cx} ${cy})"
              stroke-linecap="round"
              class="donut-segment"
              data-dept="${item.name}">
              <title>${item.name}: ${item.value} (${Math.round(percentage * 100)}%)</title>
      </circle>
    `;

    currentOffset += strokeDash;
  });

  // Donut center text
  svgHtml += `
    <g class="chart-text">
      <text x="50" y="47" text-anchor="middle" font-family="Outfit" font-weight="700" fill="#f3f4f6" font-size="14">${total}</text>
      <text x="50" y="60" text-anchor="middle" font-family="Inter" font-weight="500" fill="#9ca3af" font-size="6">TOTAL STAFF</text>
    </g>
  `;
  svgHtml += `</svg>`;
  
  wrapper.innerHTML = svgHtml;

  // Render Legend
  legend.innerHTML = data.map((item, index) => {
    const color = colors[index % colors.length];
    return `
      <div class="legend-item">
        <span class="legend-color" style="background-color: ${color}"></span>
        <span>${item.name} <strong>(${item.value})</strong></span>
      </div>
    `;
  }).join('');
}

/**
 * Renders a horizontal SVG Bar Chart representing base stipend expenses by Employment Type
 */
function renderEmploymentStipendChart(staff) {
  const wrapper = document.getElementById('employment-chart-wrapper');
  const legend = document.getElementById('employment-chart-legend');
  
  if (!wrapper || !legend) return;

  // Calculate stipend sums per employment type
  const typeStipends = {
    'Full-time': 0,
    'Part-time': 0,
    'Intern': 0,
    'Contractor': 0
  };

  staff.forEach(s => {
    if (typeStipends[s.employmentType] !== undefined) {
      typeStipends[s.employmentType] += Number(s.baseStipend);
    }
  });

  const data = Object.keys(typeStipends).map(type => ({
    name: type,
    value: typeStipends[type]
  })).filter(item => item.value > 0);

  if (data.length === 0) {
    wrapper.innerHTML = `<p class="empty-state-text">No stipend details configured.</p>`;
    legend.innerHTML = '';
    return;
  }

  const maxVal = Math.max(...data.map(d => d.value));
  const colors = {
    'Full-time': '#6366f1',
    'Part-time': '#8b5cf6',
    'Intern': '#10b981',
    'Contractor': '#f59e0b'
  };

  // Build a highly responsive custom SVG horizontal bar graph
  const barHeight = 18;
  const gap = 14;
  const paddingLeft = 85;
  const paddingRight = 60;
  const chartHeight = data.length * (barHeight + gap) + gap;
  const chartWidth = 360;

  let svgHtml = `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" height="100%">`;

  data.forEach((item, index) => {
    const color = colors[item.name] || '#3b82f6';
    const y = gap + index * (barHeight + gap);
    
    // Width proportional to max value
    const availableWidth = chartWidth - paddingLeft - paddingRight;
    const barWidth = maxVal > 0 ? (item.value / maxVal) * availableWidth : 0;
    
    // Format compact value (e.g. 1.2L or standard currency formatting)
    const formattedVal = new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(item.value);

    svgHtml += `
      <!-- Label -->
      <text x="${paddingLeft - 10}" y="${y + barHeight - 4}" 
            text-anchor="end" 
            font-family="Inter" 
            font-weight="600" 
            fill="#9ca3af" 
            font-size="11">${item.name}</text>
      
      <!-- Background Bar -->
      <rect x="${paddingLeft}" y="${y}" 
            width="${availableWidth}" height="${barHeight}" 
            rx="4" 
            fill="rgba(255, 255, 255, 0.02)"></rect>

      <!-- Value Bar -->
      <rect x="${paddingLeft}" y="${y}" 
            width="${barWidth}" height="${barHeight}" 
            rx="4" 
            fill="${color}"
            class="chart-bar"
            style="filter: drop-shadow(0 0 4px ${color}40)">
        <animate attributeName="width" from="0" to="${barWidth}" dur="0.8s" fill="freeze" keyTimes="0; 1" keySplines="0.19, 1, 0.22, 1" calcMode="spline" />
      </rect>

      <!-- Value Text -->
      <text x="${paddingLeft + barWidth + 8}" y="${y + barHeight - 4}" 
            font-family="Outfit" 
            font-weight="700" 
            fill="#f3f4f6" 
            font-size="11">₹${formattedVal}</text>
    `;
  });

  svgHtml += `</svg>`;
  wrapper.innerHTML = svgHtml;

  // Render Legend (simple description)
  legend.innerHTML = `
    <div style="grid-column: span 2; text-align: center; font-size: 11px; color: var(--text-muted)">
      Charts show active monthly stipend allocations.
    </div>
  `;
}

/**
 * Standard fallback for empty graphs
 */
function renderEmptyCharts() {
  const deptWrapper = document.getElementById('department-chart-wrapper');
  const deptLegend = document.getElementById('department-chart-legend');

  if (deptWrapper) deptWrapper.innerHTML = `<p class="empty-state-text">No data available</p>`;
  if (deptLegend) deptLegend.innerHTML = '';
}

/**
 * Checks for missing profile details (Aadhaar, PAN, Bank Details) and prompts user
 */
function renderComplianceAlerts(staff) {
  const container = document.getElementById('dashboard-blocker-alerts');
  if (!container) return;

  const alerts = [];

  staff.forEach(s => {
    const missingItems = [];
    if (!s.pan) {
      missingItems.push({ name: 'PAN Code', blocker: false });
    }
    if (!s.aadhaar) {
      missingItems.push({ name: 'Aadhaar ID', blocker: false });
    }

    if (missingItems.length > 0) {
      alerts.push({
        staffId: s.id,
        name: s.name,
        role: s.role,
        department: s.department,
        items: missingItems
      });
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="empty-state-text">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" stroke-width="1.5" style="margin-bottom: 8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <p class="text-emerald" style="font-weight: 500;">All staff compliance verified!</p>
      </div>
    `;
    return;
  }

  // Generate html
  container.innerHTML = alerts.map(alert => {
    const listStr = alert.items.map(i => i.name).join(' and ');
    
    return `
      <div class="blocker-alert">
        <div class="blocker-info">
          <div class="blocker-dot" style="background-color: var(--accent-warning); box-shadow: 0 0 8px var(--accent-warning)"></div>
          <div class="blocker-text">
            <h4>${alert.name} (${alert.role})</h4>
            <p>Missing <strong>${listStr}</strong> compliance documentation.</p>
          </div>
        </div>
        <button class="btn btn-secondary btn-action-fix" data-id="${alert.staffId}" style="padding: 6px 12px; font-size: 12px; height: 30px;">
          Fix Profile
        </button>
      </div>
    `;
  }).join('');

  // Wire up fix profile buttons
  container.querySelectorAll('.btn-action-fix').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      
      // Dispatch custom event to trigger edit staff in staff module
      window.dispatchEvent(new CustomEvent('trigger_edit_staff', { detail: { id } }));
    });
  });
}

/**
 * Renders the timeline log
 */
function renderActivityTimeline(activities) {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  if (activities.length === 0) {
    container.innerHTML = `<p class="empty-state-text">No activity recorded yet.</p>`;
    return;
  }

  container.innerHTML = activities.map(act => {
    const timeFormatted = formatTimeDifference(new Date(act.time));
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

/**
 * Humanizes dates to elapsed statements
 */
function formatTimeDifference(pastDate) {
  const now = new Date();
  const diffMs = now.getTime() - pastDate.getTime();
  
  if (diffMs < 0) return 'Just now';
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDate(pastDate, true);
}

/**
 * Sets up click event listeners on KPI cards to navigate to related views
 */
function setupKPIClicks() {
  // 1. Total Staff
  document.getElementById('kpi-total-staff')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate_to_tab', { 
      detail: { tab: 'staff' } 
    }));
  });

  // 2. Present Today
  document.getElementById('kpi-present-today')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate_to_tab', { 
      detail: { tab: 'attendance' } 
    }));
  });

  // 3. Absent Today
  document.getElementById('kpi-absent-today')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate_to_tab', { 
      detail: { tab: 'attendance' } 
    }));
  });

  // 4. On Leave Today
  document.getElementById('kpi-leave-today')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate_to_tab', { 
      detail: { tab: 'attendance' } 
    }));
  });
}
