import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Calendar, User, FileText } from 'lucide-react';
import { saveAttendanceRecord, getAttendanceList } from '../supabaseClient';
import { showToast, formatDate, formatTimeAMPM } from '../utils';

export default function StaffDashboardView({ member, attendance, onRefresh }) {
  const activeDate = '2026-06-11'; // Match system date context
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [liveTrigger, setLiveTrigger] = useState(0);

  // Live timer for working hours
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTrigger(prev => prev + 1);
    }, 60 * 1000); // refresh every minute
    return () => clearInterval(timer);
  }, []);

  // Today's attendance record for the logged-in staff member
  const todayRecord = attendance.find(a => a.staffId === member.id && a.date === activeDate) || null;
  const status = todayRecord ? todayRecord.status : 'Not Clocked In';

  // Find all records for this member in selected month & year
  const monthlyRecords = attendance.filter(a => {
    const [y, m] = a.date.split('-');
    return y === selectedYear && m === selectedMonth && a.staffId === member.id;
  });

  const getLiveHoursWorked = () => {
    if (!todayRecord || !todayRecord.checkIn) return '0.0';
    if (todayRecord.checkOut) return todayRecord.totalHours || '0.0';

    const [h, m] = todayRecord.checkIn.split(':').map(Number);
    const inTime = new Date(`${activeDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const now = new Date();
    const diffMs = Math.max(0, now - inTime);
    const diffHrs = diffMs / (1000 * 60 * 60);
    return Math.min(9.0, Number(diffHrs.toFixed(2))).toFixed(1);
  };

  const handleClockIn = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);

    const record = {
      staffId: member.id,
      date: activeDate,
      checkIn: timeStr,
      checkOut: '',
      status: isLate ? 'Late' : 'Present',
      notes: 'Self clock-in',
      recordedBy: 'Self (Portal)'
    };

    saveAttendanceRecord(record).then(() => {
      showToast('Checked In', `Successfully clocked in today at ${timeStr}.`, 'success');
      onRefresh();
    });
  };

  const handleClockOut = () => {
    if (!todayRecord) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const record = {
      ...todayRecord,
      checkOut: timeStr,
      status: todayRecord.status === 'Half-day' ? 'Half-day' : todayRecord.status,
      notes: todayRecord.notes ? todayRecord.notes + ' | Clock-out' : 'Clock-out',
      recordedBy: 'Self (Portal)'
    };

    saveAttendanceRecord(record).then(() => {
      showToast('Checked Out', `Successfully clocked out today at ${timeStr}.`, 'success');
      onRefresh();
    });
  };

  // Status Colors for Badge
  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'Present': return 'badge-emerald';
      case 'Late': return 'badge-amber';
      case 'Half-day': return 'badge-orange';
      case 'Absent': return 'badge-danger';
      case 'On leave': return 'badge-purple';
      default: return 'badge-secondary';
    }
  };

  const getComplianceStatus = () => {
    if (member.aadhaar && member.pan) {
      return <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>✅ Fully Verified</span>;
    } else if (!member.aadhaar && !member.pan) {
      return <span style={{ color: 'var(--accent-danger)', fontWeight: 700 }}>❌ Verification Pending (Aadhaar & PAN)</span>;
    } else if (!member.aadhaar) {
      return <span style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>⚠️ Aadhaar Missing</span>;
    } else {
      return <span style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>⚠️ PAN Missing (20% TDS Penalty)</span>;
    }
  };

  return (
    <div style={styles.grid}>
      
      {/* Welcome Card & Daily Timecard */}
      <div className="glass-panel" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={styles.welcomeRow}>
          <div>
            <h2 style={styles.welcomeTitle}>Welcome back, {member.name}!</h2>
            <p style={styles.welcomeSub}>{member.role} • {member.department}</p>
          </div>
          <span className={`badge ${getStatusBadgeClass(status)}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
            Status: {status}
          </span>
        </div>

        {/* TIME CARD WIDGET */}
        <div style={styles.timeCardGrid}>
          <div style={styles.timeBlock}>
            <span style={styles.timeLabel}>Clock-In Time</span>
            <strong style={styles.timeVal}>{todayRecord && todayRecord.checkIn ? formatTimeAMPM(todayRecord.checkIn) : '— : —'}</strong>
            <span style={styles.timeSub}>Shift target: 09:00 AM</span>
          </div>

          <div style={styles.timeBlock}>
            <span style={styles.timeLabel}>Clock-Out Time</span>
            <strong style={styles.timeVal}>{todayRecord && todayRecord.checkOut ? formatTimeAMPM(todayRecord.checkOut) : '— : —'}</strong>
            <span style={styles.timeSub}>Shift target: 06:00 PM</span>
          </div>

          <div style={styles.timeBlock}>
            <span style={styles.timeLabel}>Active Duration</span>
            <strong style={styles.timeVal}>{todayRecord && todayRecord.checkIn ? `${getLiveHoursWorked()} hrs` : '0.0 hrs'}</strong>
            <span style={styles.timeSub}>{todayRecord && !todayRecord.checkOut ? 'Still working...' : 'Shift closed'}</span>
          </div>

          <div style={styles.actionBlock}>
            {!todayRecord ? (
              <button className="btn btn-emerald" style={styles.clockBtn} onClick={handleClockIn}>
                <Clock size={18} style={{ marginRight: '6px' }} />
                Clock In Today
              </button>
            ) : !todayRecord.checkOut ? (
              <button className="btn btn-secondary" style={{ ...styles.clockBtn, background: '#ef4444', color: 'white', border: 'none' }} onClick={handleClockOut}>
                <Clock size={18} style={{ marginRight: '6px' }} />
                Clock Out Shift
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ ...styles.clockBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled>
                <CheckCircle size={18} style={{ marginRight: '6px' }} />
                Shift Completed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Dossier Panel */}
      <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>My Profile Details</h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Compliance & personal records</p>
        </div>

        <div style={styles.profileDetailsList}>
          <div style={styles.profileDetailItem}>
            <span>Phone:</span>
            <strong>{member.phone || '—'}</strong>
          </div>
          <div style={styles.profileDetailItem}>
            <span>Email:</span>
            <strong>{member.email || '—'}</strong>
          </div>
          <div style={styles.profileDetailItem}>
            <span>DOB:</span>
            <strong>{member.dob ? formatDate(member.dob) : '—'}</strong>
          </div>
          <div style={styles.profileDetailItem}>
            <span>Gender:</span>
            <strong>{member.gender || '—'}</strong>
          </div>
          <div style={styles.profileDetailItem}>
            <span>Address:</span>
            <strong style={{ fontSize: '11px', textAlign: 'right', maxWidth: '180px' }}>{member.address || '—'}</strong>
          </div>
          
          <div style={{ ...styles.profileDetailItem, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '10px' }}>
            <span>Compliance:</span>
            <strong>{getComplianceStatus()}</strong>
          </div>
        </div>
      </div>

      {/* SECTION 2: My Monthly Attendance Log */}
      <div className="glass-panel table-panel" style={{ gridColumn: 'span 12' }}>
        <div className="panel-header-flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px', marginBottom: '15px' }}>
          <div>
            <h3>My Monthly Attendance logs</h3>
            <p>Chronological listing of your clock records</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
            >
              <option value="06">June</option>
              <option value="05">May</option>
              <option value="04">April</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock-In</th>
                <th>Clock-Out</th>
                <th>Hours Worked</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No records logged for this month.</td>
                </tr>
              ) : (
                [...monthlyRecords].sort((a, b) => b.date.localeCompare(a.date)).map(rec => (
                  <tr key={rec.id}>
                    <td><strong>{formatDate(rec.date)}</strong></td>
                    <td style={{ color: rec.status === 'Late' ? '#f59e0b' : 'inherit' }}>
                      {rec.checkIn ? formatTimeAMPM(rec.checkIn) : '—'}
                    </td>
                    <td>
                      {rec.checkOut ? formatTimeAMPM(rec.checkOut) : rec.checkIn ? <span style={{ color: '#10b981', fontStyle: 'italic' }}>Active</span> : '—'}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {rec.checkIn ? `${rec.totalHours || getLiveHoursWorked(rec)} hrs` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(rec.status)}`}>{rec.status}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      {rec.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '24px'
  },
  welcomeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '15px'
  },
  welcomeTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '700',
    color: '#f3f4f6'
  },
  welcomeSub: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  timeCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    padding: '10px 0'
  },
  timeBlock: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center'
  },
  timeLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  timeVal: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    margin: '4px 0'
  },
  timeSub: {
    fontSize: '10px',
    color: 'var(--text-muted)'
  },
  actionBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  clockBtn: {
    width: '100%',
    height: '50px',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileDetailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  profileDetailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    alignItems: 'center'
  }
};
