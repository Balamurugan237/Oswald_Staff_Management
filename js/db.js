/**
 * db.js - LocalStorage Database & Seed Data
 */

// Keys for localStorage
const STORAGE_KEYS = {
  STAFF: 'ossp_staff_data',
  ACTIVITIES: 'ossp_activities',
  ATTENDANCE: 'ossp_attendance'
};

// Initial realistic mock data
const DEFAULT_STAFF = [
  {
    id: "STF-101",
    name: "Arjun Mehta",
    email: "arjun.mehta@oswaldstack.com",
    phone: "9812345670",
    dob: "1994-05-12",
    gender: "Male",
    address: "Flat 402, Skyline Residency, Bandra West, Mumbai, MH - 400050",
    role: "Lead Systems Architect",
    department: "Backend",
    employmentType: "Full-time",
    joinDate: "2024-01-10",
    aadhaar: "584930291048",
    pan: "ABCDE1234F",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%236366f1'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>AM</text></svg>",
    resumeName: "ArjunMehta_Resume.pdf"
  },
  {
    id: "STF-102",
    name: "Sneha Rao",
    email: "sneha.rao@oswaldstack.com",
    phone: "9876543210",
    dob: "1997-09-22",
    gender: "Female",
    address: "32, Green Glen Layout, Bellandur, Bengaluru, KA - 560103",
    role: "Senior UX Designer",
    department: "Frontend",
    employmentType: "Full-time",
    joinDate: "2024-03-15",
    aadhaar: "839402910485",
    pan: "XYZSP9876Q",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%238b5cf6'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>SR</text></svg>",
    resumeName: "SnehaRao_UX_Resume.pdf"
  },
  {
    id: "STF-103",
    name: "Vikram Aditya",
    email: "vikram.aditya@oswaldstack.com",
    phone: "9123456789",
    dob: "1999-11-04",
    gender: "Male",
    address: "C-12, Sector 45, Noida, UP - 201303",
    role: "Data Analyst Intern",
    department: "Data Analyst",
    employmentType: "Intern",
    joinDate: "2025-12-01",
    aadhaar: "948301920384",
    pan: "", // Missing PAN to trigger warning
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%2310b981'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>VA</text></svg>",
    resumeName: "VikramAditya_Analyst_Resume.pdf",
    collegeName: "Indian Institute of Information Technology (IIIT), Allahabad",
    collegeAddress: "Deoghat, Jhalwa, Prayagraj, Uttar Pradesh - 211015",
    registerNumber: "IIT2023045",
    domain: "Data Analytics & Machine Learning"
  },
  {
    id: "STF-104",
    name: "Priyanka Nair",
    email: "priyanka.n@oswaldstack.com",
    phone: "8765432109",
    dob: "1995-02-28",
    gender: "Female",
    address: "104, Sunrise Apartments, Gachibowli, Hyderabad, TS - 500032",
    role: "Marketing Manager",
    department: "Marketing",
    employmentType: "Full-time",
    joinDate: "2024-08-01",
    aadhaar: "203948571029",
    pan: "PRNJK4829E",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f59e0b'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>PN</text></svg>",
    resumeName: "Priyanka_Nair_Marketing_CV.pdf"
  },
  {
    id: "STF-105",
    name: "Rohan Das",
    email: "rohan.das@oswaldstack.com",
    phone: "7654321098",
    dob: "1998-07-19",
    gender: "Male",
    address: "Block B, Salt Lake City, Kolkata, WB - 700091",
    role: "Data Entry Specialist",
    department: "Data Entry",
    employmentType: "Contractor",
    joinDate: "2024-11-15",
    aadhaar: "675849302910",
    pan: "ROHDM3820A",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ec4899'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>RD</text></svg>",
    resumeName: "Rohan_Das_Resume.pdf"
  },
  {
    id: "STF-106",
    name: "Ananya Joshi",
    email: "ananya.joshi@oswaldstack.com",
    phone: "9823456781",
    dob: "2000-01-30",
    gender: "Female",
    address: "56, Koregaon Park, Lane 3, Pune, MH - 411001",
    role: "AI/ML Developer",
    department: "AI/ML Developer",
    employmentType: "Intern",
    joinDate: "2026-02-01",
    aadhaar: "", // Missing Aadhaar to trigger warning
    pan: "ANJSH4920K",
    photo: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233b82f6'/><text x='50' y='58' font-family='Outfit' font-size='36' font-weight='bold' fill='white' text-anchor='middle'>AJ</text></svg>",
    resumeName: "AnanyaJoshi_AI_Developer.pdf",
    collegeName: "College of Engineering, Pune (COEP)",
    collegeAddress: "Wellesley Rd, Shivajinagar, Pune, Maharashtra - 411005",
    registerNumber: "REG-2024-AI92",
    domain: "Computer Vision & Natural Language Processing"
  }
];

const DEFAULT_ACTIVITIES = [
  { id: "act-1", text: "Database initialized with sample data profiles.", time: "2026-06-08T14:40:00Z", user: "System" },
  { id: "act-4", text: "Added new staff profile Ananya Joshi (Junior Developer).", time: "2026-06-01T10:15:00Z", user: "Admin User" }
];

/**
 * Initializes the databases in LocalStorage if they are not already set.
 */
export function initDB() {
  if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(DEFAULT_ACTIVITIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    // Seed mock attendance first
    seedMockAttendance();
  }
}

/**
 * Retrieves all staff members from localStorage
 * @returns {Array}
 */
export function getStaff() {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF));
}

/**
 * Saves or updates a staff member profile
 * @param {Object} staffObj 
 * @returns {Object} Saved staff object
 */
export function saveStaff(staffObj) {
  const staff = getStaff();
  let activityMsg = "";
  
  if (staffObj.id) {
    // Edit existing staff
    const index = staff.findIndex(s => s.id === staffObj.id);
    if (index !== -1) {
      staff[index] = { ...staff[index], ...staffObj };
      activityMsg = `Updated details for staff member ${staffObj.name} (${staffObj.id}).`;
    }
  } else {
    // Generate new unique ID
    const maxNum = staff.reduce((max, s) => {
      const match = s.id.match(/STF-(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        return val > max ? val : max;
      }
      return max;
    }, 100);
    
    staffObj.id = `STF-${maxNum + 1}`;
    staff.push(staffObj);
    activityMsg = `Added new staff profile ${staffObj.name} (${staffObj.id}).`;
  }

  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
  addActivity(activityMsg);
  return staffObj;
}

/**
 * Deletes a staff member by ID
 * @param {string} id 
 * @returns {boolean} True if deleted, false otherwise
 */
export function deleteStaff(id) {
  const staff = getStaff();
  const index = staff.findIndex(s => s.id === id);
  if (index !== -1) {
    const deletedName = staff[index].name;
    staff.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    addActivity(`Removed staff profile ${deletedName} (${id}).`);
    return true;
  }
  return false;
}



/**
 * Gets recent activity stream
 * @returns {Array}
 */
export function getActivities() {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES));
}

/**
 * Appends a log message to the activity stream
 * @param {string} text 
 * @param {string} user 
 */
export function addActivity(text, user = 'Admin User') {
  initDB();
  const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) || [];
  
  const newActivity = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text,
    time: new Date().toISOString(),
    user
  };

  activities.unshift(newActivity); // Newest first
  
  // Keep only the last 50 activities to avoid localstorage bloating
  if (activities.length > 50) {
    activities.pop();
  }
  
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  
  // Dispatch custom event to notify other modules of activity updates
  window.dispatchEvent(new CustomEvent('activity_updated', { detail: newActivity }));
}

/**
 * Hard resets database back to mock data
 */
export function resetDB() {
  localStorage.removeItem(STORAGE_KEYS.STAFF);
  localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  initDB();
  addActivity("Database manually reset to factory default values.");
}

/**
 * Retrieves all attendance records from localStorage
 * @returns {Array}
 */
export function getAttendance() {
  initDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [];
}

/**
 * Saves or updates a single attendance record
 * @param {Object} record 
 */
export function saveAttendanceRecord(record) {
  const attendance = getAttendance();
  const index = attendance.findIndex(a => a.staffId === record.staffId && a.date === record.date);
  
  if (index !== -1) {
    attendance[index] = { ...attendance[index], ...record };
  } else {
    if (!record.id) {
      record.id = `att-${record.staffId}-${record.date}`;
    }
    attendance.push(record);
  }
  
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
}

/**
 * Saves a batch of attendance records
 * @param {Array} records 
 */
export function saveAttendanceBatch(records) {
  const attendance = getAttendance();
  records.forEach(record => {
    const index = attendance.findIndex(a => a.staffId === record.staffId && a.date === record.date);
    if (index !== -1) {
      attendance[index] = { ...attendance[index], ...record };
    } else {
      if (!record.id) {
        record.id = `att-${record.staffId}-${record.date}`;
      }
      attendance.push(record);
    }
  });
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
}

/**
 * Seeds mock attendance data for previous payroll runs and current month
 */
function seedMockAttendance() {
  const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || DEFAULT_STAFF;
  const attendance = [];
  
  const periods = [
    { year: 2026, month: 4, endDay: 30 },
    { year: 2026, month: 5, endDay: 31 },
    { year: 2026, month: 6, endDay: 8 } // Current date is June 9, seed up to June 8
  ];
  
  periods.forEach(p => {
    const monthStr = String(p.month).padStart(2, '0');
    for (let day = 1; day <= p.endDay; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${p.year}-${monthStr}-${dayStr}`;
      
      // Determine if weekend (0=Sun, 6=Sat)
      const dayOfWeek = new Date(p.year, p.month - 1, day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }
      
      staff.forEach(s => {
        // Randomly determine status: ~88% Present, ~4% Absent, ~4% Half-day, ~4% On leave
        const rand = Math.random();
        let status = 'Present';
        let checkIn = '';
        let checkOut = '';
        let notes = '';
        
        if (rand < 0.88) {
          status = 'Present';
          const inMin = Math.floor(Math.random() * 45);
          const inStr = String(inMin).padStart(2, '0');
          checkIn = `09:${inStr}`;
          
          const outMin = Math.floor(Math.random() * 60);
          const outHour = outMin < 30 ? 17 : 18;
          const outMinAdjusted = outMin < 30 ? outMin + 30 : outMin - 30;
          const outStr = String(outMinAdjusted).padStart(2, '0');
          checkOut = `${outHour}:${outStr}`;
          
          if (inMin > 30) {
            notes = 'Late arrival due to traffic';
          }
        } else if (rand < 0.92) {
          status = 'Absent';
          notes = 'Sick leave notified';
        } else if (rand < 0.96) {
          status = 'Half-day';
          const inMin = Math.floor(Math.random() * 30);
          const inStr = String(inMin).padStart(2, '0');
          checkIn = `09:${inStr}`;
          
          const outMin = Math.floor(Math.random() * 30);
          const outStr = String(outMin).padStart(2, '0');
          checkOut = `13:${outStr}`;
          notes = 'Personal work half-day';
        } else {
          status = 'On leave';
          notes = 'Approved personal leave';
        }
        
        attendance.push({
          id: `att-${s.id}-${dateStr}`,
          staffId: s.id,
          date: dateStr,
          checkIn,
          checkOut,
          status,
          notes,
          recordedBy: 'System'
        });
      });
    }
  });
  
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
}
