import React from 'react';
import { formatDate, showToast } from '../utils';

export default function DossierModal({ isOpen, onClose, member }) {
  if (!isOpen || !member) return null;

  const getEmploymentBadgeClass = (type) => {
    switch (type) {
      case 'Full-time': return 'badge-blue';
      case 'Part-time': return 'badge-purple';
      case 'Intern': return 'badge-emerald';
      case 'Contractor': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const getFallbackAvatar = (name = 'Staff') => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='${encodeURIComponent(color)}'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>${initials}</text></svg>`;
  };

  const handleDownloadResume = () => {
    if (!member.resumeName) return;
    showToast('Downloading Resume', `Starting download for ${member.resumeName}`, 'success');
    
    const link = document.createElement('a');
    if (member.resumeData && member.resumeData.startsWith('data:')) {
      link.href = member.resumeData;
    } else {
      const blob = new Blob(["Seeded Mock Resume Document for " + member.name], { type: "text/plain" });
      link.href = URL.createObjectURL(blob);
    }
    link.download = member.resumeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderComplianceStatus = () => {
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
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-container profile-details-container" style={{ maxWidth: '700px', width: '90%' }}>
        <div className="modal-header">
          <h3>Staff Profile Details</h3>
          <button className="modal-close btn-close-modal" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body profile-dossier-body" style={{ padding: '20px 0' }}>
          <div className="profile-dossier-grid">
            {/* Profile Left Card */}
            <div className="profile-left-card">
              <div className="profile-avatar-large">
                <img id="detail-photo" src={member.photo || getFallbackAvatar(member.name)} alt="Staff Photo" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <h3 id="detail-name" style={{ marginTop: '12px', marginBottom: '4px', fontSize: '18px', fontWeight: '700' }}>{member.name}</h3>
              <span id="detail-role-dept" style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                {member.role} • {member.department}
              </span>
              <span className={`badge ${getEmploymentBadgeClass(member.employmentType)}`} id="detail-employment-badge">
                {member.employmentType}
              </span>
              
              <div className="resume-download-box" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Document Attachment</span>
                {member.resumeName ? (
                  <button id="btn-download-resume-action" className="btn btn-secondary" style={{ fontSize: '11px', height: '30px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleDownloadResume}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span id="detail-resume-label">{member.resumeName}</span>
                  </button>
                ) : (
                  <span id="detail-resume-label" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No resume uploaded</span>
                )}
              </div>
            </div>

            {/* Profile Right Content */}
            <div className="profile-right-content">
              <div className="profile-section-tab">
                <h4>Personal Details</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Email:</span> <strong id="detail-email">{member.email || '—'}</strong></div>
                  <div className="detail-item"><span>Phone:</span> <strong id="detail-phone">{member.phone || '—'}</strong></div>
                  <div className="detail-item"><span>DOB:</span> <strong id="detail-dob">{member.dob ? formatDate(member.dob) : '—'}</strong></div>
                  <div className="detail-item"><span>Gender:</span> <strong id="detail-gender">{member.gender || '—'}</strong></div>
                  <div className="detail-item" style={{ gridColumn: 'span 2' }}><span>Address:</span> <strong id="detail-address" style={{ fontWeight: 500 }}>{member.address || '—'}</strong></div>
                </div>
              </div>

              <div className="profile-section-tab" style={{ marginTop: '20px' }}>
                <h4>Professional Details</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Role Title:</span> <strong id="detail-role">{member.role || '—'}</strong></div>
                  <div className="detail-item"><span>Department:</span> <strong id="detail-department">{member.department || '—'}</strong></div>
                  <div className="detail-item"><span>Employment:</span> <strong id="detail-employment-type">{member.employmentType || '—'}</strong></div>
                  <div className="detail-item"><span>Joined Date:</span> <strong id="detail-join-date">{member.joinDate ? formatDate(member.joinDate) : '—'}</strong></div>
                </div>
              </div>

              {/* Intern-only Details Section */}
              {member.employmentType === 'Intern' && (
                <div id="detail-intern-section" className="profile-section-tab" style={{ marginTop: '20px' }}>
                  <h4>Academic & Internship Details</h4>
                  <div className="details-list">
                    <div className="detail-item"><span>College Name:</span> <strong id="detail-college-name">{member.collegeName || '—'}</strong></div>
                    <div className="detail-item"><span>Register Name/No:</span> <strong id="detail-register-num">{member.registerNumber || '—'}</strong></div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}><span>College Address:</span> <strong id="detail-college-address" style={{ fontWeight: 500 }}>{member.collegeAddress || '—'}</strong></div>
                    <div className="detail-item" style={{ gridColumn: 'span 2' }}><span>Domain Name:</span> <strong id="detail-intern-domain">{member.domain || '—'}</strong></div>
                  </div>
                </div>
              )}

              <div className="profile-section-tab" style={{ marginTop: '20px' }}>
                <h4>Compliance Verification</h4>
                <div className="details-list">
                  <div className="detail-item"><span>Aadhaar ID:</span> <strong id="detail-aadhaar">{member.aadhaar || 'Not Verified ❌'}</strong></div>
                  <div className="detail-item"><span>PAN Card:</span> <strong id="detail-pan">{member.pan || 'Not Verified ❌'}</strong></div>
                  <div className="detail-item" style={{ gridColumn: 'span 2' }}><span>Compliance:</span> <strong id="detail-compliance-status">{renderComplianceStatus()}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
