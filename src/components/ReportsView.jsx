import React from 'react';
import { formatCurrency, showToast } from '../utils';

export default function ReportsView({ staff }) {
  const fullTimeCount = staff.filter(s => s.employmentType === 'Full-time').length;
  const otherCount = staff.filter(s => s.employmentType === 'Intern' || s.employmentType === 'Contractor' || s.employmentType === 'Part-time').length;
  
  const complianceRate = staff.length > 0 
    ? Math.round((staff.filter(s => s.aadhaar && s.pan).length / staff.length) * 100)
    : 100;

  const depts = ['Marketing', 'Frontend', 'Backend', 'Data Analyst', 'Data Entry', 'AI/ML Developer'];
  const deptData = {};
  depts.forEach(d => {
    deptData[d] = { total: 0, fullTime: 0, intern: 0, contractor: 0 };
  });

  staff.forEach(s => {
    const d = s.department;
    if (deptData[d]) {
      deptData[d].total++;
      if (s.employmentType === 'Full-time') deptData[d].fullTime++;
      else if (s.employmentType === 'Intern') deptData[d].intern++;
      else if (s.employmentType === 'Contractor') deptData[d].contractor++;
    }
  });

  const handleExportStaffCSV = () => {
    if (staff.length === 0) {
      showToast('Export Failed', 'No staff records available.', 'warning');
      return;
    }

    const headers = [
      'Staff ID', 'Full Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 
      'Address', 'Role', 'Department', 'Employment Type', 'Join Date', 
      'Aadhaar Card', 'PAN Card'
    ];

    const rows = staff.map(s => [
      s.id,
      s.name,
      s.email,
      s.phone,
      s.dob,
      s.gender,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.role,
      s.department,
      s.employmentType,
      s.joinDate,
      s.aadhaar,
      s.pan
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'OswaldStack_Staff_Directory.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Export Successful', 'Staff Directory CSV has been generated and download started.', 'success');
  };

  return (
    <div>
      <div className="reports-header-actions" style={{ marginBottom: '24px' }}>
        <div className="export-actions">
          <button id="btn-export-staff-csv" className="btn btn-secondary" onClick={handleExportStaffCSV}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Export Staff Directory (CSV)</span>
          </button>
        </div>
      </div>

      <div className="reports-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Staff Distribution Panel */}
        <div className="glass-panel">
          <div className="panel-header">
            <h3>Staff Distribution Statistics</h3>
            <p>Aggregated metrics for team breakdown</p>
          </div>
          <div className="reports-stats-grid">
            <div className="report-stat-card">
              <span>Full-Time Staff</span>
              <h2 id="report-total-fulltime">{fullTimeCount}</h2>
              <p>Core permanent members</p>
            </div>
            <div className="report-stat-card">
              <span>Interns & Contractors</span>
              <h2 id="report-total-other">{otherCount}</h2>
              <p>Flexible workforce count</p>
            </div>
            <div className="report-stat-card">
              <span>Total Compliance Rate</span>
              <h2 id="report-compliance-rate">{complianceRate}%</h2>
              <p>Verified Aadhaar & PAN profiles</p>
            </div>
          </div>
        </div>

        {/* Department Roster Breakdown */}
        <div className="glass-panel">
          <div className="panel-header">
            <h3>Department Roster Breakdown</h3>
            <p>Allocation and counts across teams</p>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Staff</th>
                <th>Full-Time</th>
                <th>Interns</th>
                <th>Contractors</th>
              </tr>
            </thead>
            <tbody>
              {depts.map(d => {
                const info = deptData[d] || { total: 0, fullTime: 0, intern: 0, contractor: 0 };
                return (
                  <tr key={d}>
                    <td><strong>{d}</strong></td>
                    <td>{info.total} Active</td>
                    <td>{info.fullTime}</td>
                    <td>{info.intern}</td>
                    <td>{info.contractor}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
