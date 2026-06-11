/**
 * reports.js - Analytics and data exports (CSV) controller
 */

import { getStaff, addActivity } from './db.js?v=1.0.8';
import { formatCurrency, showToast } from './utils.js?v=1.0.8';

/**
 * Initializes reports metrics and wire up export listeners
 */
export function initReports() {
  renderStaffDistributionSummary();
  renderDepartmentRosterTable();
  setupExportTriggers();
}

/**
 * Calculates aggregated staff and compliance metrics
 */
function renderStaffDistributionSummary() {
  const staff = getStaff();

  const fullTimeCount = staff.filter(s => s.employmentType === 'Full-time').length;
  const otherCount = staff.filter(s => s.employmentType === 'Intern' || s.employmentType === 'Contractor' || s.employmentType === 'Part-time').length;
  
  let complianceRate = 0;
  if (staff.length > 0) {
    const compliantCount = staff.filter(s => s.aadhaar && s.pan).length;
    complianceRate = Math.round((compliantCount / staff.length) * 100);
  }

  document.getElementById('report-total-fulltime').innerText = fullTimeCount;
  document.getElementById('report-total-other').innerText = otherCount;
  document.getElementById('report-compliance-rate').innerText = `${complianceRate}%`;
}

/**
 * Compiles department-wise roster summaries
 */
function renderDepartmentRosterTable() {
  const staff = getStaff();
  const tbody = document.getElementById('reports-dept-table-body');
  
  if (!tbody) return;

  // List of standard departments
  const depts = ['Marketing', 'Frontend', 'Backend', 'Data Analyst', 'Data Entry', 'AI/ML Developer'];
  
  const deptData = {};
  depts.forEach(d => {
    deptData[d] = { total: 0, fullTime: 0, intern: 0, contractor: 0 };
  });

  // Accumulate
  staff.forEach(s => {
    const d = s.department;
    if (deptData[d]) {
      deptData[d].total++;
      if (s.employmentType === 'Full-time') {
        deptData[d].fullTime++;
      } else if (s.employmentType === 'Intern') {
        deptData[d].intern++;
      } else if (s.employmentType === 'Contractor') {
        deptData[d].contractor++;
      }
    }
  });

  // Render rows
  tbody.innerHTML = depts.map(d => {
    const info = deptData[d];
    
    return `
      <tr>
        <td><strong>${d}</strong></td>
        <td>${info.total} Active</td>
        <td>${info.fullTime}</td>
        <td>${info.intern}</td>
        <td>${info.contractor}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Binds CSV export buttons
 */
function setupExportTriggers() {
  document.getElementById('btn-export-staff-csv')?.addEventListener('click', exportStaffCSV);
}

function exportStaffCSV() {
  const staff = getStaff();
  if (staff.length === 0) {
    showToast('Export Failed', 'No staff records available to export.', 'warning');
    return;
  }

  // Header row
  const headers = [
    'Staff ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 
    'Address', 'Role', 'Department', 'Employment Type', 'Join Date', 
    'Aadhaar Card', 'PAN Card'
  ];

  // Map values
  const rows = staff.map(s => [
    s.id,
    s.name,
    s.email,
    s.phone,
    s.dob,
    s.gender,
    `"${(s.address || '').replace(/"/g, '""')}"`, // Escape quotes
    s.role,
    s.department,
    s.employmentType,
    s.joinDate,
    s.aadhaar,
    s.pan
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  downloadCSVFile(csvContent, 'OswaldStack_Staff_Directory.csv');
  addActivity("Exported staff roster list to CSV file.");
  showToast('Roster Exported', 'Staff Directory CSV generated and download started.', 'success');
}

/**
 * Standard utility client-side download anchor generator
 */
function downloadCSVFile(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, fileName);
    return;
  }

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
