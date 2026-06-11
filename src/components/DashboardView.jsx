import React, { useState, useEffect, useRef } from 'react';
import { getAttendanceList, saveAttendanceRecord, mapUIStatusToDB } from '../supabaseClient';
import { formatCurrency, showToast, formatTimeAMPM } from '../utils';

export default function DashboardView({ staff, attendance, onRefresh, onEditStaff, onViewStaff }) {
  const [activeDate, setActiveDate] = useState('2026-06-11'); // Local context system date
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Expanded card dropdown lists toggles
  const [showPresentList, setShowPresentList] = useState(false);
  const [showAbsentList, setShowAbsentList] = useState(false);
  const [showLateList, setShowLateList] = useState(false);

  // Payroll modal state
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollStatus, setPayrollStatus] = useState('summary'); // 'summary' or 'success'
  const [payrollMonth, setPayrollMonth] = useState('June 2026');

  // Live timer for "Still working" updates (re-calculates hours every 5 minutes)
  const [liveTrigger, setLiveTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTrigger(prev => prev + 1);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(timer);
  }, []);

  // 1. Calculations for Today's KPIs
  const todayRecs = attendance.filter(a => a.date === activeDate);
  const totalStaffCount = staff.length;

  const presentTodayRecs = todayRecs.filter(a => a.status === 'Present');
  const halfDayTodayRecs = todayRecs.filter(a => a.status === 'Half-day');
  const lateTodayRecs = todayRecs.filter(a => a.status === 'Late');
  const absentTodayRecs = todayRecs.filter(a => a.status === 'Absent');
  const onLeaveTodayRecs = todayRecs.filter(a => a.status === 'On leave');

  // Counts
  const presentCount = presentTodayRecs.length + halfDayTodayRecs.length + lateTodayRecs.length;
  const absentCount = absentTodayRecs.length;
  const lateCount = lateTodayRecs.length;

  // Compile lists of names & details
  const presentStaffDetails = todayRecs
    .filter(a => ['Present', 'Half-day', 'Late'].includes(a.status))
    .map(a => {
      const member = staff.find(s => s.id === a.staffId) || {};
      return {
        id: a.staffId,
        name: member.name || 'Unknown',
        checkIn: a.checkIn,
        status: a.status
      };
    });

  const absentStaffDetails = todayRecs
    .filter(a => a.status === 'Absent')
    .map(a => {
      const member = staff.find(s => s.id === a.staffId) || {};
      return {
        id: a.staffId,
        name: member.name || 'Unknown'
      };
    });

  const lateStaffDetails = todayRecs
    .filter(a => a.status === 'Late')
    .map(a => {
      const member = staff.find(s => s.id === a.staffId) || {};
      // Calculate delay in minutes assuming 9:00 AM standard start
      let delayText = 'Late';
      if (a.checkIn) {
        const [h, m] = a.checkIn.split(':').map(Number);
        const totalMins = h * 60 + m;
        const startMins = 9 * 60; // 09:00 AM
        const diff = totalMins - startMins;
        if (diff > 0) {
          const dh = Math.floor(diff / 60);
          const dm = diff % 60;
          delayText = dh > 0 ? `+${dh}h ${dm}m` : `+${dm} mins`;
        }
      }
      return {
        id: a.staffId,
        name: member.name || 'Unknown',
        checkIn: a.checkIn,
        delay: delayText
      };
    });

  // Calculate Average Work Hours So Far Today
  const calculateAverageHours = () => {
    const activeCheckedIn = todayRecs.filter(a => ['Present', 'Half-day', 'Late'].includes(a.status));
    if (activeCheckedIn.length === 0) return '0h';

    let totalHrs = 0;
    activeCheckedIn.forEach(a => {
      if (a.checkOut) {
        // If checked out, use total hours
        totalHrs += a.totalHours || 0;
      } else if (a.checkIn) {
        // If still working, calculate from checkIn to now
        const [h, m] = a.checkIn.split(':').map(Number);
        const inTime = new Date(`${activeDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        const now = new Date();
        const diffMs = Math.max(0, now - inTime);
        const diffHrs = diffMs / (1000 * 60 * 60);
        totalHrs += Math.min(9, Number(diffHrs.toFixed(2))); // max 9 hours shift
      }
    });

    const avg = totalHrs / activeCheckedIn.length;
    return `${avg.toFixed(1)} hrs`;
  };

  const avgWorkHours = calculateAverageHours();

  // 2. Today's Detailed Roster Table Filtering
  const filteredRoster = staff.filter(s => {
    if (filterDept !== 'all' && s.department !== filterDept) return false;
    
    const rec = todayRecs.find(a => a.staffId === s.id);
    const status = rec ? rec.status : 'Unmarked';
    
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    return true;
  });

  const getLiveHoursWorked = (rec) => {
    if (!rec || !rec.checkIn) return '0.0';
    if (rec.checkOut) return rec.totalHours || '0.0';
    
    // If still working
    const [h, m] = rec.checkIn.split(':').map(Number);
    const inTime = new Date(`${activeDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const now = new Date();
    const diffMs = Math.max(0, now - inTime);
    const diffHrs = diffMs / (1000 * 60 * 60);
    return Math.min(9.0, Number(diffHrs.toFixed(2))).toFixed(1);
  };

  const handleMarkAbsent = (staffId) => {
    const record = {
      staffId,
      date: activeDate,
      checkIn: '',
      checkOut: '',
      status: 'Absent',
      notes: 'Marked absent by admin',
      recordedBy: 'Admin'
    };
    saveAttendanceRecord(record).then(() => {
      showToast('Status Updated', 'Marked staff member as Absent.', 'warning');
      onRefresh();
    });
  };

  // 3. Monthly report calculations
  const getDaysInMonth = (year, month) => {
    return new Date(year, parseInt(month, 10), 0).getDate();
  };

  const currentMonthDays = getDaysInMonth(selectedYear, selectedMonth);

  const getMonthlyStaffStats = () => {
    return staff.map(s => {
      // Find all records for this member in selected month & year
      const recs = attendance.filter(a => {
        const [y, m] = a.date.split('-');
        return y === selectedYear && m === selectedMonth && a.staffId === s.id;
      });

      const daysPresent = recs.filter(a => ['Present', 'Late', 'Half-day'].includes(a.status)).length;
      const daysAbsent = recs.filter(a => a.status === 'Absent').length;
      
      let totalHrs = 0;
      recs.forEach(a => {
        totalHrs += Number(a.totalHours || 0);
      });

      // Attendance percentage
      const totalLoggedDays = daysPresent + daysAbsent;
      const attPercentage = totalLoggedDays > 0 ? Math.round((daysPresent / totalLoggedDays) * 100) : 100;

      return {
        id: s.id,
        name: s.name,
        department: s.department,
        role: s.role,
        daysPresent,
        daysAbsent,
        totalHours: totalHrs.toFixed(1),
        percentage: attPercentage
      };
    });
  };

  const monthlyStats = getMonthlyStaffStats();

  const handleDownloadMonthlyCSV = () => {
    if (monthlyStats.length === 0) {
      showToast('Download Failed', 'No attendance data for this period.', 'warning');
      return;
    }

    const headers = ['Staff Name', 'Department', 'Days Present', 'Days Absent', 'Total Hours Worked', 'Attendance %'];
    const rows = monthlyStats.map(s => [
      s.name,
      s.department,
      s.daysPresent,
      s.daysAbsent,
      s.totalHours,
      `${s.percentage}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OswaldStack_Attendance_${selectedYear}_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Report Downloaded', 'Monthly attendance CSV download started.', 'success');
  };

  // 4. Department-wise breakdown rates
  const getDepartmentStats = () => {
    const departments = ['Marketing', 'Frontend', 'Backend', 'Data Analyst', 'Data Entry', 'AI/ML Developer'];
    return departments.map(d => {
      const deptStaff = staff.filter(s => s.department === d);
      const totalInDept = deptStaff.length;
      if (totalInDept === 0) return { name: d, present: 0, total: 0, rate: 0 };

      // Count present today in this dept
      let presentInDept = 0;
      deptStaff.forEach(s => {
        const hasCheckin = todayRecs.find(a => a.staffId === s.id && ['Present', 'Late', 'Half-day'].includes(a.status));
        if (hasCheckin) presentInDept++;
      });

      const rate = Math.round((presentInDept / totalInDept) * 100);
      return {
        name: d,
        present: presentInDept,
        total: totalInDept,
        rate
      };
    });
  };

  const departmentStats = getDepartmentStats();

  // 5. Payroll Integration Calculations
  // Total absentees in the current month
  const getMonthlyTotalAbsences = () => {
    const monthlyRecs = attendance.filter(a => {
      const [y, m] = a.date.split('-');
      return y === selectedYear && m === selectedMonth;
    });
    return monthlyRecs.filter(a => a.status === 'Absent').length;
  };

  const monthlyAbsencesCount = getMonthlyTotalAbsences();

  // Deductions are calculated as: ₹1,500 penalty per absent day
  const calculateDeductions = (absentDays) => {
    return absentDays * 1500;
  };

  const handleRunPayroll = () => {
    setPayrollMonth(`${selectedMonth === '06' ? 'June' : selectedMonth === '05' ? 'May' : 'April'} ${selectedYear}`);
    setPayrollStatus('summary');
    setShowPayrollModal(true);
  };

  const handleConfirmPayroll = () => {
    setPayrollStatus('success');
    showToast('Payroll Finalized', `Stipends and attendance deductions generated successfully for ${payrollMonth}.`, 'success');
  };

  return (
    <div>
      {/* SECTION 1: Live Status Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        
        {/* Total Staff */}
        <div className="kpi-card" id="kpi-total-staff">
          <div className="kpi-icon icon-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="kpi-content">
            <span>Total Staff Members</span>
            <h3>{totalStaffCount}</h3>
            <p>Active team roster</p>
          </div>
        </div>
        
        {/* Present Today */}
        <div className="kpi-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowPresentList(!showPresentList)}>
          <div className="kpi-icon icon-emerald">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="kpi-content">
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Present Today <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{showPresentList ? '▲ hide' : '▼ view'}</span>
            </span>
            <h3>{presentCount}</h3>
            <p>Active on duty today</p>
          </div>
          
          {showPresentList && (
            <div className="card-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0e1626', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', zIndex: 100, padding: '10px', maxHeight: '180px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>Present Staff Details</h5>
              {presentStaffDetails.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No present staff recorded yet.</div>
              ) : (
                presentStaffDetails.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.02)' }}>
                    <span>{p.name}</span>
                    <span style={{ color: p.status === 'Late' ? '#f59e0b' : '#10b981' }}>{p.checkIn ? formatTimeAMPM(p.checkIn) : 'N/A'} ({p.status})</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Absent Today */}
        <div className="kpi-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAbsentList(!showAbsentList)}>
          <div className="kpi-icon icon-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="kpi-content">
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Absent Today <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{showAbsentList ? '▲ hide' : '▼ view'}</span>
            </span>
            <h3 style={{ color: '#ef4444' }}>{absentCount}</h3>
            <p>Missing check-ins today</p>
          </div>

          {showAbsentList && (
            <div className="card-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0e1626', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', zIndex: 100, padding: '10px', maxHeight: '180px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#ef4444', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>Absent Staff</h5>
              {absentStaffDetails.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No absentees logged today.</div>
              ) : (
                absentStaffDetails.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#fca5a5' }}>
                    <span>{p.name}</span>
                    <span>Absent</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Late Arrivals */}
        <div className="kpi-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowLateList(!showLateList)}>
          <div className="kpi-icon icon-orange" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="kpi-content">
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Late Arrivals <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{showLateList ? '▲ hide' : '▼ view'}</span>
            </span>
            <h3 style={{ color: '#f59e0b' }}>{lateCount}</h3>
            <p>After 9:00 AM clock-in</p>
          </div>

          {showLateList && (
            <div className="card-dropdown-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0e1626', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', zIndex: 100, padding: '10px', maxHeight: '180px', overflowY: 'auto', marginTop: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#f59e0b', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>Late Clock-ins (after 9:00 AM)</h5>
              {lateStaffDetails.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No late arrivals logged today.</div>
              ) : (
                lateStaffDetails.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', color: '#fde047' }}>
                    <span>{p.name}</span>
                    <span>{p.checkIn ? formatTimeAMPM(p.checkIn) : ''} ({p.delay})</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Avg Work Hours */}
        <div className="kpi-card">
          <div className="kpi-icon icon-purple">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div className="kpi-content">
            <span>Average Work Hours</span>
            <h3>{avgWorkHours}</h3>
            <p>Active members today</p>
          </div>
        </div>

      </div>

      {/* DASHBOARD GRID */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        
        {/* SECTION 2: Today's Detailed Attendance Table */}
        <div className="glass-panel table-panel grid-span-8" style={{ gridColumn: 'span 8' }}>
          <div className="panel-header-flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px', marginBottom: '15px' }}>
            <div>
              <h3>Today's Attendance Roster</h3>
              <p>Real-time status sheet for {new Date(activeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            
            {/* Inline filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={filterDept} 
                onChange={(e) => setFilterDept(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
              >
                <option value="all">All Depts</option>
                <option value="Marketing">Marketing</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Data Entry">Data Entry</option>
                <option value="AI/ML Developer">AI/ML Developer</option>
              </select>

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
              >
                <option value="all">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half-day">Half-day</option>
                <option value="Absent">Absent</option>
                <option value="On leave">On Leave</option>
                <option value="Unmarked">Unmarked</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Department</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Hours Worked</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map(s => {
                  const rec = todayRecs.find(a => a.staffId === s.id);
                  const status = rec ? rec.status : 'Unmarked';
                  
                  // Status Badge Styles
                  let badgeClass = 'badge-secondary';
                  let rowStyle = {};
                  
                  if (status === 'Present') badgeClass = 'badge-emerald';
                  else if (status === 'Late') {
                    badgeClass = 'badge-amber';
                    rowStyle = { backgroundColor: 'rgba(245, 158, 11, 0.03)' }; // amber highlight
                  }
                  else if (status === 'Half-day') badgeClass = 'badge-orange';
                  else if (status === 'Absent') {
                    badgeClass = 'badge-danger';
                    rowStyle = { backgroundColor: 'rgba(239, 68, 68, 0.04)' }; // red highlight
                  }
                  else if (status === 'On leave') badgeClass = 'badge-purple';

                  return (
                    <tr key={s.id} style={rowStyle}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => onViewStaff(s.id)}>{s.name}</strong>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.role}</div>
                      </td>
                      <td>{s.department}</td>
                      <td style={{ color: status === 'Late' ? '#f59e0b' : 'inherit' }}>
                        {rec && rec.checkIn ? formatTimeAMPM(rec.checkIn) : '—'}
                      </td>
                      <td>
                        {rec && rec.checkOut ? formatTimeAMPM(rec.checkOut) : rec && rec.checkIn ? <span style={{ color: '#10b981', fontStyle: 'italic', fontSize: '12px' }}>Still working</span> : '—'}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {rec && rec.checkIn ? `${getLiveHoursWorked(rec)}h` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{status}</span>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-action btn-action-edit" title="Edit Profile" onClick={() => onEditStaff(s.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          {status !== 'Absent' && (
                            <button className="btn-action btn-action-delete" title="Mark Absent" onClick={() => handleMarkAbsent(s.id)} style={{ color: '#ef4444' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          )}
                          <button className="btn-action btn-action-view" title="View Details" onClick={() => onViewStaff(s.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: Department-wise Breakdown */}
        <div className="glass-panel chart-panel grid-span-4" style={{ gridColumn: 'span 4' }}>
          <div className="panel-header" style={{ marginBottom: '15px' }}>
            <h3>Department Breakdown</h3>
            <p>Active presence rates today</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {departmentStats.map(dept => (
              <div key={dept.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{dept.name}</span>
                  <strong style={{ color: dept.rate >= 80 ? '#10b981' : dept.rate >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {dept.present}/{dept.total} present ({dept.rate}%)
                  </strong>
                </div>
                
                {/* Horizontal Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${dept.rate}%`, 
                      height: '100%', 
                      background: dept.rate >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : dept.rate >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)', 
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Monthly Attendance Report */}
        <div className="glass-panel table-panel grid-span-8" style={{ gridColumn: 'span 8' }}>
          <div className="panel-header-flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px', marginBottom: '15px' }}>
            <div>
              <h3>Monthly Attendance Aggregates</h3>
              <p>Consolidated statistics for payroll and stipends</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
              >
                <option value="06">June</option>
                <option value="05">May</option>
                <option value="04">April</option>
              </select>
              
              <button className="btn btn-secondary" style={{ height: '28px', padding: '0 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleDownloadMonthlyCSV}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Days Present</th>
                  <th>Days Absent</th>
                  <th>Total Hours</th>
                  <th>Attendance %</th>
                  <th>Compliance Badge</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map(s => {
                  const highAbsence = s.percentage < 80; // >20% absence warning
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.department}</div>
                      </td>
                      <td>{s.daysPresent} days</td>
                      <td style={{ color: s.daysAbsent > 0 ? '#ef4444' : 'inherit' }}>{s.daysAbsent} days</td>
                      <td>{s.totalHours} hrs</td>
                      <td style={{ fontWeight: 600, color: highAbsence ? '#ef4444' : 'inherit' }}>
                        {s.percentage}%
                      </td>
                      <td>
                        {highAbsence ? (
                          <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>⚠️ {100 - s.percentage}% Absenteeism</span>
                        ) : (
                          <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 6px' }}>Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration with Payroll Box */}
        <div className="glass-panel grid-span-4" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="panel-header" style={{ marginBottom: '15px' }}>
            <h3>Payroll & Stipends Integration</h3>
            <p>Sync monthly attendance logs and calculate pay</p>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Month:</span>
              <strong>{selectedMonth === '06' ? 'June 2026' : selectedMonth === '05' ? 'May 2026' : 'April 2026'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span>Total Absences Logged:</span>
              <strong style={{ color: '#ef4444' }}>{monthlyAbsencesCount} days</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Est. Salary Deductions:</span>
              <strong style={{ color: '#f59e0b' }}>{formatCurrency(calculateDeductions(monthlyAbsencesCount))}</strong>
            </div>
          </div>
          
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', height: '40px', fontWeight: '600' }} onClick={handleRunPayroll}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="10" x2="12" y2="18"/><line x1="8" y1="14" x2="16" y2="14"/></svg>
            Run Monthly Payroll
          </button>
        </div>

      </div>

      {/* RUN PAYROLL WIZARD MODAL */}
      {showPayrollModal && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-container confirmation-container" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3>Run Payroll: {payrollMonth}</h3>
              <button className="modal-close btn-close-modal" onClick={() => setShowPayrollModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            {payrollStatus === 'summary' ? (
              <div>
                <div className="modal-body" style={{ padding: '15px 0' }}>
                  <div className="alert-box-info" style={{ display: 'flex', gap: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#fca5a5' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <div>
                      <h5 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700' }}>Review Absenteeism Log</h5>
                      <p style={{ margin: 0 }}>There are a total of <strong>{monthlyAbsencesCount} absences</strong> recorded for {payrollMonth} before finalizing payroll run.</p>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-primary)' }}>Breakdown of Deductions:</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '6px', padding: '10px', background: 'rgba(0,0,0,0.1)' }}>
                    {monthlyStats.filter(s => s.daysAbsent > 0).length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No absentees to deduct this month.</div>
                    ) : (
                      monthlyStats.filter(s => s.daysAbsent > 0).map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <div>
                            <strong>{s.name}</strong> <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({s.department})</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#ef4444', fontWeight: '600' }}>-{formatCurrency(calculateDeductions(s.daysAbsent))}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.daysAbsent} days absent</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Total Payroll Deductions:</span>
                    <strong style={{ fontSize: '18px', color: '#ef4444' }}>{formatCurrency(calculateDeductions(monthlyAbsencesCount))}</strong>
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowPayrollModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleConfirmPayroll}>Confirm & Finalize Payroll</button>
                </div>
              </div>
            ) : (
              /* Success View */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" style={{ marginBottom: '15px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h4 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Payroll Finalized</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Stipend reports have been generated and dispatched to the payroll scheduler.</p>
                <button className="btn btn-secondary" onClick={() => setShowPayrollModal(false)} style={{ minWidth: '100px' }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
