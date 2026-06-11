import React, { useState, useEffect } from 'react';
import { 
  getStaffList, 
  getAttendanceList, 
  saveStaffMember, 
  deleteStaffMember, 
  saveAttendanceRecord,
  subscribeToRealtimeAttendance,
  isSupabaseConfigured 
} from './supabaseClient';
import { formatSystemTime, showToast } from './utils';

// Views
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import StaffDirectoryView from './components/StaffDirectoryView';
import AttendanceView from './components/AttendanceView';
import ReportsView from './components/ReportsView';
import StaffDashboardView from './components/StaffDashboardView';

// Modals
import StaffWizardModal from './components/StaffWizardModal';
import DossierModal from './components/DossierModal';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('staff'); // 'staff' or 'admin'
  const [currentUser, setCurrentUser] = useState(null); // Staff member object if staff
  
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [systemTime, setSystemTime] = useState(new Date());
  
  // Database States
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  // Modals States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [viewMember, setViewMember] = useState(null);
  
  // Delete Dialog States
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Toast Queue State
  const [toasts, setToasts] = useState([]);

  // Idle Timeout States
  const [showIdlePopup, setShowIdlePopup] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

  // Fetch Database Helper
  const refreshDatabase = () => {
    getStaffList().then(setStaff);
    const start = '2026-04-01';
    const end = '2026-06-30';
    getAttendanceList(start, end).then(setAttendance);
  };

  // Clock Timer Hook
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Database Initialization and Realtime Subscription Hooks
  useEffect(() => {
    refreshDatabase();

    // Subscribe to Supabase Realtime (or local simulated event queue)
    const unsubscribe = subscribeToRealtimeAttendance((payload) => {
      console.log('⚡ Attendance subscription updated:', payload);
      // Hot reload attendance list from payload
      if (payload.event === 'INSERT' || payload.event === 'UPDATE') {
        setAttendance(prev => {
          const index = prev.findIndex(a => a.staffId === payload.data.staffId && a.date === payload.data.date);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = payload.data;
            return copy;
          } else {
            return [...prev, payload.data];
          }
        });
      } else {
        const start = '2026-04-01';
        const end = '2026-06-30';
        getAttendanceList(start, end).then(setAttendance);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to toast event trigger
  useEffect(() => {
    const handleToastEvent = (e) => {
      const { title, message, type, duration } = e.detail;
      const id = Date.now() + Math.random().toString();
      setToasts(prev => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration || 4000);
    };

    window.addEventListener('app_toast', handleToastEvent);
    return () => window.removeEventListener('app_toast', handleToastEvent);
  }, []);

  // Idle Timer Watcher
  useEffect(() => {
    if (!isLoggedIn) return;

    let idleTimer;

    const resetIdleTimer = () => {
      if (showIdlePopup) return; // Don't reset if warning modal is open
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setShowIdlePopup(true);
        setIdleCountdown(60);
      }, 30 * 60 * 1000); // 30 minutes timeout trigger
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [isLoggedIn, showIdlePopup]);

  // Countdown timer for inactivity warning popup
  useEffect(() => {
    let interval;
    if (showIdlePopup) {
      interval = setInterval(() => {
        setIdleCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showIdlePopup]);

  const handleAutoLogout = () => {
    setShowIdlePopup(false);
    
    // Auto clock-out if staff member is checked in
    if (userRole === 'staff' && currentUser) {
      const todayRecord = attendance.find(a => a.staffId === currentUser.id && a.date === '2026-06-11');
      if (todayRecord && !todayRecord.checkOut) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;

        const record = {
          ...todayRecord,
          checkOut: timeStr,
          notes: todayRecord.notes ? todayRecord.notes + ' | Auto check-out due to idle session' : 'Auto check-out due to idle session',
          recordedBy: 'System (Idle)'
        };

        saveAttendanceRecord(record).then(() => {
          showToast('Inactivity Timeout', `${currentUser.name} checked out and logged out automatically.`, 'warning');
          handleLogout();
        });
        return;
      }
    }
    
    showToast('Inactivity Timeout', 'Session closed due to inactivity.', 'info');
    handleLogout();
  };

  const handleKeepWorking = () => {
    setShowIdlePopup(false);
  };

  // Auth logins handler
  const handleLogin = (authData) => {
    setIsLoggedIn(true);
    setUserRole(authData.role);
    
    if (authData.role === 'admin') {
      setCurrentUser(null);
      setCurrentTab('dashboard');
      showToast('Welcome Back', 'Logged in as Portal Administrator.', 'success');
    } else {
      setCurrentUser(authData.member);
      setCurrentTab('dashboard');
      showToast('Welcome', `Hello ${authData.member.name}. Staff Portal active.`, 'success');
      
      // Auto Check-In Trigger
      // Check if logged in member already has check-in today
      const todayRecord = attendance.find(a => a.staffId === authData.member.id && a.date === '2026-06-11');
      if (!todayRecord) {
        // Run auto check-in
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;

        const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);

        const record = {
          staffId: authData.member.id,
          date: '2026-06-11',
          checkIn: timeStr,
          checkOut: '',
          status: isLate ? 'Late' : 'Present',
          notes: 'Auto check-in on auth login',
          recordedBy: 'Auth (Trigger)'
        };

        saveAttendanceRecord(record).then(() => {
          showToast('Auto Check-In', 'Recorded present clock-in time for today.', 'info');
          refreshDatabase();
        });
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    // Clock-out if staff member forgot
    if (userRole === 'staff' && currentUser) {
      const todayRecord = attendance.find(a => a.staffId === currentUser.id && a.date === '2026-06-11');
      if (todayRecord && !todayRecord.checkOut) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;

        const record = {
          ...todayRecord,
          checkOut: timeStr,
          notes: todayRecord.notes ? todayRecord.notes + ' | Checked out on signout' : 'Checked out on signout',
          recordedBy: 'Self (Portal)'
        };

        // Save checkout before logging out
        saveAttendanceRecord(record).then(() => {
          showToast('Checked Out', 'Successfully clocked out on signout.', 'success');
          setIsLoggedIn(false);
          setCurrentUser(null);
          refreshDatabase();
        });
        return;
      }
    }

    setIsLoggedIn(false);
    setCurrentUser(null);
    showToast('Signed Out', 'You have been logged out of the portal.', 'info');
  };

  const handleOpenAddWizard = () => {
    setEditMember(null);
    setIsWizardOpen(true);
  };

  const handleOpenEditWizard = (id) => {
    const member = staff.find(s => s.id === id);
    if (member) {
      setEditMember(member);
      setIsWizardOpen(true);
    }
  };

  const handleOpenDossier = (id) => {
    const member = staff.find(s => s.id === id);
    if (member) {
      setViewMember(member);
      setIsDossierOpen(true);
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      const member = staff.find(s => s.id === deleteId);
      const name = member ? member.name : 'Staff';
      deleteStaffMember(deleteId).then(() => {
        showToast('Profile Deleted', `${name} has been removed from staff directory.`, 'success');
        setIsDeleteOpen(false);
        setDeleteId(null);
        refreshDatabase();
      });
    }
  };

  const handleSaveStaff = (formData) => {
    saveStaffMember(formData).then((saved) => {
      showToast(
        formData.id ? 'Profile Updated' : 'Profile Created',
        `${saved.name} details have been written successfully.`,
        'success'
      );
      setIsWizardOpen(false);
      setEditMember(null);
      refreshDatabase();
    }).catch(err => {
      console.error(err);
      showToast('Error Saving', 'Failed to write record to database.', 'danger');
    });
  };

  const handleCloseToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getTabTitle = (tabId) => {
    if (userRole === 'staff') return 'My Attendance Dashboard';
    switch (tabId) {
      case 'dashboard': return 'Dashboard & Analytics';
      case 'staff': return 'Staff Directory';
      case 'attendance': return 'Attendance Logs';
      case 'reports': return 'Reports & Analytics';
      default: return 'Oswald Stack';
    }
  };

  const getFallbackAvatar = (name) => {
    if (!name) return 'ST';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} staffList={staff} toasts={toasts} onClearToast={handleCloseToast} />;
  }

  return (
    <div className="app-layout">
      
      {/* Toast Notification Container */}
      <div id="toast-container" className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => handleCloseToast(t.id)}>
            {t.type === 'success' && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {t.type === 'warning' && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
            {t.type === 'danger' && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            )}
            {t.type === 'info' && (
              <svg className="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
            <div className="toast-body">
              <h5>{t.title}</h5>
              <p>{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo-img">
            <img src="/logo-icon.png" alt="Oswald Stack Logo" className="brand-logo-file" />
          </div>
          <div className="brand-text">
            <h2>Oswald Stack</h2>
            <span>Staff Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {userRole === 'admin' ? (
            <ul>
              <li>
                <button className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  <span>Dashboard</span>
                </button>
              </li>
              <li>
                <button className={`nav-link ${currentTab === 'staff' ? 'active' : ''}`} onClick={() => setCurrentTab('staff')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Staff Directory</span>
                </button>
              </li>
              <li>
                <button className={`nav-link ${currentTab === 'attendance' ? 'active' : ''}`} onClick={() => setCurrentTab('attendance')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
                  <span>Attendance</span>
                </button>
              </li>
              <li>
                <button className={`nav-link ${currentTab === 'reports' ? 'active' : ''}`} onClick={() => setCurrentTab('reports')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  <span>Reports & Analytics</span>
                </button>
              </li>
            </ul>
          ) : (
            <ul>
              <li>
                <button className={`nav-link ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  <span>My Dashboard</span>
                </button>
              </li>
            </ul>
          )}
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="user-profile-summary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {userRole === 'admin' ? (
              <>
                <div className="profile-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AD</div>
                <div className="profile-info">
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Admin User</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Portal Manager</span>
                </div>
              </>
            ) : (
              <>
                <div className="profile-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {getFallbackAvatar(currentUser?.name)}
                </div>
                <div className="profile-info">
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{currentUser?.name}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{currentUser?.role}</span>
                </div>
              </>
            )}
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', height: '32px', fontSize: '12px', fontWeight: '600' }} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Top Header */}
        <header className="app-header">
          <div className="header-left">
            <h1 id="view-title">{getTabTitle(currentTab)}</h1>
            <p id="current-datetime" className="datetime-display">{formatSystemTime(systemTime)}</p>
          </div>
          
          <div className="header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Role quick toggle helper (great for user demo testing) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '4px 10px', borderRadius: '20px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Viewing:</span>
              <strong style={{ color: userRole === 'admin' ? '#f59e0b' : '#8b5cf6', textTransform: 'capitalize' }}>{userRole}</strong>
            </div>

            {userRole === 'admin' && (
              <button id="quick-add-staff" className="btn btn-secondary" onClick={handleOpenAddWizard}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>Add Staff</span>
              </button>
            )}
          </div>
        </header>

        {/* View Viewport */}
        <div className="view-viewport">
          {userRole === 'admin' ? (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView 
                  staff={staff}
                  attendance={attendance}
                  onRefresh={refreshDatabase}
                  onEditStaff={handleOpenEditWizard}
                  onViewStaff={handleOpenDossier}
                />
              )}

              {currentTab === 'staff' && (
                <StaffDirectoryView 
                  staff={staff}
                  onViewDetails={handleOpenDossier}
                  onEditProfile={handleOpenEditWizard}
                  onDeleteProfile={handleOpenDelete}
                  onAddNewStaff={handleOpenAddWizard}
                />
              )}

              {currentTab === 'attendance' && (
                <AttendanceView 
                  staff={staff}
                  attendance={attendance}
                  onRefresh={refreshDatabase}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView 
                  staff={staff}
                />
              )}
            </>
          ) : (
            /* Staff View Panel */
            <>
              {currentTab === 'dashboard' && (
                <StaffDashboardView 
                  member={currentUser}
                  attendance={attendance}
                  onRefresh={refreshDatabase}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* MODALS & POPUPS */}

      {/* Staff Wizard Form Modal */}
      <StaffWizardModal 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        editMember={editMember}
        onSave={handleSaveStaff}
      />

      {/* Dossier Modal */}
      <DossierModal 
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        member={viewMember}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div id="confirm-modal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-container confirmation-container">
            <div className="modal-header">
              <h3>Remove Staff Profile</h3>
              <button className="modal-close btn-close-modal" onClick={() => setIsDeleteOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '15px 0' }}>
              <p>Are you sure you want to delete <strong>{staff.find(s => s.id === deleteId)?.name}</strong>?</p>
              <p className="text-danger small-text" style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>This action cannot be undone. All active records, excluding historical payroll logs, will be removed.</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button id="btn-delete-cancel" className="btn btn-secondary btn-close-modal" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
              <button id="btn-delete-confirm" className="btn btn-danger" onClick={handleConfirmDelete} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer' }}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* INACTIVITY IDLE TIMEOUT COUNTDOWN POPUP */}
      {showIdlePopup && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Are you still working?</h3>
            <p style={styles.modalText}>
              You have been inactive for 30 minutes. You will be automatically checked out and logged out in:
            </p>
            <div style={styles.countdownContainer}>
              <span style={styles.countdownNum}>{idleCountdown}</span> seconds
            </div>
            <button style={styles.modalBtn} onClick={handleKeepWorking}>
              Yes, I am working
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999
  },
  modal: {
    backgroundColor: '#0f1626',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 16px rgba(99, 102, 241, 0.15)',
    color: '#f3f4f6',
    fontFamily: 'Outfit, sans-serif'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#6366f1',
    margin: '0 0 12px 0'
  },
  modalText: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0 0 24px 0',
    lineHeight: '1.5'
  },
  countdownContainer: {
    fontSize: '18px',
    color: '#f3f4f6',
    fontWeight: '600',
    marginBottom: '24px'
  },
  countdownNum: {
    fontSize: '32px',
    color: '#ef4444',
    fontWeight: '800',
    display: 'inline-block',
    marginRight: '6px',
    minWidth: '40px'
  },
  modalBtn: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
    transition: 'all 0.2s ease'
  }
};
