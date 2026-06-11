import React, { useState, useEffect, useRef } from 'react';
import { getStaffList, getAttendanceList, saveAttendanceBatch, saveAttendanceRecord } from '../supabaseClient';
import { showToast } from '../utils';

export default function AttendanceView({ staff, attendance, onRefresh }) {
  const [activeDate, setActiveDate] = useState('2026-06-11'); // Match current date context
  const [activeYear, setActiveYear] = useState('2026');
  const [activeMonth, setActiveMonth] = useState('06');
  const [activeSubtab, setActiveSubtab] = useState('daily');
  const [simulateStaffId, setSimulateStaffId] = useState('');
  
  // Popover State
  const [popover, setPopover] = useState(null); // { staffId, date, rect }
  const popoverRef = useRef(null);

  useEffect(() => {
    if (staff && staff.length > 0 && !simulateStaffId) {
      setSimulateStaffId(staff[0].id);
    }
  }, [staff]);

  // Handle Mark All Present
  const handleMarkAllPresent = () => {
    const batch = staff.map(s => {
      const existing = attendance.find(a => a.staffId === s.id && a.date === activeDate) || {};
      return {
        staffId: s.id,
        date: activeDate,
        status: 'Present',
        checkIn: existing.checkIn || '09:00',
        checkOut: existing.checkOut || '18:00',
        notes: existing.notes || 'Batch marked present',
        recordedBy: 'Admin'
      };
    });
    saveAttendanceBatch(batch).then(() => {
      showToast('Batch Present', `All staff marked Present for ${activeDate}`, 'success');
      onRefresh();
    });
  };

  // Handle Save Daily Sheet
  const [dailyForm, setDailyForm] = useState({});

  useEffect(() => {
    const initialForm = {};
    staff.forEach(s => {
      const rec = attendance.find(a => a.staffId === s.id && a.date === activeDate) || {};
      initialForm[s.id] = {
        status: rec.status || 'Unmarked',
        checkIn: rec.checkIn || '',
        checkOut: rec.checkOut || '',
        notes: rec.notes || ''
      };
    });
    setDailyForm(initialForm);
  }, [activeDate, staff, attendance]);

  const handleRowStatusChange = (staffId, status) => {
    setDailyForm(prev => {
      const current = prev[staffId] || {};
      let checkIn = current.checkIn;
      let checkOut = current.checkOut;

      if (status === 'Absent' || status === 'On leave') {
        checkIn = '';
        checkOut = '';
      } else {
        if (!checkIn) checkIn = '09:00';
        if (!checkOut) checkOut = status === 'Half-day' ? '13:00' : '18:00';
      }

      return {
        ...prev,
        [staffId]: {
          ...current,
          status,
          checkIn,
          checkOut
        }
      };
    });
  };

  const handleRowInputChange = (staffId, field, value) => {
    setDailyForm(prev => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveDailySheet = () => {
    const batch = Object.keys(dailyForm).map(staffId => ({
      staffId,
      date: activeDate,
      status: dailyForm[staffId].status,
      checkIn: dailyForm[staffId].checkIn,
      checkOut: dailyForm[staffId].checkOut,
      notes: dailyForm[staffId].notes,
      recordedBy: 'Admin'
    }));

    saveAttendanceBatch(batch).then(() => {
      showToast('Roster Saved', 'Attendance sheet locked successfully.', 'success');
      onRefresh();
    });
  };

  // Simulate Check-In
  const handleSimulateCheckin = () => {
    if (!simulateStaffId) return;
    const member = staff.find(s => s.id === simulateStaffId);
    if (!member) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const record = {
      staffId: simulateStaffId,
      date: activeDate,
      checkIn: timeStr,
      checkOut: '',
      status: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0) ? 'Late' : 'Present',
      notes: 'Self clock-in simulation',
      recordedBy: 'Self (Portal)'
    };

    saveAttendanceRecord(record).then(() => {
      showToast('Clocked In', `${member.name} checked in successfully at ${timeStr}.`, 'success');
      onRefresh();
    });
  };

  // Simulate Check-Out
  const handleSimulateCheckout = () => {
    if (!simulateStaffId) return;
    const member = staff.find(s => s.id === simulateStaffId);
    if (!member) return;

    const todayRecord = attendance.find(a => a.staffId === simulateStaffId && a.date === activeDate) || {};

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const record = {
      ...todayRecord,
      staffId: simulateStaffId,
      date: activeDate,
      checkOut: timeStr,
      status: todayRecord.status === 'Half-day' ? 'Half-day' : (todayRecord.status || 'Present'),
      notes: todayRecord.notes ? todayRecord.notes + ' | Clock-out simulation' : 'Clock-out simulation',
      recordedBy: 'Self (Portal)'
    };

    if (!record.checkIn) {
      record.checkIn = '09:00';
    }

    saveAttendanceRecord(record).then(() => {
      showToast('Clocked Out', `${member.name} checked out successfully at ${timeStr}.`, 'success');
      onRefresh();
    });
  };

  // Monthly Matrix Calculations
  const getDaysInMonth = (year, month) => {
    return new Date(year, parseInt(month, 10), 0).getDate();
  };

  const totalDays = getDaysInMonth(activeYear, activeMonth);
  const monthNum = parseInt(activeMonth, 10);

  const handleCellClick = (staffId, date, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      staffId,
      date,
      rect: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 75
      }
    });
  };

  const handlePopoverStatusSelect = (status) => {
    if (!popover) return;
    const { staffId, date } = popover;
    
    const existing = attendance.find(a => a.staffId === staffId && a.date === date) || {};
    
    if (status === 'clear') {
      // For local storage, we delete from array. For Supabase, we delete or update status to 'Unmarked'
      // To keep it simple, we save with status 'Unmarked'
      const record = {
        ...existing,
        staffId,
        date,
        status: 'Unmarked',
        checkIn: '',
        checkOut: '',
        recordedBy: 'Admin'
      };
      saveAttendanceRecord(record).then(() => {
        showToast('Record Cleared', 'Attendance cell entry removed.', 'info');
        setPopover(null);
        onRefresh();
      });
    } else {
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
        ...existing,
        staffId,
        date,
        checkIn,
        checkOut,
        status,
        notes: existing.notes || 'Status override via Monthly Grid',
        recordedBy: 'Admin'
      };

      saveAttendanceRecord(record).then(() => {
        showToast('Status Updated', `Updated entry to ${status}.`, 'success');
        setPopover(null);
        onRefresh();
      });
    }
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popover && popoverRef.current && !popoverRef.current.contains(e.target) && !e.target.closest('.grid-status-btn')) {
        setPopover(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [popover]);

  return (
    <div>
      {/* Attendance Period and Header Options */}
      <div className="attendance-header-actions" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0' }}>
          <label htmlFor="attendance-year-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Year</label>
          <select 
            id="attendance-year-select" 
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', height: '34px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          
          <label htmlFor="attendance-month-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '10px' }}>Month</label>
          <select 
            id="attendance-month-select" 
            value={activeMonth}
            onChange={(e) => setActiveMonth(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', height: '34px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', color: 'white' }}
          >
            <option value="06">June</option>
            <option value="05">May</option>
            <option value="04">April</option>
          </select>
        </div>

        {/* Tab pills toggles */}
        <div className="sub-tabs-container">
          <button className={`sub-tab-btn ${activeSubtab === 'daily' ? 'active' : ''}`} onClick={() => setActiveSubtab('daily')}>Daily Sheet</button>
          <button className={`sub-tab-btn ${activeSubtab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveSubtab('monthly')}>Monthly Grid Matrix</button>
        </div>
      </div>

      {/* DAILY ATTENDANCE SHEET */}
      {activeSubtab === 'daily' ? (
        <div id="attendance-pane-daily" className="glass-panel attendance-pane active-pane">
          <div className="panel-header-flex" style={{ marginBottom: '20px' }}>
            <div>
              <h3>Daily Attendance Roster</h3>
              <p>Log attendance and clock times for active staff</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="attendance-date-input" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '0' }}>Date:</label>
                <input 
                  type="date" 
                  id="attendance-date-input" 
                  value={activeDate}
                  onChange={(e) => setActiveDate(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '12px', height: '28px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white' }}
                />
              </div>
              <button id="btn-mark-all-present" className="btn btn-secondary" style={{ height: '28px', padding: '0 10px', fontSize: '11px' }} onClick={handleMarkAllPresent}>Mark All Present</button>
              <button id="btn-save-daily-attendance" className="btn btn-emerald" style={{ height: '28px', padding: '0 10px', fontSize: '11px' }} onClick={handleSaveDailySheet}>Save Daily Sheet</button>
            </div>
          </div>

          {/* Daily Sheet Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Status Mark</th>
                  <th>Check In (HH:MM)</th>
                  <th>Check Out (HH:MM)</th>
                  <th>Notes / Exceptions</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const state = dailyForm[s.id] || { status: 'Unmarked', checkIn: '', checkOut: '', notes: '' };
                  const rec = attendance.find(a => a.staffId === s.id && a.date === activeDate) || {};
                  const recordedBy = rec.recordedBy || 'N/A';
                  
                  return (
                    <tr key={s.id} data-staff-id={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.role} | {s.department}</div>
                      </td>
                      <td>
                        <div className="daily-status-select">
                          <button 
                            type="button" 
                            className={`status-opt-btn ${state.status === 'Present' ? 'active-Present' : ''}`}
                            onClick={() => handleRowStatusChange(s.id, 'Present')}
                          >
                            Present
                          </button>
                          <button 
                            type="button" 
                            className={`status-opt-btn ${state.status === 'Late' ? 'active-Late' : ''}`}
                            onClick={() => handleRowStatusChange(s.id, 'Late')}
                          >
                            Late
                          </button>
                          <button 
                            type="button" 
                            className={`status-opt-btn ${state.status === 'Half-day' ? 'active-Half-day' : ''}`}
                            onClick={() => handleRowStatusChange(s.id, 'Half-day')}
                          >
                            Half
                          </button>
                          <button 
                            type="button" 
                            className={`status-opt-btn ${state.status === 'Absent' ? 'active-Absent' : ''}`}
                            onClick={() => handleRowStatusChange(s.id, 'Absent')}
                          >
                            Absent
                          </button>
                          <button 
                            type="button" 
                            className={`status-opt-btn ${state.status === 'On leave' ? 'active-On-leave' : ''}`}
                            onClick={() => handleRowStatusChange(s.id, 'On leave')}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="clock-in-input text-field" 
                          placeholder="09:00" 
                          value={state.checkIn}
                          onChange={(e) => handleRowInputChange(s.id, 'checkIn', e.target.value)}
                          disabled={state.status === 'Absent' || state.status === 'On leave' || state.status === 'Unmarked'}
                          style={{ width: '80px', textAlign: 'center', height: '28px', fontSize: '12px', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="clock-out-input text-field" 
                          placeholder="18:00" 
                          value={state.checkOut}
                          onChange={(e) => handleRowInputChange(s.id, 'checkOut', e.target.value)}
                          disabled={state.status === 'Absent' || state.status === 'On leave' || state.status === 'Unmarked'}
                          style={{ width: '80px', textAlign: 'center', height: '28px', fontSize: '12px', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="notes-input text-field" 
                          placeholder="Add notes..." 
                          value={state.notes}
                          onChange={(e) => handleRowInputChange(s.id, 'notes', e.target.value)}
                          style={{ width: '100%', minWidth: '120px', height: '28px', fontSize: '12px', borderRadius: '4px' }}
                        />
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{recordedBy}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Self Check-in Simulator */}
          <div className="self-checkin-simulator" style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--accent-primary)' }}>Simulation: Self Check-In Portal</h4>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Simulate check-in and check-out as an individual staff member for today.</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="simulate-staff-select" style={{ fontSize: '12px', marginBottom: '0', color: 'var(--text-secondary)' }}>Staff Member:</label>
                <select 
                  id="simulate-staff-select" 
                  value={simulateStaffId}
                  onChange={(e) => setSimulateStaffId(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: '12px', height: '30px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'white', minWidth: '160px' }}
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>
              
              <button id="btn-simulate-checkin" className="btn btn-secondary" style={{ height: '30px', padding: '0 14px', fontSize: '11px' }} onClick={handleSimulateCheckin}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Simulate Check-In
              </button>
              <button id="btn-simulate-checkout" className="btn btn-secondary" style={{ height: '30px', padding: '0 14px', fontSize: '11px' }} onClick={handleSimulateCheckout}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Simulate Check-Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MONTHLY CALENDAR GRID */
        <div id="attendance-pane-monthly" className="glass-panel attendance-pane active-pane">
          <div className="panel-header" style={{ marginBottom: '20px' }}>
            <h3>Monthly Attendance Matrix</h3>
            <p>Complete grid sheet for the selected month. Click cells to modify records.</p>
          </div>

          {/* Legend */}
          <div className="grid-legend" style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-emerald"></span> Present</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-amber" style={{ background: '#f59e0b' }}></span> Late</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-orange"></span> Half-day</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-danger"></span> Absent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-purple"></span> On Leave</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-gray"></span> Rest Day / Weekend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="badge-dot badge-empty"></span> Unmarked</div>
          </div>

          {/* Scrollable Matrix Grid */}
          <div className="attendance-grid-container table-responsive">
            <table className="attendance-grid-table data-table" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '180px', textAlign: 'left' }}>Staff Member</th>
                  {Array.from({ length: totalDays }, (_, i) => {
                    const day = i + 1;
                    const date = new Date(activeYear, monthNum - 1, day);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <th key={day} className={isWeekend ? 'text-muted' : ''} style={{ minWidth: '38px', textAlign: 'center', fontSize: '10px' }}>
                        <div>{day}</div>
                        <div style={{ fontWeight: '500', opacity: 0.7 }}>{dayName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id} data-staff-id={s.id}>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal' }}>{s.role}</div>
                    </td>
                    {Array.from({ length: totalDays }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${activeYear}-${activeMonth}-${String(day).padStart(2, '0')}`;
                      const rec = attendance.find(a => a.staffId === s.id && a.date === dateStr) || {};
                      const status = rec.status || 'Unmarked';
                      
                      const date = new Date(activeYear, monthNum - 1, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      
                      let displayStatus = status;
                      if (isWeekend && status === 'Unmarked') {
                        displayStatus = 'Weekend';
                      }

                      let dotColorClass = 'badge-empty';
                      if (displayStatus === 'Present') dotColorClass = 'badge-emerald';
                      else if (displayStatus === 'Late') dotColorClass = 'badge-amber';
                      else if (displayStatus === 'Half-day') dotColorClass = 'badge-orange';
                      else if (displayStatus === 'Absent') dotColorClass = 'badge-danger';
                      else if (displayStatus === 'On leave') dotColorClass = 'badge-purple';
                      else if (displayStatus === 'Weekend') dotColorClass = 'badge-gray';

                      return (
                        <td key={day}>
                          <button 
                            type="button" 
                            className={`grid-status-btn status-${displayStatus}`} 
                            onClick={(e) => handleCellClick(s.id, dateStr, e)}
                            disabled={isWeekend}
                            style={{ border: 'none', background: 'transparent' }}
                          >
                            <span className={`badge-dot ${dotColorClass}`} style={{ margin: '0' }}></span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK STATUS EDIT POPOVER */}
      {popover && (
        <div 
          ref={popoverRef}
          className="attendance-popover" 
          style={{ 
            position: 'absolute', 
            zIndex: 1000, 
            background: '#0f1626', 
            border: '1px solid var(--glass-border)', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: 'var(--shadow-lg)', 
            padding: '12px', 
            width: '180px',
            top: popover.rect.top,
            left: popover.rect.left
          }}
        >
          <h5 style={{ marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginTop: 0 }}>Update Status</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#10b981', padding: '4px 8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('Present')}>
              <span className="badge-dot badge-emerald"></span> Present
            </button>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#f59e0b', padding: '4px 8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('Late')}>
              <span className="badge-dot badge-amber" style={{ background: '#f59e0b' }}></span> Late
            </button>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#f97316', padding: '4px 8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('Half-day')}>
              <span className="badge-dot badge-orange"></span> Half-day
            </button>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#ef4444', padding: '4px 8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('Absent')}>
              <span className="badge-dot badge-danger"></span> Absent
            </button>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#8b5cf6', padding: '4px 8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('On leave')}>
              <span className="badge-dot badge-purple"></span> On Leave
            </button>
            <button className="btn-popover-status" style={{ textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => handlePopoverStatusSelect('clear')}>
              <span className="badge-dot badge-empty"></span> Clear Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
