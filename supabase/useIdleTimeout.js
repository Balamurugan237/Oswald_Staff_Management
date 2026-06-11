import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient'; // Adjust path based on your react structure

/**
 * Hook to track user activity, show a popup after idleTimeoutMinutes, 
 * and auto logout with checkout registration after countdownSeconds.
 * 
 * @param {string} userId - Auth UUID of the logged-in staff member
 * @param {number} idleTimeoutMinutes - Minutes of inactivity before warning
 * @param {number} countdownSeconds - Countdown duration in seconds
 */
export function useIdleTimeout(userId, idleTimeoutMinutes = 30, countdownSeconds = 60) {
  const [showPopup, setShowPopup] = useState(false);
  const [countdown, setCountdown] = useState(countdownSeconds);
  const idleTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const performLogout = async () => {
    // 1. Call database check_out RPC trigger
    if (userId) {
      try {
        await supabase.rpc('handle_check_out', { p_staff_id: userId });
      } catch (err) {
        console.error("Failed to automatically record checkout:", err);
      }
    }
    // 2. Sign out of session
    await supabase.auth.signOut();
    setShowPopup(false);
  };

  const resetIdleTimer = () => {
    if (showPopup) return; // Don't reset if countdown warning is active
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setShowPopup(true);
      startCountdown();
    }, idleTimeoutMinutes * 60 * 1000);
  };

  const startCountdown = () => {
    setCountdown(countdownSeconds);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          performLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleKeepWorking = () => {
    setShowPopup(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    resetIdleTimer();
  };

  useEffect(() => {
    if (!userId) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const activityHandler = () => resetIdleTimer();

    // Bind activity detectors
    events.forEach(e => window.addEventListener(e, activityHandler));
    resetIdleTimer(); // Initialise timer on component load

    return () => {
      events.forEach(e => window.removeEventListener(e, activityHandler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [userId, showPopup]);

  return { showPopup, countdown, handleKeepWorking };
}
