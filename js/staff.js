/**
 * staff.js - Directory view and wizard controller
 */

import { getStaff, saveStaff, deleteStaff, addActivity } from './db.js?v=1.0.8';
import { 
  formatCurrency, 
  formatDate, 
  validateEmail, 
  validatePhone, 
  validateAadhaar, 
  validatePAN, 
  validateIFSC, 
  showToast 
} from './utils.js?v=1.0.8';

// Roster State
let currentView = 'list'; // 'list' or 'grid'
let searchQuery = '';
let filters = {
  department: 'all',
  employment: 'all',
  compliance: 'all'
};
let sortBy = 'name';
let sortDirection = 'asc'; // 'asc' or 'desc'
let currentWizardStep = 1;
let deleteTargetId = null;

/**
 * Initializes Roster view event listeners and renders list
 */
export function initStaffDirectory() {
  renderStaffList();
  setupEventListeners();
}

/**
 * Renders the roster view (table or card grid) based on filters & search
 */
export function renderStaffList() {
  const staff = getStaff();
  
  // Filter staff
  let filteredStaff = staff.filter(member => {
    // Search Query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower) ||
      member.id.toLowerCase().includes(searchLower) ||
      (member.aadhaar && member.aadhaar.includes(searchLower)) ||
      (member.pan && member.pan.toLowerCase().includes(searchLower));

    // Department Filter
    const matchesDept = filters.department === 'all' || member.department === filters.department;

    // Employment Type Filter
    const matchesEmp = filters.employment === 'all' || member.employmentType === filters.employment;

    // Compliance Filters
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

  // Sort staff
  filteredStaff.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    valA = (valA || '').toString().toLowerCase();
    valB = (valB || '').toString().toLowerCase();

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Update staff count label
  document.getElementById('staff-count-label').innerText = `Showing ${filteredStaff.length} staff member${filteredStaff.length === 1 ? '' : 's'}`;

  // Toggle empty states
  const emptyState = document.getElementById('staff-empty-state');
  const tableWrapper = document.getElementById('staff-table-wrapper');
  const gridWrapper = document.getElementById('staff-grid-wrapper');

  if (filteredStaff.length === 0) {
    emptyState.classList.remove('hidden');
    tableWrapper.classList.add('hidden');
    gridWrapper.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  if (currentView === 'list') {
    tableWrapper.classList.remove('hidden');
    gridWrapper.classList.add('hidden');
    renderTableBody(filteredStaff);
  } else {
    tableWrapper.classList.add('hidden');
    gridWrapper.classList.remove('hidden');
    renderGridBody(filteredStaff);
  }
}

/**
 * Populates table rows HTML
 */
function renderTableBody(staffList) {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  tbody.innerHTML = staffList.map(member => {
    // Compliance Indicators
    const hasAadhaar = !!member.aadhaar;
    const hasPan = !!member.pan;
    const photoSrc = member.photo || getFallbackAvatar(member.name);
    
    return `
      <tr>
        <td>
          <div class="roster-name-cell">
            <img class="roster-avatar-inline" src="${photoSrc}" alt="${member.name}">
            <div>
              <div style="font-weight:600; color:var(--text-primary);">${member.name}</div>
              <div style="font-size:12px; color:var(--text-muted);">${member.email}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="color:var(--text-primary);">${member.role}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${member.department}</div>
        </td>
        <td>
          <span class="badge ${getEmploymentBadgeClass(member.employmentType)}">${member.employmentType}</span>
        </td>
        <td>
          <div class="compliance-icons">
            <span class="compliance-tag ${hasAadhaar ? 'active' : 'inactive'}" title="${hasAadhaar ? 'Aadhaar Verified' : 'Aadhaar Missing'}">ID</span>
            <span class="compliance-tag ${hasPan ? 'active' : 'inactive'}" title="${hasPan ? 'PAN Verified' : 'PAN Missing'}">TX</span>
          </div>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn-action btn-action-view" data-id="${member.id}" title="View Dossier">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-action btn-action-edit" data-id="${member.id}" title="Edit Profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn-action btn-action-delete" data-id="${member.id}" title="Delete Profile">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button triggers
  tbody.querySelectorAll('.btn-action-view').forEach(btn => {
    btn.addEventListener('click', () => openProfileDetails(btn.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.btn-action-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditWizard(btn.getAttribute('data-id')));
  });

  tbody.querySelectorAll('.btn-action-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteConfirm(btn.getAttribute('data-id')));
  });
}

/**
 * Populates grid card elements HTML
 */
function renderGridBody(staffList) {
  const container = document.getElementById('staff-grid-wrapper');
  if (!container) return;

  container.innerHTML = staffList.map(member => {
    const photoSrc = member.photo || getFallbackAvatar(member.name);
    
    return `
      <div class="staff-card">
        <div class="staff-card-header">
          <img class="staff-card-avatar" src="${photoSrc}" alt="${member.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">
          <div class="staff-card-title">
            <h4>${member.name}</h4>
            <span>${member.role}</span>
          </div>
        </div>

        <div class="staff-card-body">
          <div class="staff-card-row">
            <span>Department:</span>
            <strong>${member.department}</strong>
          </div>
          <div class="staff-card-row">
            <span>Type:</span>
            <span class="badge ${getEmploymentBadgeClass(member.employmentType)}" style="padding: 2px 6px;">${member.employmentType}</span>
          </div>
          <div class="staff-card-row">
            <span>Joined:</span>
            <strong>${formatDate(member.joinDate)}</strong>
          </div>
          <div class="staff-card-row">
            <span>Compliance:</span>
            <span>Aadhaar: ${member.aadhaar ? '✅' : '❌'} | PAN: ${member.pan ? '✅' : '❌'}</span>
          </div>
        </div>

        <div class="staff-card-footer">
          <div style="font-size: 11px; color: var(--text-muted)">ID: ${member.id}</div>
          <div class="actions-cell">
            <button class="btn-action btn-action-view" data-id="${member.id}" title="View Dossier">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn-action btn-action-edit" data-id="${member.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="btn-action btn-action-delete" data-id="${member.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach button triggers
  container.querySelectorAll('.btn-action-view').forEach(btn => {
    btn.addEventListener('click', () => openProfileDetails(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.btn-action-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditWizard(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.btn-action-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteConfirm(btn.getAttribute('data-id')));
  });
}

function getEmploymentBadgeClass(type) {
  switch(type) {
    case 'Full-time': return 'badge-blue';
    case 'Part-time': return 'badge-purple';
    case 'Intern': return 'badge-emerald';
    case 'Contractor': return 'badge-warning';
    default: return 'badge-secondary';
  }
}

/**
 * Handles all event wire-ups for inputs and buttons
 */
function setupEventListeners() {
  // 1. Search Bar with key-up debounce
  let searchDebounce;
  const searchInput = document.getElementById('staff-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchQuery = e.target.value;
        renderStaffList();
      }, 200);
    });
  }

  // 2. Dropdown Filters
  document.getElementById('filter-department')?.addEventListener('change', (e) => {
    filters.department = e.target.value;
    renderStaffList();
  });

  document.getElementById('filter-employment')?.addEventListener('change', (e) => {
    filters.employment = e.target.value;
    renderStaffList();
  });

  document.getElementById('filter-compliance')?.addEventListener('change', (e) => {
    filters.compliance = e.target.value;
    renderStaffList();
  });

  // Reset Filters
  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    
    const fd = document.getElementById('filter-department');
    const fe = document.getElementById('filter-employment');
    const fc = document.getElementById('filter-compliance');
    
    if (fd) fd.value = 'all';
    if (fe) fe.value = 'all';
    if (fc) fc.value = 'all';

    filters = { department: 'all', employment: 'all', compliance: 'all' };
    renderStaffList();
    showToast('Filters Reset', ' Roster filters reverted to default view.', 'info');
  });

  // 3. Layout switches
  const toggleListBtn = document.getElementById('toggle-list-view');
  const toggleGridBtn = document.getElementById('toggle-grid-view');

  toggleListBtn?.addEventListener('click', () => {
    currentView = 'list';
    toggleListBtn.classList.add('active');
    toggleGridBtn?.classList.remove('active');
    renderStaffList();
  });

  toggleGridBtn?.addEventListener('click', () => {
    currentView = 'grid';
    toggleGridBtn.classList.add('active');
    toggleListBtn?.classList.remove('active');
    renderStaffList();
  });

  // 4. Table header sorting
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (sortBy === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy = field;
        sortDirection = 'asc';
      }
      
      // Update sort visual arrow indicator
      document.querySelectorAll('.data-table th.sortable').forEach(header => {
        const arrow = header.querySelector('.sort-icon');
        if (arrow) arrow.innerText = '↕';
      });

      const indicator = th.querySelector('.sort-icon');
      if (indicator) {
        indicator.innerText = sortDirection === 'asc' ? '↑' : '↓';
      }

      renderStaffList();
    });
  });

  // 5. Wizard Navigation Trigger Buttons
  document.getElementById('btn-wizard-next')?.addEventListener('click', handleWizardNext);
  document.getElementById('btn-wizard-prev')?.addEventListener('click', handleWizardPrev);

  const staffForm = document.getElementById('staff-form');
  staffForm?.addEventListener('submit', handleWizardSubmit);

  // Close modals
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('staff-modal')?.classList.add('hidden');
      document.getElementById('confirm-modal')?.classList.add('hidden');
      document.getElementById('profile-details-modal')?.classList.add('hidden');
    });
  });

  // Quick Action triggers
  document.querySelectorAll('.btn-add-staff-action').forEach(btn => {
    btn.addEventListener('click', openAddWizard);
  });

  // Confirm delete button handler
  document.getElementById('btn-delete-confirm')?.addEventListener('click', () => {
    if (deleteTargetId) {
      const staffList = getStaff();
      const staffName = staffList.find(s => s.id === deleteTargetId)?.name || 'Staff';
      const success = deleteStaff(deleteTargetId);
      if (success) {
        showToast('Profile Deleted', `${staffName} has been removed from staff directory.`, 'success');
        
        // Refresh UI
        renderStaffList();
        
        // Dispatch event for other modules (Dashboard, Reports)
        window.dispatchEvent(new CustomEvent('db_updated'));
      }
      
      document.getElementById('confirm-modal').classList.add('hidden');
      deleteTargetId = null;
    }
  });

  // Listen to quick fix trigger from dashboard
  window.addEventListener('trigger_edit_staff', (e) => {
    openEditWizard(e.detail.id);
  });

  // 6. Photo upload handlers
  const fileInputPhoto = document.getElementById('staff-photo');
  const photoPreview = document.getElementById('staff-photo-preview');
  const photoData = document.getElementById('staff-photo-data');

  fileInputPhoto?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200 * 1024) {
        showToast('File Too Large', 'Please select an image smaller than 200KB.', 'error');
        fileInputPhoto.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        photoPreview.src = event.target.result;
        photoData.value = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // 7. Resume upload handlers
  const fileInputResume = document.getElementById('staff-resume');
  const resumeNameLabel = document.getElementById('staff-resume-name');
  const resumeDataInput = document.getElementById('staff-resume-data');

  fileInputResume?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File Too Large', 'Please select a document smaller than 5MB.', 'error');
        fileInputResume.value = '';
        return;
      }
      resumeNameLabel.innerText = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (resumeDataInput) {
          resumeDataInput.value = event.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // 8. Employment Type Select Watcher (toggles intern details section)
  const empTypeSelect = document.getElementById('staff-employment-type');
  const internSection = document.getElementById('intern-details-section');

  empTypeSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'Intern') {
      internSection.classList.remove('hidden');
    } else {
      internSection.classList.add('hidden');
    }
  });
}

/* ==========================================================================
   Wizard Form Logic
   ========================================================================== */

/**
 * Opens form wizard in 'Add' mode
 */
export function openAddWizard() {
  const modal = document.getElementById('staff-modal');
  if (!modal) return;

  document.getElementById('staff-modal-title').innerText = 'Add New Staff Member';
  document.getElementById('staff-edit-id').value = '';
  
  // Clear form
  document.getElementById('staff-form').reset();
  clearAllValidationErrors();

  currentWizardStep = 1;
  updateWizardUI();

  // Reset inputs
  document.getElementById('staff-photo-preview').src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23374151'/><text x='50' y='58' font-family='Outfit' font-size='12' fill='%239ca3af' text-anchor='middle'>No Photo</text></svg>";
  document.getElementById('staff-photo-data').value = '';
  document.getElementById('staff-resume-name').innerText = 'No document selected';
  document.getElementById('staff-resume-data').value = '';
  document.getElementById('staff-college-address').value = '';
  document.getElementById('intern-details-section').classList.add('hidden');

  modal.classList.remove('hidden');
}

/**
 * Opens form wizard loaded with staff values in 'Edit' mode
 * @param {string} id 
 */
function openEditWizard(id) {
  const staff = getStaff();
  const member = staff.find(s => s.id === id);
  if (!member) return;

  const modal = document.getElementById('staff-modal');
  if (!modal) return;

  document.getElementById('staff-modal-title').innerText = `Edit Profile: ${member.name}`;
  document.getElementById('staff-edit-id').value = member.id;

  // Pre-fill form fields
  document.getElementById('staff-name').value = member.name || '';
  document.getElementById('staff-email').value = member.email || '';
  document.getElementById('staff-phone').value = member.phone || '';
  document.getElementById('staff-dob').value = member.dob || '';
  document.getElementById('staff-gender').value = member.gender || '';
  document.getElementById('staff-address').value = member.address || '';
  
  document.getElementById('staff-role').value = member.role || '';
  document.getElementById('staff-dept').value = member.department || '';
  document.getElementById('staff-employment-type').value = member.employmentType || '';
  document.getElementById('staff-join-date').value = member.joinDate || '';

  document.getElementById('staff-aadhaar').value = member.aadhaar || '';
  document.getElementById('staff-pan').value = member.pan || '';

  // Photo
  const photoPreview = document.getElementById('staff-photo-preview');
  const photoData = document.getElementById('staff-photo-data');
  if (member.photo) {
    photoPreview.src = member.photo;
    photoData.value = member.photo;
  } else {
    photoPreview.src = getFallbackAvatar(member.name);
    photoData.value = '';
  }

  // Resume
  const resumeNameLabel = document.getElementById('staff-resume-name');
  resumeNameLabel.innerText = member.resumeName || 'No document selected';
  document.getElementById('staff-resume-data').value = member.resumeData || '';

  // Intern Section
  const internSection = document.getElementById('intern-details-section');
  if (member.employmentType === 'Intern') {
    internSection.classList.remove('hidden');
    document.getElementById('staff-college-name').value = member.collegeName || '';
    document.getElementById('staff-register-num').value = member.registerNumber || '';
    document.getElementById('staff-college-address').value = member.collegeAddress || '';
    document.getElementById('staff-intern-domain').value = member.domain || '';
  } else {
    internSection.classList.add('hidden');
    document.getElementById('staff-college-name').value = '';
    document.getElementById('staff-register-num').value = '';
    document.getElementById('staff-college-address').value = '';
    document.getElementById('staff-intern-domain').value = '';
  }

  clearAllValidationErrors();
  currentWizardStep = 1;
  updateWizardUI();

  // If in tabbed workspace we might need view change first, but modal handles itself
  modal.classList.remove('hidden');
}

/**
 * Prepares and launches Delete modal confirmation
 * @param {string} id 
 */
function openDeleteConfirm(id) {
  const staff = getStaff();
  const member = staff.find(s => s.id === id);
  if (!member) return;

  deleteTargetId = id;
  document.getElementById('delete-staff-name').innerText = `${member.name} (${member.role})`;
  document.getElementById('confirm-modal').classList.remove('hidden');
}

/**
 * Refreshes wizard view layouts (panes visibility, indicator colors)
 */
function updateWizardUI() {
  // Update step indicators
  document.querySelectorAll('.wizard-step').forEach(stepNode => {
    const stepNum = parseInt(stepNode.getAttribute('data-step'), 10);
    stepNode.classList.remove('active', 'completed');
    
    if (stepNum === currentWizardStep) {
      stepNode.classList.add('active');
    } else if (stepNum < currentWizardStep) {
      stepNode.classList.add('completed');
    }
  });

  // Toggle panes
  document.querySelectorAll('.wizard-step-pane').forEach(pane => {
    const paneNum = parseInt(pane.getAttribute('data-pane'), 10);
    if (paneNum === currentWizardStep) {
      pane.classList.add('active-pane');
    } else {
      pane.classList.remove('active-pane');
    }
  });

  // Toggle wizard buttons
  const prevBtn = document.getElementById('btn-wizard-prev');
  const nextBtn = document.getElementById('btn-wizard-next');
  const submitBtn = document.getElementById('btn-wizard-submit');

  if (currentWizardStep === 1) {
    prevBtn.classList.add('hidden');
  } else {
    prevBtn.classList.remove('hidden');
  }

  if (currentWizardStep === 3) {
    nextBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
    submitBtn.classList.add('hidden');
  }
}

/**
 * Handles Next navigation after running current step validator
 */
function handleWizardNext() {
  if (validateStep(currentWizardStep)) {
    currentWizardStep++;
    updateWizardUI();
  }
}

/**
 * Back navigation
 */
function handleWizardPrev() {
  if (currentWizardStep > 1) {
    currentWizardStep--;
    updateWizardUI();
  }
}

/**
 * Form submissions handler
 */
function handleWizardSubmit(e) {
  e.preventDefault();

  if (!validateStep(currentWizardStep)) {
    return;
  }

  // Compile staff object
  const editId = document.getElementById('staff-edit-id').value;
  const staffObj = {
    name: document.getElementById('staff-name').value.trim(),
    email: document.getElementById('staff-email').value.trim(),
    phone: document.getElementById('staff-phone').value.trim(),
    dob: document.getElementById('staff-dob').value,
    gender: document.getElementById('staff-gender').value,
    address: document.getElementById('staff-address').value.trim(),
    
    role: document.getElementById('staff-role').value.trim(),
    department: document.getElementById('staff-dept').value,
    employmentType: document.getElementById('staff-employment-type').value,
    joinDate: document.getElementById('staff-join-date').value,

    aadhaar: document.getElementById('staff-aadhaar').value.trim(),
    pan: document.getElementById('staff-pan').value.trim().toUpperCase(),

    photo: document.getElementById('staff-photo-data').value,
    resumeName: document.getElementById('staff-resume-name').innerText !== 'No document selected' ? document.getElementById('staff-resume-name').innerText : '',
    resumeData: document.getElementById('staff-resume-data').value
  };

  if (staffObj.employmentType === 'Intern') {
    staffObj.collegeName = document.getElementById('staff-college-name').value.trim();
    staffObj.registerNumber = document.getElementById('staff-register-num').value.trim();
    staffObj.collegeAddress = document.getElementById('staff-college-address').value.trim();
    staffObj.domain = document.getElementById('staff-intern-domain').value.trim();
  } else {
    staffObj.collegeName = '';
    staffObj.registerNumber = '';
    staffObj.collegeAddress = '';
    staffObj.domain = '';
  }

  if (editId) {
    staffObj.id = editId;
  }

  const saved = saveStaff(staffObj);
  showToast(
    editId ? 'Profile Updated' : 'Profile Created', 
    `${saved.name} details have been written to local storage.`, 
    'success'
  );

  // Close Modal
  document.getElementById('staff-modal').classList.add('hidden');

  // Redraw roster list
  renderStaffList();

  // Notify system db update (to refresh dashboard views)
  window.dispatchEvent(new CustomEvent('db_updated'));
}

/**
 * Performs custom regex and missing validations for step inputs
 */
function validateStep(step) {
  let isValid = true;
  clearAllValidationErrors();

  if (step === 1) {
    const name = document.getElementById('staff-name');
    const email = document.getElementById('staff-email');
    const phone = document.getElementById('staff-phone');
    const dob = document.getElementById('staff-dob');
    const gender = document.getElementById('staff-gender');

    if (name.value.trim().length < 2) {
      showError('name', 'Name is required (min 2 chars)');
      isValid = false;
    }
    if (!validateEmail(email.value)) {
      showError('email', 'Provide a valid email address');
      isValid = false;
    }
    if (!validatePhone(phone.value)) {
      showError('phone', 'Provide a valid 10-digit phone number (starts with 6-9)');
      isValid = false;
    }
    if (!dob.value) {
      showError('dob', 'Date of birth is required');
      isValid = false;
    } else {
      // Validate age is reasonable (e.g. min 18 years old)
      const age = new Date().getFullYear() - new Date(dob.value).getFullYear();
      if (age < 18 || age > 75) {
        showError('dob', 'Staff member must be between 18 and 75 years old');
        isValid = false;
      }
    }
    if (!gender.value) {
      showError('gender', 'Gender selection is required');
      isValid = false;
    }
  }

  if (step === 2) {
    const role = document.getElementById('staff-role');
    const dept = document.getElementById('staff-dept');
    const empType = document.getElementById('staff-employment-type');
    const joinDate = document.getElementById('staff-join-date');

    if (role.value.trim().length < 2) {
      showError('role', 'Role designation is required');
      isValid = false;
    }
    if (!dept.value) {
      showError('dept', 'Department selection is required');
      isValid = false;
    }
    if (!empType.value) {
      showError('employment-type', 'Employment type selection is required');
      isValid = false;
    }
    if (!joinDate.value) {
      showError('join-date', 'Joining date is required');
      isValid = false;
    }

    if (empType.value === 'Intern') {
      const collegeName = document.getElementById('staff-college-name');
      const regNum = document.getElementById('staff-register-num');
      const collegeAddress = document.getElementById('staff-college-address');
      const domain = document.getElementById('staff-intern-domain');

      if (!collegeName.value.trim()) {
        showError('college-name', 'College name is required');
        isValid = false;
      }
      if (!regNum.value.trim()) {
        showError('register-num', 'College registration number/name is required');
        isValid = false;
      }
      if (!collegeAddress.value.trim()) {
        showError('college-address', 'College address is required');
        isValid = false;
      }
      if (!domain.value.trim()) {
        showError('intern-domain', 'Domain name is required');
        isValid = false;
      }
    }
  }

  if (step === 3) {
    const aadhaar = document.getElementById('staff-aadhaar');
    const pan = document.getElementById('staff-pan');

    if (!validateAadhaar(aadhaar.value)) {
      showError('aadhaar', 'Aadhaar must be exactly 12 digits');
      isValid = false;
    }
    if (!validatePAN(pan.value)) {
      showError('pan', 'PAN must be a valid 10-character alphanumeric string');
      isValid = false;
    }
  }

  return isValid;
}

/**
 * Display errors below inputs
 */
function showError(fieldId, msg) {
  const errNode = document.getElementById(`err-${fieldId}`);
  if (errNode) {
    errNode.innerText = msg;
  }
}

/**
 * Clears error elements text
 */
function clearAllValidationErrors() {
  document.querySelectorAll('.error-msg').forEach(node => {
    node.innerText = '';
  });
}

function getFallbackAvatar(name) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='${encodeURIComponent(color)}'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>${initials}</text></svg>`;
}

function openProfileDetails(id) {
  const staff = getStaff();
  const member = staff.find(s => s.id === id);
  if (!member) return;

  const modal = document.getElementById('profile-details-modal');
  if (!modal) return;

  // Populate data
  document.getElementById('detail-photo').src = member.photo || getFallbackAvatar(member.name);
  document.getElementById('detail-name').innerText = member.name || '';
  document.getElementById('detail-role-dept').innerText = `${member.role || ''} • ${member.department || ''}`;
  
  const badge = document.getElementById('detail-employment-badge');
  badge.className = `badge ${getEmploymentBadgeClass(member.employmentType)}`;
  badge.innerText = member.employmentType || '';

  // Resume Download button handling
  const resumeBtn = document.getElementById('btn-download-resume-action');
  const resumeLabel = document.getElementById('detail-resume-label');
  if (member.resumeName) {
    resumeBtn.classList.remove('hidden');
    resumeLabel.innerText = member.resumeName;
    resumeBtn.onclick = () => {
      showToast('Downloading Resume', `Starting download for ${member.resumeName}`, 'success');
      
      const link = document.createElement('a');
      if (member.resumeData && member.resumeData.startsWith('data:')) {
        link.href = member.resumeData;
      } else {
        // Fallback simulated document download for seeded mock data
        const blob = new Blob(["Seeded Mock Resume Document for " + member.name], { type: "text/plain" });
        link.href = URL.createObjectURL(blob);
      }
      link.download = member.resumeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
  } else {
    resumeBtn.classList.add('hidden');
    resumeLabel.innerText = 'No resume uploaded';
  }

  // Personal Info
  document.getElementById('detail-email').innerText = member.email || '—';
  document.getElementById('detail-phone').innerText = member.phone || '—';
  document.getElementById('detail-dob').innerText = member.dob ? formatDate(member.dob) : '—';
  document.getElementById('detail-gender').innerText = member.gender || '—';
  document.getElementById('detail-address').innerText = member.address || '—';

  // Professional details
  document.getElementById('detail-role').innerText = member.role || '—';
  document.getElementById('detail-department').innerText = member.department || '—';
  document.getElementById('detail-employment-type').innerText = member.employmentType || '—';
  document.getElementById('detail-join-date').innerText = member.joinDate ? formatDate(member.joinDate) : '—';

  // Intern-specific details toggle
  const internSection = document.getElementById('detail-intern-section');
  if (member.employmentType === 'Intern') {
    internSection.classList.remove('hidden');
    document.getElementById('detail-college-name').innerText = member.collegeName || '—';
    document.getElementById('detail-register-num').innerText = member.registerNumber || '—';
    document.getElementById('detail-college-address').innerText = member.collegeAddress || '—';
    document.getElementById('detail-intern-domain').innerText = member.domain || '—';
  } else {
    internSection.classList.add('hidden');
  }

  // Compliance details
  document.getElementById('detail-aadhaar').innerText = member.aadhaar || 'Not Verified ❌';
  document.getElementById('detail-pan').innerText = member.pan || 'Not Verified ❌';
  
  const complianceStatus = document.getElementById('detail-compliance-status');
  if (member.aadhaar && member.pan) {
    complianceStatus.innerHTML = '<span style="color:var(--accent-success); font-weight:700;">✅ Fully Verified</span>';
  } else if (!member.aadhaar && !member.pan) {
    complianceStatus.innerHTML = '<span style="color:var(--accent-danger); font-weight:700;">❌ Verification Pending (Aadhaar & PAN)</span>';
  } else if (!member.aadhaar) {
    complianceStatus.innerHTML = '<span style="color:var(--accent-warning); font-weight:700;">⚠️ Aadhaar Missing</span>';
  } else {
    complianceStatus.innerHTML = '<span style="color:var(--accent-warning); font-weight:700;">⚠️ PAN Missing (20% TDS Penalty)</span>';
  }

  modal.classList.remove('hidden');
}

