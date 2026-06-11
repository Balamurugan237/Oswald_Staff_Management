import React, { useState, useEffect } from 'react';
import { 
  validateEmail, 
  validatePhone, 
  validateAadhaar, 
  validatePAN, 
  showToast 
} from '../utils';

export default function StaffWizardModal({ isOpen, onClose, editMember, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    role: '',
    department: '',
    employmentType: '',
    joinDate: '',
    aadhaar: '',
    pan: '',
    photo: '',
    resumeName: '',
    resumeData: '',
    collegeName: '',
    collegeAddress: '',
    registerNumber: '',
    domain: ''
  });

  useEffect(() => {
    if (editMember) {
      setFormData({
        id: editMember.id || '',
        name: editMember.name || '',
        email: editMember.email || '',
        phone: editMember.phone || '',
        dob: editMember.dob || '',
        gender: editMember.gender || '',
        address: editMember.address || '',
        role: editMember.role || '',
        department: editMember.department || '',
        employmentType: editMember.employmentType || '',
        joinDate: editMember.joinDate || '',
        aadhaar: editMember.aadhaar || '',
        pan: editMember.pan || '',
        photo: editMember.photo || '',
        resumeName: editMember.resumeName || '',
        resumeData: editMember.resumeData || '',
        collegeName: editMember.collegeName || '',
        collegeAddress: editMember.collegeAddress || '',
        registerNumber: editMember.registerNumber || '',
        domain: editMember.domain || ''
      });
    } else {
      setFormData({
        id: '',
        name: '',
        email: '',
        phone: '',
        dob: '',
        gender: '',
        address: '',
        role: '',
        department: '',
        employmentType: '',
        joinDate: '',
        aadhaar: '',
        pan: '',
        photo: '',
        resumeName: '',
        resumeData: '',
        collegeName: '',
        collegeAddress: '',
        registerNumber: '',
        domain: ''
      });
    }
    setCurrentStep(1);
    setErrors({});
  }, [editMember, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    // Map html input id to form state field
    const fieldMap = {
      'staff-name': 'name',
      'staff-email': 'email',
      'staff-phone': 'phone',
      'staff-dob': 'dob',
      'staff-gender': 'gender',
      'staff-address': 'address',
      'staff-role': 'role',
      'staff-dept': 'department',
      'staff-employment-type': 'employmentType',
      'staff-join-date': 'joinDate',
      'staff-aadhaar': 'aadhaar',
      'staff-pan': 'pan',
      'staff-college-name': 'collegeName',
      'staff-register-num': 'registerNumber',
      'staff-college-address': 'collegeAddress',
      'staff-intern-domain': 'domain'
    };

    const key = fieldMap[id] || id;
    setFormData(prev => ({ ...prev, [key]: value }));
    // Clear error
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 200 * 1024) {
        showToast('File Too Large', 'Please select an image smaller than 200KB.', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, photo: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File Too Large', 'Please select a document smaller than 5MB.', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ 
          ...prev, 
          resumeName: file.name,
          resumeData: event.target.result 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step) => {
    let stepErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.name || formData.name.trim().length < 2) {
        stepErrors.name = 'Name is required (min 2 chars)';
        isValid = false;
      }
      if (!validateEmail(formData.email)) {
        stepErrors.email = 'Provide a valid email address';
        isValid = false;
      }
      if (!validatePhone(formData.phone)) {
        stepErrors.phone = 'Provide a valid 10-digit phone number (starts with 6-9)';
        isValid = false;
      }
      if (!formData.dob) {
        stepErrors.dob = 'Date of birth is required';
        isValid = false;
      } else {
        const age = new Date().getFullYear() - new Date(formData.dob).getFullYear();
        if (age < 18 || age > 75) {
          stepErrors.dob = 'Staff member must be between 18 and 75 years old';
          isValid = false;
        }
      }
      if (!formData.gender) {
        stepErrors.gender = 'Gender selection is required';
        isValid = false;
      }
    }

    if (step === 2) {
      if (!formData.role || formData.role.trim().length < 2) {
        stepErrors.role = 'Role designation is required';
        isValid = false;
      }
      if (!formData.department) {
        stepErrors.department = 'Department selection is required';
        isValid = false;
      }
      if (!formData.employmentType) {
        stepErrors.employmentType = 'Employment type selection is required';
        isValid = false;
      }
      if (!formData.joinDate) {
        stepErrors.joinDate = 'Joining date is required';
        isValid = false;
      }

      if (formData.employmentType === 'Intern') {
        if (!formData.collegeName || !formData.collegeName.trim()) {
          stepErrors.collegeName = 'College name is required';
          isValid = false;
        }
        if (!formData.registerNumber || !formData.registerNumber.trim()) {
          stepErrors.registerNumber = 'College registration number/name is required';
          isValid = false;
        }
        if (!formData.collegeAddress || !formData.collegeAddress.trim()) {
          stepErrors.collegeAddress = 'College address is required';
          isValid = false;
        }
        if (!formData.domain || !formData.domain.trim()) {
          stepErrors.domain = 'Domain name is required';
          isValid = false;
        }
      }
    }

    if (step === 3) {
      if (!validateAadhaar(formData.aadhaar)) {
        stepErrors.aadhaar = 'Aadhaar must be exactly 12 digits';
        isValid = false;
      }
      if (!validatePAN(formData.pan)) {
        stepErrors.pan = 'PAN must be a valid 10-character alphanumeric string';
        isValid = false;
      }
    }

    setErrors(stepErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      onSave(formData);
    }
  };

  const defaultPhotoSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23374151'/><text x='50' y='58' font-family='Outfit' font-size='12' fill='%239ca3af' text-anchor='middle'>No Photo</text></svg>";

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-container wizard-container">
        <div className="modal-header">
          <h3>{formData.id ? `Edit Profile: ${formData.name}` : 'Add New Staff Member'}</h3>
          <button className="modal-close btn-close-modal" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Wizard Steps Indicators */}
        <div className="wizard-steps-header">
          <div className={`wizard-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-lbl">Personal Info</span>
          </div>
          <div className="wizard-step-line"></div>
          <div className={`wizard-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-lbl">Professional</span>
          </div>
          <div className="wizard-step-line"></div>
          <div className={`wizard-step ${currentStep === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-lbl">Compliance</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* STEP 1: Personal Details */}
          {currentStep === 1 && (
            <div className="wizard-step-pane active-pane">
              <div className="form-grid">
                <div className="form-group grid-span-2 photo-upload-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                  <div className="photo-preview-circle">
                    <img id="staff-photo-preview" src={formData.photo || defaultPhotoSrc} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--glass-border)' }} />
                  </div>
                  <div className="photo-upload-controls" style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Profile Photo</span>
                    <input type="file" id="staff-photo" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                    <label htmlFor="staff-photo" id="btn-upload-photo" className="btn btn-secondary" style={{ height: '32px', padding: '0 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      Upload Photo
                    </label>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>JPG, PNG or SVG. Max 200KB.</p>
                  </div>
                </div>

                <div className="form-group grid-span-2">
                  <label htmlFor="staff-name">Full Name <span className="required">*</span></label>
                  <input type="text" id="staff-name" placeholder="John Doe" value={formData.name} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.name}</span>
                </div>
                
                <div className="form-group">
                  <label htmlFor="staff-email">Email Address <span className="required">*</span></label>
                  <input type="email" id="staff-email" placeholder="john.doe@oswaldstack.com" value={formData.email} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.email}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-phone">Phone Number <span className="required">*</span></label>
                  <input type="tel" id="staff-phone" placeholder="9876543210" value={formData.phone} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.phone}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-dob">Date of Birth <span className="required">*</span></label>
                  <input type="date" id="staff-dob" value={formData.dob} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.dob}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-gender">Gender <span className="required">*</span></label>
                  <select id="staff-gender" value={formData.gender} onChange={handleInputChange} required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="error-msg">{errors.gender}</span>
                </div>

                <div className="form-group grid-span-2">
                  <label htmlFor="staff-address">Residential Address</label>
                  <textarea id="staff-address" rows="2" placeholder="Street Address, City, State, ZIP" value={formData.address} onChange={handleInputChange}></textarea>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Professional Details */}
          {currentStep === 2 && (
            <div className="wizard-step-pane active-pane">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="staff-role">Role/Title <span className="required">*</span></label>
                  <input type="text" id="staff-role" placeholder="Software Engineer" value={formData.role} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.role}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-dept">Department <span className="required">*</span></label>
                  <select id="staff-dept" value={formData.department} onChange={handleInputChange} required>
                    <option value="">Select Department</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Data Entry">Data Entry</option>
                    <option value="AI/ML Developer">AI/ML Developer</option>
                  </select>
                  <span className="error-msg">{errors.department}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-employment-type">Employment Type <span className="required">*</span></label>
                  <select id="staff-employment-type" value={formData.employmentType} onChange={handleInputChange} required>
                    <option value="">Select Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Intern">Intern</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                  <span className="error-msg">{errors.employmentType}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-join-date">Date of Joining <span className="required">*</span></label>
                  <input type="date" id="staff-join-date" value={formData.joinDate} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.joinDate}</span>
                </div>

                {/* Resume Upload Field */}
                <div className="form-group grid-span-2" style={{ marginTop: '10px' }}>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Staff Resume (CV)</span>
                  <div className="resume-upload-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="file" id="staff-resume" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleResumeUpload} />
                    <label htmlFor="staff-resume" id="btn-upload-resume" className="btn btn-secondary" style={{ height: '32px', padding: '0 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      Select Document
                    </label>
                    <span id="staff-resume-name" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formData.resumeName || 'No document selected'}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>PDF or Word format. Max 5MB.</p>
                </div>

                {/* Intern-specific Details Section (Dynamic) */}
                {formData.employmentType === 'Intern' && (
                  <div id="intern-details-section" className="grid-span-2" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--accent-primary)', fontFamily: 'var(--font-header)' }}>Academic & Internship Details</h4>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div className="form-group">
                        <label htmlFor="staff-college-name">College/University Name <span className="required">*</span></label>
                        <input type="text" id="staff-college-name" placeholder="e.g. COEP Pune" value={formData.collegeName} onChange={handleInputChange} />
                        <span className="error-msg">{errors.collegeName}</span>
                      </div>
                      <div className="form-group">
                        <label htmlFor="staff-register-num">College Register Name / Number <span className="required">*</span></label>
                        <input type="text" id="staff-register-num" placeholder="e.g. REG-12345" value={formData.registerNumber} onChange={handleInputChange} />
                        <span className="error-msg">{errors.registerNumber}</span>
                      </div>
                      <div className="form-group grid-span-2">
                        <label htmlFor="staff-college-address">College Address <span className="required">*</span></label>
                        <textarea id="staff-college-address" rows="2" placeholder="e.g. Shivajinagar, Pune, MH - 411005" value={formData.collegeAddress} onChange={handleInputChange}></textarea>
                        <span className="error-msg">{errors.collegeAddress}</span>
                      </div>
                      <div className="form-group grid-span-2">
                        <label htmlFor="staff-intern-domain">Domain Name <span className="required">*</span></label>
                        <input type="text" id="staff-intern-domain" placeholder="e.g. Backend Dev, AI Research" value={formData.domain} onChange={handleInputChange} />
                        <span className="error-msg">{errors.domain}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Identity & Compliance */}
          {currentStep === 3 && (
            <div className="wizard-step-pane active-pane">
              <div className="alert-box-info" style={{ display: 'flex', gap: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#9cbdf9' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <p style={{ margin: 0 }}>Verification of Aadhaar and PAN is required. Missing PAN results in a default 20% TDS penalty on payments.</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="staff-aadhaar">Aadhaar Number (12 Digits) <span className="required">*</span></label>
                  <input type="text" id="staff-aadhaar" placeholder="123456789012" maxLength="12" value={formData.aadhaar} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.aadhaar}</span>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-pan">PAN Number (10 Alphanumeric) <span className="required">*</span></label>
                  <input type="text" id="staff-pan" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} maxLength="10" value={formData.pan} onChange={handleInputChange} required />
                  <span className="error-msg">{errors.pan}</span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="wizard-footer" style={{ display: 'flex', marginTop: '25px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
            {currentStep > 1 && (
              <button type="button" id="btn-wizard-prev" className="btn btn-secondary" onClick={handlePrev}>Back</button>
            )}
            <div className="spacer" style={{ flexGrow: 1 }}></div>
            {currentStep < 3 ? (
              <button type="button" id="btn-wizard-next" className="btn btn-primary" onClick={handleNext}>Next</button>
            ) : (
              <button type="submit" id="btn-wizard-submit" className="btn btn-emerald">Save Staff Profile</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
