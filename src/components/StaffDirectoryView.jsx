import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils';

export default function StaffDirectoryView({ 
  staff, 
  onViewDetails, 
  onEditProfile, 
  onDeleteProfile, 
  onAddNewStaff 
}) {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    employment: 'all',
    compliance: 'all'
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const getEmploymentBadgeClass = (type) => {
    switch (type) {
      case 'Full-time': return 'badge-blue';
      case 'Part-time': return 'badge-purple';
      case 'Intern': return 'badge-emerald';
      case 'Contractor': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const getFallbackAvatar = (name) => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='${encodeURIComponent(color)}'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>${initials}</text></svg>`;
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      department: 'all',
      employment: 'all',
      compliance: 'all'
    });
  };

  // Filter & Sort Staff
  const filteredStaff = staff.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower) ||
      member.id.toLowerCase().includes(searchLower) ||
      (member.aadhaar && member.aadhaar.includes(searchLower)) ||
      (member.pan && member.pan.toLowerCase().includes(searchLower));

    const matchesDept = filters.department === 'all' || member.department === filters.department;
    const matchesEmp = filters.employment === 'all' || member.employmentType === filters.employment;

    let matchesCompliance = true;
    if (filters.compliance === 'complete') {
      matchesCompliance = !!(member.aadhaar && member.pan);
    } else if (filters.compliance === 'pending-pan') {
      matchesCompliance = !member.pan;
    } else if (filters.compliance === 'pending-aadhaar') {
      matchesCompliance = !member.aadhaar;
    }

    return matchesSearch && matchesDept && matchesEmp && matchesCompliance;
  });

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';

    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div>
      {/* Controls Panel */}
      <div className="controls-panel">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input 
            type="text" 
            placeholder="Search staff by name, email, role, Aadhaar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="filter-department">Department</label>
            <select 
              id="filter-department"
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="all">All Departments</option>
              <option value="Marketing">Marketing</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Data Entry">Data Entry</option>
              <option value="AI/ML Developer">AI/ML Developer</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-employment">Employment Type</label>
            <select 
              id="filter-employment"
              value={filters.employment}
              onChange={(e) => setFilters(prev => ({ ...prev, employment: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Intern">Intern</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-compliance">Compliance Status</label>
            <select 
              id="filter-compliance"
              value={filters.compliance}
              onChange={(e) => setFilters(prev => ({ ...prev, compliance: e.target.value }))}
            >
              <option value="all">All Profiles</option>
              <option value="complete">Complete Profiles</option>
              <option value="pending-pan">Missing PAN Code</option>
              <option value="pending-aadhaar">Missing Aadhaar</option>
            </select>
          </div>

          <button 
            id="btn-reset-filters" 
            className="btn btn-icon-only" 
            title="Reset Filters"
            onClick={handleResetFilters}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
      </div>

      {/* Staff Table/Grid Container */}
      <div className="glass-panel table-panel">
        <div className="panel-header-flex">
          <div>
            <h3>Staff Roster</h3>
            <p id="staff-count-label">Showing {sortedStaff.length} staff member{sortedStaff.length === 1 ? '' : 's'}</p>
          </div>
          <div className="layout-toggles">
            <button 
              id="toggle-list-view" 
              className={`btn-toggle ${currentView === 'list' ? 'active' : ''}`}
              title="List View"
              onClick={() => setCurrentView('list')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button 
              id="toggle-grid-view" 
              className={`btn-toggle ${currentView === 'grid' ? 'active' : ''}`}
              title="Card Grid View"
              onClick={() => setCurrentView('grid')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
          </div>
        </div>

        {sortedStaff.length === 0 ? (
          /* Empty State */
          <div id="staff-empty-state" className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <h3>No Staff Found</h3>
            <p>Try refining your search terms or filters, or add a new staff member profile.</p>
            <button className="btn btn-primary" onClick={onAddNewStaff}>Add New Staff Member</button>
          </div>
        ) : currentView === 'list' ? (
          /* Table View */
          <div id="staff-table-wrapper" className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Name <span className="sort-icon">{renderSortIcon('name')}</span>
                  </th>
                  <th className="sortable" onClick={() => handleSort('department')}>
                    Department <span className="sort-icon">{renderSortIcon('department')}</span>
                  </th>
                  <th className="sortable" onClick={() => handleSort('employmentType')}>
                    Type <span className="sort-icon">{renderSortIcon('employmentType')}</span>
                  </th>
                  <th>Compliance Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map(member => {
                  const hasAadhaar = !!member.aadhaar;
                  const hasPan = !!member.pan;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="roster-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            className="roster-avatar-inline" 
                            src={member.photo || getFallbackAvatar(member.name)} 
                            alt={member.name}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)' }}>{member.role}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.department}</div>
                      </td>
                      <td>
                        <span className={`badge ${getEmploymentBadgeClass(member.employmentType)}`}>{member.employmentType}</span>
                      </td>
                      <td>
                        <div className="compliance-icons" style={{ display: 'flex', gap: '8px' }}>
                          <span className={`compliance-tag ${hasAadhaar ? 'active' : 'inactive'}`} title={hasAadhaar ? 'Aadhaar Verified' : 'Aadhaar Missing'}>ID</span>
                          <span className={`compliance-tag ${hasPan ? 'active' : 'inactive'}`} title={hasPan ? 'PAN Verified' : 'PAN Missing'}>TX</span>
                        </div>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-action btn-action-view" title="View Dossier" onClick={() => onViewDetails(member.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button className="btn-action btn-action-edit" title="Edit Profile" onClick={() => onEditProfile(member.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <button className="btn-action btn-action-delete" title="Delete Profile" onClick={() => onDeleteProfile(member.id)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View */
          <div id="staff-grid-wrapper" className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', padding: '10px 0' }}>
            {sortedStaff.map(member => (
              <div className="staff-card" key={member.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="staff-card-header" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img 
                    className="staff-card-avatar" 
                    src={member.photo || getFallbackAvatar(member.name)} 
                    alt={member.name} 
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                  />
                  <div className="staff-card-title">
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{member.name}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.role}</span>
                  </div>
                </div>

                <div className="staff-card-body" style={{ flexGrow: 1, padding: '15px 0' }}>
                  <div className="staff-card-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Department:</span>
                    <strong>{member.department}</strong>
                  </div>
                  <div className="staff-card-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Type:</span>
                    <span className={`badge ${getEmploymentBadgeClass(member.employmentType)}`} style={{ padding: '2px 6px' }}>{member.employmentType}</span>
                  </div>
                  <div className="staff-card-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Joined:</span>
                    <strong>{formatDate(member.joinDate)}</strong>
                  </div>
                  <div className="staff-card-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Compliance:</span>
                    <span>Aadhaar: {member.aadhaar ? '✅' : '❌'} | PAN: {member.pan ? '✅' : '❌'}</span>
                  </div>
                </div>

                <div className="staff-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {member.id}</div>
                  <div className="actions-cell" style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-action btn-action-view" title="View Dossier" onClick={() => onViewDetails(member.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button className="btn-action btn-action-edit" title="Edit Profile" onClick={() => onEditProfile(member.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button className="btn-action btn-action-delete" title="Delete Profile" onClick={() => onDeleteProfile(member.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
