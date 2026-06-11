/**
 * src/supabaseClient.js - Supabase Client & Local Storage Fallback Adapter
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase Client if keys are provided
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabase;

export function shouldUseMock() {
  if (!isSupabaseConfigured) return true;
  return localStorage.getItem('ossp_use_mock_mode') === 'true';
}

if (isSupabaseConfigured) {
  console.log('🔌 Supabase is connected successfully.');
} else {
  console.warn('⚠️ Supabase URL/Anon key missing. Falling back to Simulated Database.');
}

// ==========================================
// Mock/LocalStorage Database Implementation
// ==========================================

const STORAGE_KEYS = {
  STAFF: 'ossp_staff_data',
  ACTIVITIES: 'ossp_activities',
  ATTENDANCE: 'ossp_attendance'
};

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
    photo: "",
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
    photo: "",
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
    photo: "",
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
    photo: "",
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
    photo: "",
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
    photo: "",
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

// Initialize Mock LocalStorage Tables
export function initLocalDB() {
  if (!localStorage.getItem(STORAGE_KEYS.STAFF)) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEFAULT_STAFF));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(DEFAULT_ACTIVITIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    seedMockAttendance();
  }
}

// Helper to seed mock attendance data
function seedMockAttendance() {
  const staff = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || DEFAULT_STAFF;
  const attendance = [];
  
  const periods = [
    { year: 2026, month: 4, endDay: 30 },
    { year: 2026, month: 5, endDay: 31 },
    { year: 2026, month: 6, endDay: 11 } // Seed up to today June 11, 2026
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
          const inMin = Math.floor(Math.random() * 45); // 09:00 - 09:45
          const inStr = String(inMin).padStart(2, '0');
          checkIn = `09:${inStr}`;
          
          if (inMin > 0) { // Late if after 09:00
            status = 'Late';
          }
          
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
        
        const inTime = checkIn ? new Date(`${dateStr}T${checkIn}:00`) : null;
        const outTime = checkOut ? new Date(`${dateStr}T${checkOut}:00`) : null;
        let totalHours = 0;
        if (inTime && outTime) {
          totalHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
        }

        attendance.push({
          id: `att-${s.id}-${dateStr}`,
          staffId: s.id,
          date: dateStr,
          checkIn,
          checkOut,
          status,
          totalHours,
          notes,
          recordedBy: 'System'
        });
      });
    }
  });
  
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
}

// ==========================================
// DB Pub/Sub Event System for Mock Realtime
// ==========================================

const dbSubscribers = new Set();

export function subscribeToDBUpdates(callback) {
  dbSubscribers.add(callback);
  return () => {
    dbSubscribers.delete(callback);
  };
}

function notifySubscribers(payload) {
  dbSubscribers.forEach(cb => cb(payload));
  // Also dispatch window event for wider sync
  window.dispatchEvent(new CustomEvent('db_updated', { detail: payload }));
}

// ==========================================
// Adapter APIs for UI Components
// ==========================================

/**
 * Fetches all staff members
 */
export async function getStaffList() {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching staff from Supabase:', error);
      return getLocalStaff();
    }
    // Map database snake_case to frontend camelCase if needed
    return data.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.department,
      employmentType: s.employment_type,
      isActive: s.is_active,
      joinDate: s.created_at ? s.created_at.split('T')[0] : '',
      // Fetch rest of parameters from user_metadata or fallback
      phone: s.phone || '',
      dob: s.dob || '',
      gender: s.gender || '',
      address: s.address || '',
      aadhaar: s.aadhaar || '',
      pan: s.pan || '',
      photo: s.photo || '',
      resumeName: s.resume_name || '',
      collegeName: s.college_name || '',
      collegeAddress: s.college_address || '',
      registerNumber: s.register_number || '',
      domain: s.domain || ''
    }));
  } else {
    return getLocalStaff();
  }
}

function getLocalStaff() {
  initLocalDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF)) || [];
}

/**
 * Saves or updates a staff member
 */
export async function saveStaffMember(staffObj) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const dbObj = {
      name: staffObj.name,
      email: staffObj.email,
      role: staffObj.role,
      department: staffObj.department,
      employment_type: staffObj.employmentType,
      is_active: staffObj.isActive !== false,
      // Map other details
      phone: staffObj.phone,
      dob: staffObj.dob,
      gender: staffObj.gender,
      address: staffObj.address,
      aadhaar: staffObj.aadhaar,
      pan: staffObj.pan,
      photo: staffObj.photo,
      resume_name: staffObj.resumeName,
      college_name: staffObj.collegeName,
      college_address: staffObj.collegeAddress,
      register_number: staffObj.registerNumber,
      domain: staffObj.domain
    };

    let result;
    if (staffObj.id && staffObj.id.includes('-')) { // UUID format
      const { data, error } = await supabase
        .from('staff')
        .update(dbObj)
        .eq('id', staffObj.id)
        .select();
      if (error) throw error;
      result = data[0];
    } else {
      // For new staff, Supabase auth registers the user first, then triggers the signin profile insertion
      // For simplicity, we can do an insert into the staff table directly if testing without complete auth flows
      const { data, error } = await supabase
        .from('staff')
        .insert([{ id: crypto.randomUUID(), ...dbObj }])
        .select();
      if (error) throw error;
      result = data[0];
    }
    
    notifySubscribers({ type: 'staff', action: 'save', data: result });
    return result;
  } else {
    initLocalDB();
    const staff = getLocalStaff();
    let savedObj = { ...staffObj };
    
    if (savedObj.id) {
      const index = staff.findIndex(s => s.id === savedObj.id);
      if (index !== -1) {
        staff[index] = { ...staff[index], ...savedObj };
      }
    } else {
      const maxNum = staff.reduce((max, s) => {
        const match = s.id.match(/STF-(\d+)/);
        if (match) {
          const val = parseInt(match[1], 10);
          return val > max ? val : max;
        }
        return max;
      }, 100);
      savedObj.id = `STF-${maxNum + 1}`;
      staff.push(savedObj);
    }
    
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
    addLocalActivity(`Updated/Created profile for ${savedObj.name} (${savedObj.id})`);
    notifySubscribers({ type: 'staff', action: 'save', data: savedObj });
    return savedObj;
  }
}

/**
 * Deletes a staff member
 */
export async function deleteStaffMember(id) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);
    if (error) throw error;
    notifySubscribers({ type: 'staff', action: 'delete', id });
    return true;
  } else {
    initLocalDB();
    const staff = getLocalStaff();
    const index = staff.findIndex(s => s.id === id);
    if (index !== -1) {
      const deletedName = staff[index].name;
      staff.splice(index, 1);
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
      addLocalActivity(`Deleted profile of ${deletedName} (${id})`);
      notifySubscribers({ type: 'staff', action: 'delete', id });
      return true;
    }
    return false;
  }
}

/**
 * Fetches attendance records filtered by date range
 */
export async function getAttendanceList(startDate, endDate) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    let query = supabase.from('attendance').select('*');
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching attendance from Supabase:', error);
      return getLocalAttendance(startDate, endDate);
    }
    
    // Map lowercase Supabase statuses ('present', 'absent', 'late', 'half-day', 'leave')
    // to UI friendly casings ('Present', 'Absent', 'Late', 'Half-day', 'On leave')
    return data.map(a => ({
      id: a.id,
      staffId: a.staff_id,
      date: a.date,
      checkIn: a.check_in_time ? formatSupabaseTime(a.check_in_time) : '',
      checkOut: a.check_out_time ? formatSupabaseTime(a.check_out_time) : '',
      status: mapDBStatusToUI(a.status),
      totalHours: Number(a.total_hours || 0),
      recordedBy: a.recorded_by,
      notes: a.notes || ''
    }));
  } else {
    return getLocalAttendance(startDate, endDate);
  }
}

function getLocalAttendance(startDate, endDate) {
  initLocalDB();
  const allAtt = JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [];
  return allAtt.filter(a => {
    const dateMatch = (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate);
    return dateMatch;
  });
}

function formatSupabaseTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function mapDBStatusToUI(status) {
  switch (status) {
    case 'present': return 'Present';
    case 'absent': return 'Absent';
    case 'late': return 'Late';
    case 'half-day': return 'Half-day';
    case 'leave': return 'On leave';
    default: return status || 'Unmarked';
  }
}

export function mapUIStatusToDB(status) {
  switch (status) {
    case 'Present': return 'present';
    case 'Absent': return 'absent';
    case 'Late': return 'late';
    case 'Half-day': return 'half-day';
    case 'On leave': return 'leave';
    default: return 'present';
  }
}

/**
 * Saves a single attendance record
 */
export async function saveAttendanceRecord(record) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const dbRecord = {
      staff_id: record.staffId,
      date: record.date,
      status: mapUIStatusToDB(record.status),
      check_in_time: record.checkIn ? new Date(`${record.date}T${record.checkIn}:00`).toISOString() : null,
      check_out_time: record.checkOut ? new Date(`${record.date}T${record.checkOut}:00`).toISOString() : null,
      total_hours: record.totalHours || null,
      recorded_by: record.recordedBy || 'admin',
      notes: record.notes || ''
    };

    const { data, error } = await supabase
      .from('attendance')
      .upsert([dbRecord], { onConflict: 'staff_id,date' })
      .select();
    
    if (error) throw error;
    
    notifySubscribers({ type: 'attendance', action: 'save', data: record });
    return data[0];
  } else {
    initLocalDB();
    const allAtt = getLocalAttendance();
    const index = allAtt.findIndex(a => a.staffId === record.staffId && a.date === record.date);
    
    let updatedRecord = { ...record };
    if (!updatedRecord.id) {
      updatedRecord.id = `att-${record.staffId}-${record.date}`;
    }

    // Calculate hours if checkIn & checkOut are provided
    if (updatedRecord.checkIn && updatedRecord.checkOut) {
      const inTime = new Date(`${updatedRecord.date}T${updatedRecord.checkIn}:00`);
      const outTime = new Date(`${updatedRecord.date}T${updatedRecord.checkOut}:00`);
      updatedRecord.totalHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
    } else {
      updatedRecord.totalHours = 0;
    }

    if (index !== -1) {
      allAtt[index] = { ...allAtt[index], ...updatedRecord };
    } else {
      allAtt.push(updatedRecord);
    }
    
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allAtt));
    notifySubscribers({ type: 'attendance', action: 'save', data: updatedRecord });
    return updatedRecord;
  }
}

/**
 * Saves a batch of attendance records
 */
export async function saveAttendanceBatch(records) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const dbRecords = records.map(record => ({
      staff_id: record.staffId,
      date: record.date,
      status: mapUIStatusToDB(record.status),
      check_in_time: record.checkIn ? new Date(`${record.date}T${record.checkIn}:00`).toISOString() : null,
      check_out_time: record.checkOut ? new Date(`${record.date}T${record.checkOut}:00`).toISOString() : null,
      total_hours: record.totalHours || null,
      recorded_by: record.recordedBy || 'admin',
      notes: record.notes || ''
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(dbRecords, { onConflict: 'staff_id,date' })
      .select();

    if (error) throw error;
    
    notifySubscribers({ type: 'attendance', action: 'batch_save', data: records });
    return data;
  } else {
    initLocalDB();
    const allAtt = getLocalAttendance();
    
    records.forEach(record => {
      const index = allAtt.findIndex(a => a.staffId === record.staffId && a.date === record.date);
      let updatedRecord = { ...record };
      if (!updatedRecord.id) {
        updatedRecord.id = `att-${record.staffId}-${record.date}`;
      }

      if (updatedRecord.checkIn && updatedRecord.checkOut) {
        const inTime = new Date(`${updatedRecord.date}T${updatedRecord.checkIn}:00`);
        const outTime = new Date(`${updatedRecord.date}T${updatedRecord.checkOut}:00`);
        updatedRecord.totalHours = Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2));
      } else {
        updatedRecord.totalHours = 0;
      }

      if (index !== -1) {
        allAtt[index] = { ...allAtt[index], ...updatedRecord };
      } else {
        allAtt.push(updatedRecord);
      }
    });

    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(allAtt));
    notifySubscribers({ type: 'attendance', action: 'batch_save', data: records });
    return records;
  }
}

/**
 * Fetches recent activity logs
 */
export async function getActivities() {
  initLocalDB();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) || [];
}

/**
 * Appends a log message to the activity stream
 */
export function addLocalActivity(text, user = 'Admin User') {
  initLocalDB();
  const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) || [];
  
  const newActivity = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    text,
    time: new Date().toISOString(),
    user
  };

  activities.unshift(newActivity); // Newest first
  
  if (activities.length > 50) {
    activities.pop();
  }
  
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  notifySubscribers({ type: 'activity', data: newActivity });
}

/**
 * Real-time Supabase Table Subscription wrapper
 * Subscribes to changes on the public.attendance table.
 * Falls back to our local pub/sub system if Supabase is offline.
 */
export function subscribeToRealtimeAttendance(callback) {
  if (isSupabaseConfigured && !shouldUseMock()) {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        payload => {
          // Parse payloads to frontend format
          const record = payload.new;
          if (record && record.id) {
            const mappedRecord = {
              id: record.id,
              staffId: record.staff_id,
              date: record.date,
              checkIn: record.check_in_time ? formatSupabaseTime(record.check_in_time) : '',
              checkOut: record.check_out_time ? formatSupabaseTime(record.check_out_time) : '',
              status: mapDBStatusToUI(record.status),
              totalHours: Number(record.total_hours || 0),
              recordedBy: record.recorded_by,
              notes: record.notes || ''
            };
            callback({ event: payload.eventType, data: mappedRecord });
          } else {
            callback({ event: payload.eventType, id: payload.old?.id });
          }
        }
      )
      .subscribe();

    // Still link to local subscriber so self-simulators work in parallel
    const unsubscribeLocal = subscribeToDBUpdates(payload => {
      if (payload.type === 'attendance') {
        callback({ event: 'INSERT', data: payload.data });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribeLocal();
    };
  } else {
    // Local storage subscription
    return subscribeToDBUpdates(payload => {
      if (payload.type === 'attendance') {
        callback({ event: 'INSERT', data: payload.data });
      }
    });
  }
}
