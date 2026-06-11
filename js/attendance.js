/**
 * attendance.js - Attendance coordinator, simulation portal and matrix grid
 */

import { getStaff, getAttendance, saveAttendanceBatch, saveAttendanceRecord, addActivity } from './db.js?v=1.0.8';
import { formatCurrency, showToast } from './utils.js?v=1.0.8';

// Global state for attendance view
let activeDate = '';
let activeYear = '2026';
let activeMonth = '06';
let activeSubtab = 'daily';

// Popover target cell info
let popoverTarget = null; // { staffId, date, element }

/**
 * Initializes the attendance tab panel
 */
export function initAttendance() {
  // Set default date to today (2026-06-09)
  const dateInput = document.getElementById('attendance-date-input');
  if (dateInput) {
    activeDate = '2026-06-09'; // Default system date matching local context
    dateInput.value = activeDate;
    dateInput.addEventListener('change', (e) => {
      activeDate = e.target.value;
      renderDailySheet();
      updateKPIs();
    });
  }

  // Set up Month & Year selectors
  setupSelectors();

  // Set up subtabs toggling
  setupSubTabs();

  // Set up event handlers
  setupHandlers();

  // Initial renders
  renderDailySheet();
  renderMonthlyGrid();
  updateKPIs();
}

/**
 * Configures Year & Month selectors
 */
function setupSelectors() {
  const yearSel = document.getElementById('attendance-year-select');
  const monthSel = document.getElementById('attendance-month-select');

  if (yearSel) {
    yearSel.value = activeYear;
    yearSel.addEventListener('change', (e) => {
      activeYear = e.target.value;
      renderMonthlyGrid();
      updateKPIs();
    });
  }

  if (monthSel) {
    monthSel.value = activeMonth;
    monthSel.addEventListener('change', (e) => {
      activeMonth = e.target.value;
      renderMonthlyGrid();
      updateKPIs();
    });
  }
}

/**
 * Handles subtab toggling
 */
function setupSubTabs() {
  const tabBtns = document.querySelectorAll('.sub-tabs-container .sub-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tabName = btn.getAttribute('data-subtab');
      activeSubtab = tabName;

      document.querySelectorAll('.attendance-pane').forEach(p => p.classList.remove('active-pane'));
      if (tabName === 'daily') {
        document.getElementById('attendance-pane-daily')?.classList.add('active-pane');
        renderDailySheet();
      } else {
        document.getElementById('attendance-pane-monthly')?.classList.add('active-pane');
        renderMonthlyGrid();
      }
    });
  });
}

/**
 * Configures UI action click listeners
 */
function setupHandlers() {
  // Mark all present
  document.getElementById('btn-mark-all-present')?.addEventListener('click', () => {
    const tbody = document.getElementById('attendance-daily-tbody');
    if (!tbody) return;
    
    tbody.querySelectorAll('tr').forEach(row => {
      // Toggle "Present" button active
      row.querySelectorAll('.status-opt-btn').forEach(btn => {
        if (btn.getAttribute('data-status') === 'Present') {
          btn.classList.add('active-Present');
          // Default clock times
          const clockIn = row.querySelector('.clock-in-input');
          const clockOut = row.querySelector('.clock-out-input');
          if (clockIn && !clockIn.value) clockIn.value = '09:00';
          if (clockOut && !clockOut.value) clockOut.value = '18:00';
        } else {
          btn.className = 'status-opt-btn'; // strip active states
        }
      });
    });
    showToast('Batch Action', 'All staff items marked Present locally. Save to lock.', 'info');
  });

  // Save Daily Attendance
  document.getElementById('btn-save-daily-attendance')?.addEventListener('click', () => {
    const tbody = document.getElementById('attendance-daily-tbody');
    if (!tbody) return;
    
    const records = [];
    const rows = tbody.querySelectorAll('tr');
    
    for (let row of rows) {
      const staffId = row.getAttribute('data-staff-id');
      const activeBtn = row.querySelector('.status-opt-btn[class*="active-"]');
      const status = activeBtn ? activeBtn.getAttribute('data-status') : 'Unmarked';
      
      const checkIn = row.querySelector('.clock-in-input')?.value || '';
      const checkOut = row.querySelector('.clock-out-input')?.value || '';
      const notes = row.querySelector('.notes-input')?.value || '';
      
      records.push({
        id: `att-${staffId}-${activeDate}`,
        staffId,
        date: activeDate,
        checkIn,
        checkOut,
        status,
        notes,
        recordedBy: 'Admin'
      });
    }

    saveAttendanceBatch(records);
    addActivity(`Saved daily attendance roster for ${activeDate}.`);
    showToast('Roster Saved', 'Attendance sheet locked successfully.', 'success');
    
    // Refresh
    renderDailySheet();
    updateKPIs();
    
    // Sync update to payroll engine dynamically
    window.dispatchEvent(new CustomEvent('attendance_sync_updated'));
  });

  // Simulate Check-In
  document.getElementById('btn-simulate-checkin')?.addEventListener('click', () => {
    const staffId = document.getElementById('simulate-staff-select')?.value;
    if (!staffId) return;

    const staffList = getStaff();
    const member = staffList.find(s => s.id === staffId);
    if (!member) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const record = {
      id: `att-${staffId}-${activeDate}`,
      staffId,
      date: activeDate,
      checkIn: timeStr,
      checkOut: '',
      status: 'Present',
      notes: 'Self clock-in simulation',
      recordedBy: 'Self (Portal)'
    };

    saveAttendanceRecord(record);
    addActivity(`${member.name} (${staffId}) clocked in via simulation at ${timeStr}.`);
    showToast('Clocked In', `${member.name} checked in successfully at ${timeStr}.`, 'success');

    renderDailySheet();
    updateKPIs();
    window.dispatchEvent(new CustomEvent('attendance_sync_updated'));
  });

  // Simulate Check-Out
  document.getElementById('btn-simulate-checkout')?.addEventListener('click', () => {
    const staffId = document.getElementById('simulate-staff-select')?.value;
    if (!staffId) return;

    const staffList = getStaff();
    const member = staffList.find(s => s.id === staffId);
    if (!member) return;

    const attendance = getAttendance();
    const todayRecord = attendance.find(a => a.staffId === staffId && a.date === activeDate) || {};

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const record = {
      ...todayRecord,
      id: `att-${staffId}-${activeDate}`,
      staffId,
      date: activeDate,
      checkOut: timeStr,
      status: todayRecord.status === 'Half-day' ? 'Half-day' : 'Present',
      notes: todayRecord.notes ? todayRecord.notes + ' | Clock-out simulation' : 'Clock-out simulation',
      recordedBy: 'Self (Portal)'
    };

    if (!record.checkIn) {
      record.checkIn = '09:00'; // Fallback if they forgot to check in
    }

    saveAttendanceRecord(record);
    addActivity(`${member.name} (${staffId}) clocked out via simulation at ${timeStr}.`);
    showToast('Clocked Out', `${member.name} checked out successfully at ${timeStr}.`, 'success');

    renderDailySheet();
    updateKPIs();
    window.dispatchEvent(new CustomEvent('attendance_sync_updated'));
  });

  // Popover cell clicks
  const popover = document.getElementById('attendance-popover');
  if (popover) {
    popover.querySelectorAll('.btn-popover-status').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!popoverTarget) return;
        
        const status = btn.getAttribute('data-status');
        const { staffId, date } = popoverTarget;
        
        const allAtt = getAttendance();
        const existing = allAtt.find(a => a.staffId === staffId && a.date === date) || {};
        
        if (status === 'clear') {
          // Clear record
          const filtered = allAtt.filter(a => !(a.staffId === staffId && a.date === date));
          localStorage.setItem('ossp_attendance', JSON.stringify(filtered));
          showToast('Record Cleared', 'Attendance cell entry removed.', 'info');
        } else {
          // Set new status
          let checkIn = existing.checkIn || '';
          let checkOut = existing.checkOut || '';
          
          if (status === 'Present') {
            if (!checkIn) checkIn = '09:00';
            if (!checkOut) checkOut = '18:00';
          } else if (status === 'Half-day') {
            if (!checkIn) checkIn = '09:00';
            if (!checkOut) checkOut = '13:00';
          } else {
            checkIn = '';
            checkOut = '';
          }
          
          const record = {
            id: `att-${staffId}-${date}`,
            staffId,
            date,
            checkIn,
            checkOut,
            status,
            notes: existing.notes || 'Status override via Monthly Grid',
            recordedBy: 'Admin'
          };
          saveAttendanceRecord(record);
          showToast('Status Updated', `Updated entry to ${status}.`, 'success');
        }

        popover.classList.add('hidden');
        renderMonthlyGrid();
        updateKPIs();
        window.dispatchEvent(new CustomEvent('attendance_sync_updated'));
      });
    });
  }

  // Close popover on clicking elsewhere
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('attendance-popover');
    if (!popover) return;
    
    const isCell = e.target.closest('.grid-status-btn');
    const isPopover = e.target.closest('.attendance-popover');
    
    if (!isCell && !isPopover) {
      popover.classList.add('hidden');
      popoverTarget = null;
    }
  });
}

/**
 * Renders the daily roster sheet table
 */
function renderDailySheet() {
  const staff = getStaff();
  const attendance = getAttendance();
  const tbody = document.getElementById('attendance-daily-tbody');
  const simSelect = document.getElementById('simulate-staff-select');
  
  if (!tbody) return;

  // Render simulation staff dropdown
  if (simSelect) {
    simSelect.innerHTML = staff.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('');
  }

  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state-text">No active staff members found.</td></tr>`;
    return;
  }

  // Get records for the selected activeDate
  tbody.innerHTML = staff.map(s => {
    const rec = attendance.find(a => a.staffId === s.id && a.date === activeDate) || {};
    const status = rec.status || 'Unmarked';
    const checkIn = rec.checkIn || '';
    const checkOut = rec.checkOut || '';
    const notes = rec.notes || '';
    const recordedBy = rec.recordedBy || 'N/A';

    return `
      <tr data-staff-id="${s.id}">
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${s.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${s.role} | ${s.department}</div>
        </td>
        <td>
          <div class="daily-status-select" data-id="${s.id}">
            <button type="button" class="status-opt-btn ${status === 'Present' ? 'active-Present' : ''}" data-status="Present">Present</button>
            <button type="button" class="status-opt-btn ${status === 'Half-day' ? 'active-Half-day' : ''}" data-status="Half-day">Half</button>
            <button type="button" class="status-opt-btn ${status === 'Absent' ? 'active-Absent' : ''}" data-status="Absent">Absent</button>
            <button type="button" class="status-opt-btn ${status === 'On leave' ? 'active-On-leave' : ''}" data-status="On leave">Leave</button>
          </div>
        </td>
        <td>
          <input type="text" class="clock-in-input text-field" placeholder="09:00" value="${checkIn}" style="width: 80px; text-align: center; height:28px; font-size:12px; border-radius:4px;" ${status === 'Absent' || status === 'On leave' ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="clock-out-input text-field" placeholder="18:00" value="${checkOut}" style="width: 80px; text-align: center; height:28px; font-size:12px; border-radius:4px;" ${status === 'Absent' || status === 'On leave' ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="notes-input text-field" placeholder="Add notes..." value="${notes}" style="width: 100%; min-width: 120px; height:28px; font-size:12px; border-radius:4px;">
        </td>
        <td>
          <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">${recordedBy}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Wire daily status click toggles
  tbody.querySelectorAll('.status-opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = btn.parentElement;
      const row = btn.closest('tr');
      const status = btn.getAttribute('data-status');
      
      parent.querySelectorAll('.status-opt-btn').forEach(b => {
        b.className = 'status-opt-btn'; // reset class names
      });

      btn.classList.add(`active-${status}`);

      // Handle lock/unlock inputs and set default clock times
      const clockIn = row.querySelector('.clock-in-input');
      const clockOut = row.querySelector('.clock-out-input');

      if (status === 'Absent' || status === 'On leave') {
        if (clockIn) { clockIn.disabled = true; clockIn.value = ''; }
        if (clockOut) { clockOut.disabled = true; clockOut.value = ''; }
      } else {
        if (clockIn) { 
          clockIn.disabled = false; 
          if (!clockIn.value) clockIn.value = '09:00'; 
        }
        if (clockOut) { 
          clockOut.disabled = false; 
          if (!clockOut.value) clockOut.value = status === 'Half-day' ? '13:00' : '18:00'; 
        }
      }
    });
  });
}

/**
 * Helper to compute number of days in selected period
 */
function getDaysInMonth(year, month) {
  return new Date(year, parseInt(month, 10), 0).getDate();
}

/**
 * Renders the Monthly Grid Matrix
 */
function renderMonthlyGrid() {
  const staff = getStaff();
  const attendance = getAttendance();
  const thead = document.getElementById('attendance-grid-thead');
  const tbody = document.getElementById('attendance-grid-tbody');

  if (!thead || !tbody) return;

  const totalDays = getDaysInMonth(activeYear, activeMonth);
  const monthNum = parseInt(activeMonth, 10);
  
  // 1. Render Headers
  let headerHtml = `
    <tr>
      <th style="min-width: 180px; text-align: left;">Staff Member</th>
  `;
  
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(activeYear, monthNum - 1, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W...
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    headerHtml += `
      <th class="${isWeekend ? 'text-muted' : ''}" style="min-width: 38px; text-align: center; font-size:10px;">
        <div>${day}</div>
        <div style="font-weight: 500; opacity: 0.7;">${dayName}</div>
      </th>
    `;
  }
  headerHtml += `</tr>`;
  thead.innerHTML = headerHtml;

  // 2. Render Rows
  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalDays + 1}" class="empty-state-text">No active staff members found.</td></tr>`;
    return;
  }

  tbody.innerHTML = staff.map(s => {
    let rowHtml = `
      <tr data-staff-id="${s.id}">
        <td>
          <div style="font-size: 13px; color: var(--text-primary);">${s.name}</div>
          <div style="font-size: 10px; color: var(--text-muted); font-weight: normal;">${s.role}</div>
        </td>
    `;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${activeYear}-${activeMonth}-${String(day).padStart(2, '0')}`;
      const rec = attendance.find(a => a.staffId === s.id && a.date === dateStr) || {};
      const status = rec.status || 'Unmarked';
      
      // Check if weekend (0=Sun, 6=Sat)
      const date = new Date(activeYear, monthNum - 1, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      let displayStatus = status;
      let dotClass = '';
      
      if (isWeekend && status === 'Unmarked') {
        displayStatus = 'Weekend';
        dotClass = 'status-Weekend';
      } else {
        dotClass = `status-${status}`;
      }

      let dotColorClass = 'badge-empty';
      if (displayStatus === 'Present') dotColorClass = 'badge-emerald';
      else if (displayStatus === 'Half-day') dotColorClass = 'badge-orange';
      else if (displayStatus === 'Absent') dotColorClass = 'badge-danger';
      else if (displayStatus === 'On leave') dotColorClass = 'badge-purple';
      else if (displayStatus === 'Weekend') dotColorClass = 'badge-gray';

      rowHtml += `
        <td>
          <button type="button" class="grid-status-btn ${dotClass}" data-date="${dateStr}" data-staff-id="${s.id}" data-weekend="${isWeekend}" style="border: none;" ${isWeekend ? 'disabled' : ''}>
            <span class="badge-dot ${dotColorClass}" style="margin: 0;"></span>
          </button>
        </td>
      `;
    }

    rowHtml += `</tr>`;
    return rowHtml;
  }).join('');

  // Wire cell buttons to show status change popover
  tbody.querySelectorAll('.grid-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const staffId = btn.getAttribute('data-staff-id');
      const date = btn.getAttribute('data-date');
      const popover = document.getElementById('attendance-popover');
      
      if (!popover) return;
      
      popoverTarget = { staffId, date, element: btn };

      // Position popover
      const rect = btn.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      popover.style.left = `${rect.left + scrollLeft - 75}px`;
      popover.style.top = `${rect.bottom + scrollTop + 8}px`;
      popover.classList.remove('hidden');
    });
  });
}

/**
 * Updates KPI metrics cards based on dates and filters
 */
export function updateKPIs() {
  const attendance = getAttendance();
  const staff = getStaff();
  
  // 1. Metrics for activeDate (Today's Sheet)
  const todayRecs = attendance.filter(a => a.date === activeDate);
  const presentToday = todayRecs.filter(a => a.status === 'Present').length;
  const halfToday = todayRecs.filter(a => a.status === 'Half-day').length;
  const absentToday = todayRecs.filter(a => a.status === 'Absent').length;
  
  // Late check-ins (>09:30 AM)
  let lateCount = 0;
  todayRecs.forEach(r => {
    if (r.status === 'Present' || r.status === 'Half-day') {
      if (r.checkIn) {
        const [hh, mm] = r.checkIn.split(':').map(Number);
        if (hh > 9 || (hh === 9 && mm > 30)) {
          lateCount++;
        }
      }
    }
  });

  // Compile absent names
  const absentNames = [];
  todayRecs.forEach(r => {
    if (r.status === 'Absent') {
      const member = staff.find(s => s.id === r.staffId);
      if (member) absentNames.push(member.name);
    }
  });

  // Render Daily KPIs
  const dateLabel = document.getElementById('att-kpi-present-date');
  if (dateLabel) {
    const formatted = new Date(activeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateLabel.innerText = `For ${formatted}`;
  }

  const presentNode = document.getElementById('att-kpi-present');
  if (presentNode) presentNode.innerText = `${presentToday + halfToday} / ${staff.length}`;

  const lateNode = document.getElementById('att-kpi-late');
  if (lateNode) lateNode.innerText = String(lateCount);

  const absentCountNode = document.getElementById('att-kpi-absent');
  if (absentCountNode) absentCountNode.innerText = String(absentToday);

  const absentNamesNode = document.getElementById('att-kpi-absent-names');
  if (absentNamesNode) {
    absentNamesNode.innerText = absentNames.length > 0 ? absentNames.join(', ') : 'No absences logged';
    absentNamesNode.title = absentNames.join(', ');
  }

  // 2. Monthly averages
  const monthRecs = attendance.filter(a => {
    const [y, m, d] = a.date.split('-');
    return y === activeYear && m === activeMonth;
  });

  // Calculate rate: total Present count divided by total records for the month
  if (monthRecs.length > 0) {
    const presentSum = monthRecs.filter(a => a.status === 'Present').length;
    const halfSum = monthRecs.filter(a => a.status === 'Half-day').length;
    // Count half-days as 0.5 present
    const rate = Math.round(((presentSum + halfSum * 0.5) / monthRecs.length) * 100);
    
    const rateNode = document.getElementById('att-kpi-rate');
    if (rateNode) rateNode.innerText = `${rate}%`;
  } else {
    const rateNode = document.getElementById('att-kpi-rate');
    if (rateNode) rateNode.innerText = '0%';
  }
}
