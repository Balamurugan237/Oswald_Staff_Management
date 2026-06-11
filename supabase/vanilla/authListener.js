/**
 * supabase/vanilla/authListener.js
 * Vanilla JavaScript Implementation of Supabase Auth,
 * Attendance check-ins, and 30-minute idle session auto-logouts.
 */

// Binds active listener. Call this inside app.js on page load.
export function initAuthAttendance(supabaseClient, idleTimeoutMinutes = 30, countdownSeconds = 60) {
  let currentUser = null;
  let idleTimer = null;
  let countdownTimer = null;
  let showPopup = false;
  let countdownVal = countdownSeconds;

  // 1. Listen for Supabase Authentication state changes
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    const prevUser = currentUser;
    currentUser = session?.user || null;

    if (event === 'SIGNED_IN') {
      resetIdleTimer();
    } else if (event === 'SIGNED_OUT') {
      // Explicit user checkout (when they click log out)
      if (prevUser) {
        try {
          await supabaseClient.rpc('handle_check_out', { p_staff_id: prevUser.id });
        } catch (err) {
          console.error("Failed to checkout user on signout:", err);
        }
      }
      clearTimers();
      removeWarningModal();
    }
  });

  // 2. Activity detectors
  const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  const activityHandler = () => resetIdleTimer();

  function resetIdleTimer() {
    if (showPopup) return; // Don't reset if countdown warning is active
    
    if (idleTimer) clearTimeout(idleTimer);
    
    idleTimer = setTimeout(() => {
      showPopup = true;
      injectWarningModal();
      startCountdown();
    }, idleTimeoutMinutes * 60 * 1000);
  }

  function startCountdown() {
    countdownVal = countdownSeconds;
    updateModalCountdownText();
    
    if (countdownTimer) clearInterval(countdownTimer);
    
    countdownTimer = setInterval(() => {
      countdownVal--;
      updateModalCountdownText();
      
      if (countdownVal <= 0) {
        clearInterval(countdownTimer);
        performAutoLogout();
      }
    }, 1000);
  }

  async function performAutoLogout() {
    if (currentUser) {
      try {
        await supabaseClient.rpc('handle_check_out', { p_staff_id: currentUser.id });
      } catch (err) {
        console.error("Failed to automatically record checkout:", err);
      }
    }
    await supabaseClient.auth.signOut();
    removeWarningModal();
  }

  function handleKeepWorking() {
    showPopup = false;
    if (countdownTimer) clearInterval(countdownTimer);
    removeWarningModal();
    resetIdleTimer();
  }

  function clearTimers() {
    if (idleTimer) clearTimeout(idleTimer);
    if (countdownTimer) clearInterval(countdownTimer);
  }

  // Bind/unbind activity listeners based on login state
  function bindActivityEvents() {
    events.forEach(e => window.addEventListener(e, activityHandler));
  }
  
  bindActivityEvents();

  // ==========================================
  // DOM Modal Injections
  // ==========================================
  const MODAL_ID = 'supabase-idle-warning-modal';

  function injectWarningModal() {
    if (document.getElementById(MODAL_ID)) return;

    const modalHTML = `
      <div id="${MODAL_ID}" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(9,13,22,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:99999; font-family:'Outfit',sans-serif;">
        <div style="background:#0f1626; border:1px solid rgba(99,102,241,0.25); border-radius:12px; padding:32px; width:90%; max-width:400px; text-align:center; box-shadow:0 16px 40px rgba(0,0,0,0.5), 0 0 16px rgba(99,102,241,0.15); color:#f3f4f6;">
          <h3 style="font-size:20px; font-weight:700; color:#6366f1; margin:0 0 12px 0;">Are you still working?</h3>
          <p style="font-size:14px; color:#9ca3af; margin:0 0 24px 0; line-height:1.5;">
            You have been inactive for 30 minutes. You will be automatically checked out and logged out in:
          </p>
          <div style="font-size:18px; color:#f3f4f6; font-weight:600; margin-bottom:24px;">
            <span id="idle-countdown-number" style="font-size:32px; color:#ef4444; font-weight:800; display:inline-block; margin-right:6px; min-width:40px;">${countdownVal}</span> seconds
          </div>
          <button id="idle-keep-working-btn" style="background:#6366f1; color:white; border:none; border-radius:8px; padding:12px 24px; font-size:14px; font-weight:600; cursor:pointer; width:100%; box-shadow:0 4px 14px rgba(99,102,241,0.35);">
            Yes, I am working
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('idle-keep-working-btn')?.addEventListener('click', handleKeepWorking);
  }

  function updateModalCountdownText() {
    const label = document.getElementById('idle-countdown-number');
    if (label) {
      label.innerText = countdownVal;
    }
  }

  function removeWarningModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) {
      modal.remove();
    }
  }
}
