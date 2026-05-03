// ============================================
// STUDENT DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ":" + window.location.port : "");

// Get user from localStorage
const user = JSON.parse(localStorage.getItem("user"));
const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

// Role check
if (!user || !userId || userRole !== "Student") {
  alert("Access Denied. Students only.");
  window.location.href = "/";
}

// Global variables
let attendanceChart = null;
let html5QrCode = null;
let isScanning = false;
let messageTimer = null;
let activeSessionPollingInterval = null;
let currentLiveSessions = [];
let activeScanSessionId = null;

// ✅ NEW: Track sessions jisme student ne attendance mark kar li hai
//    Yeh set page reload tak yaad rakhega
const markedSessionIds = new Set();

const pkTimeFmt = new Intl.DateTimeFormat("en-PK", {
  timeZone: "Asia/Karachi",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function formatPkTime(value) {
  if (!value) return "--:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--:--";
  return pkTimeFmt.format(d);
}

// Display student name
document.getElementById("userName").textContent = user.name;

// ============================================
// SHOW MESSAGE - USING SWEETALERT2 TOAST
// ============================================

function showMessage(text, type = 'info') {
    const iconColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#1e293b',
        iconColor: iconColor,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
            toast.style.borderRadius = '12px';
            toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
            toast.style.borderLeft = `6px solid ${iconColor}`;
        }
    });

    Toast.fire({
        icon: type === 'success' ? 'success' : (type === 'error' ? 'error' : 'info'),
        title: `<div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${type.charAt(0).toUpperCase() + type.slice(1)}</div><div style="font-weight: 400; font-size: 13px; color: #64748b;">${text}</div>`
    });
}

// ============================================
// API CALL FUNCTION
// ============================================

async function apiCall(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const defaultOptions = {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(fullUrl, mergedOptions);

    const isPollingCall = url.includes("active_sessions_for_student");

    if (response.status === 401 || response.status === 403) {
      if (!isPollingCall) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        window.location.href = "/";
      }
      return null;
    }
    return response;
  } catch (error) {
    console.error("API call error:", error);
    return null;
  }
}

// ============================================
// LIVE SESSION POLLING
// ✅ CHANGE: 10000ms → 3000ms (3 seconds)
// ✅ CHANGE: already_marked sessions filter out ho jaayenge
// ============================================
async function pollActiveSessions() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/active_sessions_for_student`,
      {
        credentials: "include",
      }
    );

    if (!response || response.status === 401 || response.status === 403) {
      return;
    }

    const data = await response.json();

    if (data.status === "success") {
      // ✅ Sab sessions bhejo render ko — already_marked wale "confirmed" UI dikhayenge
      // Sirf stopped sessions filter honge (is_active=0 backend query mein already hai)
      const sessions = (data.sessions || []).map((s) => ({
        ...s,
        already_marked: s.already_marked == true || s.already_marked === 1 || markedSessionIds.has(s.session_id),
      }));
      renderLiveSessionBanner(sessions);
    }
  } catch (err) {
    console.error("Polling error:", err);
  }
}

function startPolling() {
  console.log("Live session polling started (3s interval)");
  pollActiveSessions();
  if (activeSessionPollingInterval) clearInterval(activeSessionPollingInterval);
  // ✅ CHANGE: 10000 → 3000 (3 seconds)
  activeSessionPollingInterval = setInterval(pollActiveSessions, 3000);
}

// ============================================
// RENDER LIVE SESSION BANNER
// ============================================

function renderLiveSessionBanner(sessions) {
  const bannerContainer = document.getElementById("liveSessionBanner");
  if (!bannerContainer) return;

  // Valid sessions — is_active = 1 wale (already_marked bhi include)
  const validSessions = (sessions || []).filter((s) => {
    return (
      s &&
      s.session_id &&
      s.course_name &&
      s.course_name !== "" &&
      s.course_name !== "null" &&
      s.teacher_name
    );
  });

  if (!validSessions || validSessions.length === 0) {
    bannerContainer.innerHTML = "";
    bannerContainer.classList.add("hidden");
    currentLiveSessions = [];
    return;
  }

  bannerContainer.classList.remove("hidden");

  // Snapshot mein already_marked bhi include karo taake UI update ho
  const newSnapshot = validSessions
    .map((s) => `${s.session_id}:${s.mode}:${s.already_marked}`)
    .sort()
    .join(",");
  const oldSnapshot = (currentLiveSessions || [])
    .map((s) => `${s.session_id}:${s.mode}:${s.already_marked}`)
    .sort()
    .join(",");

  if (newSnapshot === oldSnapshot && bannerContainer.children.length > 0) {
    return;
  }

  currentLiveSessions = [...validSessions];

  bannerContainer.innerHTML = validSessions
    .map((s) => {
      const isMarked = s.already_marked === true || markedSessionIds.has(s.session_id);
      const mode = (s.mode || "Pending").toLowerCase();

      // ✅ Agar already marked hai — alag "confirmed" UI dikhaو
      if (isMarked) {
        return `
          <div class="live-session-card live-session-card--marked" id="live-card-${s.session_id}">
            <div class="live-session-header live-session-header--marked">
              <span class="live-badge">
                <i class="fas fa-check-circle" style="color:#fff; margin-right:6px;"></i> SESSION IS LIVE
              </span>
              <span class="live-session-mode">${s.mode || "PENDING"} MODE</span>
            </div>
            <div class="live-session-body">
              <h2 class="live-subject-name">${escapeHtml(s.course_name)}</h2>
              <div class="live-info-row">
                <span>Teacher: <strong>${escapeHtml(s.teacher_name)}</strong></span>
                <span class="info-separator">|</span>
                <span>Room: <strong>${s.room_no || "N/A"}</strong></span>
                <span class="info-separator">|</span>
                <span>Section: <strong>${s.section_code}</strong></span>
              </div>
              <div class="already-marked-msg">
                <i class="fas fa-check-circle"></i>
                <div>
                  <strong>Attendance Marked Successfully!</strong>
                  <p>Session is still ongoing. This will disappear when teacher ends the session.</p>
                </div>
              </div>
            </div>
          </div>`;
      }

      // Normal — attendance abhi tak nahi mark ki
      let buttonsHtml = "";
      if (mode === "pending") {
        buttonsHtml = `<div class="waiting-mode-msg">Waiting for teacher to start attendance...</div>`;
      } else if (mode === "qr") {
        buttonsHtml = `
          <button class="live-qr-btn" onclick="openQRScannerForSession(${s.session_id})">
            <i class="fas fa-qrcode"></i> Scan QR
          </button>`;
      } else if (mode === "face") {
        buttonsHtml = `
          <button class="live-face-btn" onclick="markFaceForSession(${s.session_id})">
            <i class="fas fa-camera"></i> Face Recognition
          </button>`;
      } else if (mode === "manual") {
        buttonsHtml = `
          <button class="live-session-id-btn" onclick="enterSessionIdForSession(${s.session_id})">
            <i class="fas fa-keyboard"></i> Enter Session ID
          </button>`;
      } else {
        buttonsHtml = `
          <button class="live-qr-btn" onclick="openQRScannerForSession(${s.session_id})">
            <i class="fas fa-qrcode"></i> Scan QR
          </button>
          <button class="live-face-btn" onclick="markFaceForSession(${s.session_id})">
            <i class="fas fa-camera"></i> Face
          </button>
          <button class="live-session-id-btn" onclick="enterSessionIdForSession(${s.session_id})">
            <i class="fas fa-keyboard"></i> Enter ID
          </button>`;
      }

      return `
        <div class="live-session-card" id="live-card-${s.session_id}">
          <div class="live-session-header">
            <span class="live-badge">
              <span class="live-dot"></span> LIVE ATTENDANCE
            </span>
            <span class="live-session-mode">${s.mode || "PENDING"} MODE</span>
          </div>
          <div class="live-session-body">
            <h2 class="live-subject-name">${escapeHtml(s.course_name)}</h2>
            <div class="live-info-row">
              <span>Teacher: <strong>${escapeHtml(s.teacher_name)}</strong></span>
              <span class="info-separator">|</span>
              <span>Room: <strong>${s.room_no || "N/A"}</strong></span>
              <span class="info-separator">|</span>
              <span>Section: <strong>${s.section_code}</strong></span>
            </div>
            <div class="live-action-row">
              <span class="action-label">Mark your attendance now!</span>
              <div class="live-action-buttons">${buttonsHtml}</div>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hideLiveCard(sessionId) {
  const card = document.getElementById(`live-card-${sessionId}`);
  if (card) {
    card.style.animation = "fadeOutCard 0.4s ease forwards";
    setTimeout(() => {
      card.remove();
      currentLiveSessions = currentLiveSessions.filter(
        (s) => s.session_id !== sessionId
      );
      const bannerContainer = document.getElementById("liveSessionBanner");
      if (bannerContainer && currentLiveSessions.length === 0) {
        bannerContainer.classList.add("hidden");
      }
    }, 400);
  }
}

// ============================================
// LOAD STUDENT ATTENDANCE DATA
// ============================================

async function loadAttendance() {
  try {
    const response = await apiCall("/my_attendance");
    if (!response) return;

    const data = await response.json();

    if (
      data.status === "success" &&
      data.attendance &&
      data.attendance.length > 0
    ) {
      let totalPercentage = 0;
      let totalClasses = 0;
      let totalPresent = 0;

      const courseList = document.getElementById("courseAttendanceList");
      if (courseList) courseList.innerHTML = "";

      const chartLabels = [];
      const chartData = [];

      data.attendance.forEach((course) => {
        const percentage = parseFloat(course.percentage) || 0;
        totalPercentage += percentage;

        chartLabels.push(course.course_code);
        chartData.push(percentage);

        let colorClass = "percentage-low";
        if (percentage >= 75) colorClass = "percentage-high";
        else if (percentage >= 50) colorClass = "percentage-medium";

        if (courseList) {
          const courseDiv = document.createElement("div");
          courseDiv.className = "course-item";
          courseDiv.innerHTML = `
            <div class="course-info">
              <span class="course-name">${course.course_code} - ${course.course_name}</span>
              <div class="course-teacher"><i class="fas fa-chalkboard-teacher me-1"></i> ${course.teacher_name || 'Assigned Teacher'}</div>
            </div>
            <span class="course-percentage ${colorClass}">${percentage}%</span>
          `;
          courseList.appendChild(courseDiv);
        }

        totalClasses += parseInt(course.total_sessions) || 0;
        totalPresent += parseInt(course.present_days) || 0;
      });

      const overallAvg =
        data.attendance.length > 0
          ? (totalPercentage / data.attendance.length).toFixed(1)
          : 0;

      const overallElement = document.getElementById("overallAttendance");
      const classesAttendedElement = document.getElementById("classesAttended");
      const monthAttendanceElement = document.getElementById("monthAttendance");

      if (overallElement) overallElement.textContent = overallAvg + "%";
      if (classesAttendedElement)
        classesAttendedElement.textContent = `${totalPresent} / ${totalClasses}`;
      if (data.attendance.length > 0 && monthAttendanceElement) {
        monthAttendanceElement.textContent =
          data.attendance[0].percentage + "%";
      }

      updateChart(chartLabels, chartData);
      loadAttendanceHistory();

      const lowCourses = data.attendance.filter(
        (c) => parseFloat(c.percentage) < 75
      );
      if (lowCourses.length > 0) {
        const alertBox = document.getElementById("alertBox");
        const alertMessage = document.getElementById("alertMessage");
        if (alertBox && alertMessage) {
          alertMessage.innerHTML = `Your attendance is below 75% in: ${lowCourses.map((c) => c.course_code).join(", ")}`;
          alertBox.classList.remove("hidden");
        }
        loadFines();
      } else {
        const alertBox = document.getElementById("alertBox");
        if (alertBox) alertBox.classList.add("hidden");
      }
    } else {
      const courseList = document.getElementById("courseAttendanceList");
      if (courseList) {
        courseList.innerHTML =
          '<div class="loading-spinner">No attendance records found.</div>';
      }
    }
  } catch (err) {
    console.error("Error loading attendance:", err);
    const courseList = document.getElementById("courseAttendanceList");
    if (courseList) {
      courseList.innerHTML =
        '<div class="loading-spinner">Error loading attendance data.</div>';
    }
  }
}

// ============================================
// LOAD ATTENDANCE HISTORY
// ============================================

async function loadAttendanceHistory() {
    try {
        const response = await apiCall("/my_attendance_history");
        if (!response) return;

        const data = await response.json();
        const historyList = document.getElementById("attendanceHistoryList");

        if (data.status === "success" && data.history && data.history.length > 0) {
            historyList.innerHTML = data.history.map((record, index) => {
                const isPresent = record.status.toLowerCase() === "present";
                const statusClass = isPresent ? "status-present" : "status-absent";
                const statusIcon = isPresent ? '' : '';
                
                // FIRST ROW (latest attendance) gets EYE-CATCHING style
                const isLatest = index === 0;
                
                // Format date nicely
                const recordDate = record.session_date;
                const today = new Date().toISOString().split('T')[0];
                const isToday = recordDate === today;
                
                let dateDisplay = recordDate;
                let dateBadge = '';
                
                if (isLatest && isToday) {
                    dateBadge = '<span style="background: #f55050; color: white; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: bold; margin-left: 8px; animation: pulse 1s infinite;">JUST NOW</span>';
                } else if (isLatest) {
                    dateBadge = '<span style="background: #f59e0b; color: white; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: bold; margin-left: 8px;">LATEST</span>';
                } else if (isToday) {
                    dateBadge = '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; margin-left: 8px;">TODAY</span>';
                }
                
                return `
                    <tr style="${isLatest ? 'background: linear-gradient(90deg, #fef3c7, #fffbeb); border-left: 4px solid #f59e0b; font-weight: 600; animation: slideIn 0.3s ease-out;' : ''}
                           ${isToday && !isLatest ? 'background: #ecfdf5;' : ''}
                           transition: all 0.3s ease;">
                        <td data-label="Date" style="padding: 12px 15px;">
                            <strong style="font-size: 14px;">${dateDisplay}</strong>
                            ${dateBadge}
                        </td>
                        <td data-label="Course" style="padding: 12px 15px;">
                            <div style="font-weight: 600;">${record.course_code}</div>
                            <small style="color: #64748b;">${record.course_name}</small>
                        </td>
                        <td data-label="Status" style="padding: 12px 15px;">
                            <span class="${statusClass}" style="font-weight: 600; font-size: 14px;">
                                ${statusIcon} ${record.status.toUpperCase()}
                            </span>
                        </td>
                        <td data-label="Mode" style="padding: 12px 15px;">
                            <span class="mode-badge" style="background: ${isLatest ? '#f59e0b' : '#e2e8f0'}; 
                                                           color: ${isLatest ? 'white' : '#475569'};
                                                           padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                <i class="fas ${record.mode === 'Face' ? 'fa-camera' : record.mode === 'QR' ? 'fa-qrcode' : 'fa-keyboard'}"></i>
                                ${record.mode || 'System'}
                            </span>
                        </td>
                        <td data-label="Time" style="padding: 12px 15px;">
                            <span class="time-text" style="font-family: monospace; font-weight: 600; 
                                                         background: ${isLatest ? '#fef3c7' : '#f1f5f9'};
                                                         padding: 4px 8px; border-radius: 8px;">
                                ${formatPkTime(record.marked_at)}
                            </span>
                        </td>
                    </tr>
                `;
            }).join("");
        } else {
            if (historyList) {
                historyList.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">
                            <i class="fas fa-calendar-alt" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                            No attendance records found.
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Error loading history:", err);
        const historyList = document.getElementById("attendanceHistoryList");
        if (historyList) {
            historyList.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-circle"></i> Error loading history
                    </td>
                </tr>
            `;
        }
    }
}
// ============================================
// UPDATE CHART
// ============================================

function updateChart(labels, data) {
  const ctx = document.getElementById("attendanceChart");
  if (!ctx) return;

  if (attendanceChart) {
    attendanceChart.destroy();
  }

  attendanceChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Attendance Percentage",
          data: data,
          backgroundColor: "rgba(52, 152, 219, 0.7)",
          borderColor: "#2980b9",
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: "Percentage (%)" },
        },
        x: { title: { display: true, text: "Courses" } },
      },
    },
  });
}

// ============================================
// QR SCANNER
// ============================================

function openQRScannerForSession(sessionId) {
  activeScanSessionId = sessionId;
  const modal = document.getElementById("qrModal");
  if (modal) modal.classList.remove("hidden");
  setScannerFallbackUI(false, "");
  startQRScanner();
}

function openQRScanner() {
  activeScanSessionId = null;
  const modal = document.getElementById("qrModal");
  if (modal) modal.classList.remove("hidden");
  setScannerFallbackUI(false, "");
  startQRScanner();
}

function closeQRScanner() {
  const modal = document.getElementById("qrModal");
  if (modal) modal.classList.add("hidden");
  stopQRScanner();
  setScannerFallbackUI(false, "");
}

function setScannerFallbackUI(showFallback, noteText) {
  const fallbackBtn = document.getElementById("enterSessionIdBtn");
  const fallbackNote = document.getElementById("qr-fallback-note");
  const statusDiv = document.getElementById("qr-status");

  if (fallbackBtn) fallbackBtn.classList.toggle("hidden", !showFallback);
  if (fallbackNote) {
    fallbackNote.classList.toggle("hidden", !showFallback);
    if (noteText) fallbackNote.textContent = noteText;
  }
  // Remove redundant error message in statusDiv to prevent duplication
  if (statusDiv) {
    if (showFallback) {
      statusDiv.classList.add("hidden");
    } else {
      statusDiv.classList.remove("hidden");
      if (noteText) statusDiv.textContent = noteText;
    }
  }
}

async function startQRScanner() {
  if (isScanning) return;

  const statusDiv = document.getElementById("qr-status");

  if (typeof Html5Qrcode === "undefined") {
    setScannerFallbackUI(
      true,
      "QR scanner library cannot load. Enter Session ID manually."
    );
    return;
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    setScannerFallbackUI(
      true,
      "Camera permission denied. Enter Session ID manually."
    );
    return;
  }

  html5QrCode = new Html5Qrcode("qr-reader");
  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  try {
    isScanning = true;
    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      onQRSuccess,
      onQRFailure
    );
    if (statusDiv) {
      statusDiv.textContent = "Scanning... Position QR code in frame";
      statusDiv.style.color = "#27ae60";
    }
  } catch (err) {
    console.error("Unable to start scanning:", err);
    // Hide the scanning status text if there is an error
    if (statusDiv) {
      statusDiv.classList.add("hidden");
    }
    setScannerFallbackUI(
      true,
      "Camera permission denied. Please enter Session ID manually."
    );
    isScanning = false;
  }
}

function stopQRScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode
      .stop()
      .catch((err) => console.error("Error stopping scanner:", err));
    html5QrCode = null;
    isScanning = false;
  }
}

async function onQRSuccess(decodedText) {
  stopQRScanner();
  closeQRScanner();

  const parts = decodedText.split(":");
  if (parts.length !== 4 || parts[0] !== "SESSION") {
    Swal.fire({
      icon: "error",
      title: "Invalid QR Code",
      text: "Please scan teacher's QR code.",
      confirmButtonColor: "#2c3e50",
    });
    return;
  }

  const sessionId = parseInt(parts[1], 10);
  if (isNaN(sessionId)) {
    Swal.fire({
      icon: "error",
      title: "Invalid Session ID",
      text: "Invalid Session ID in QR code.",
      confirmButtonColor: "#2c3e50",
    });
    return;
  }

  const res = await markAttendance({
    sessionId,
    mode: "QR",
    qrPayload: decodedText,
    cardSessionId: activeScanSessionId || sessionId,
  });

  if (res && (res.status === "success" || res.status === "already_marked")) {
      const isAlready = res.status === "already_marked";
      const title = isAlready ? "Already Marked" : "Attendance Successful";
      const msg = isAlready 
        ? (res.message || "You have already marked attendance for this session.") 
        : "Your attendance has been recorded successfully via QR.";
      const icon = isAlready ? "info" : "success";
      const btnColor = isAlready ? "#64748b" : "#2980b9";

      Swal.fire({
        title: title,
        text: msg,
        icon: icon,
        confirmButtonText: "Perfect!",
        confirmButtonColor: btnColor,
        borderRadius: '20px',
        allowOutsideClick: false
      });
  }
}

function onQRFailure(errorMessage) {
  const statusDiv = document.getElementById("qr-status");
  if (statusDiv && isScanning) {
    statusDiv.textContent = "Scanning... Position QR code in frame";
  }
}

// ============================================
// ENTER SESSION ID
// ============================================

function enterSessionIdManually() {
  // ✅ Close the QR scanner modal first
  closeQRScanner();

  Swal.fire({
    title: "Enter Session ID",
    html: `
        <div style="text-align: center; padding: 5px;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                Camera not available? Please enter the <strong>Session ID</strong> provided by your teacher.
            </p>
        </div>
    `,
    input: "number",
    inputPlaceholder: "e.g. 12345",
    showCancelButton: true,
    confirmButtonText: "Submit Attendance",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#2980b9",
    cancelButtonColor: "#64748b",
    borderRadius: '20px',
    inputAttributes: {
        style: 'text-align: center; font-size: 1.2rem; font-weight: 700; padding: 12px; border-radius: 12px;'
    },
    inputValidator: (value) => {
      if (!value || parseInt(value) <= 0) {
        return "Please enter a valid session ID!";
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const enteredId = parseInt(result.value, 10);
      markAttendance({ sessionId: enteredId, mode: "Manual" });
    }
  });
}

function enterSessionIdForSession(sessionId) {
  activeScanSessionId = sessionId;

  Swal.fire({
    title: "Verify Session ID",
    html: `
        <div style="text-align: center; padding: 5px;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                Please confirm the <strong>Session ID</strong> to mark your attendance manually.
            </p>
        </div>
    `,
    input: "number",
    inputValue: sessionId,
    showCancelButton: true,
    confirmButtonText: "Confirm ID",
    cancelButtonText: "Back",
    confirmButtonColor: "#2980b9",
    cancelButtonColor: "#64748b",
    borderRadius: '20px',
    inputAttributes: {
        style: 'text-align: center; font-size: 1.2rem; font-weight: 700; padding: 12px; border-radius: 12px;'
    },
    inputValidator: (value) => {
      if (!value || parseInt(value) <= 0) {
        return "Please enter a valid session ID!";
      }
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const enteredId = parseInt(result.value, 10);
      markAttendance({
        sessionId: enteredId,
        mode: "Manual",
        cardSessionId: sessionId,
      });
    }
  });
}

// ============================================
// MARK ATTENDANCE
// ✅ CHANGE: Successful mark ke baad markedSessionIds mein add karo
//    Taake polling mein woh session dobara na dikhe
// ============================================

async function markAttendance({
  sessionId,
  mode,
  qrPayload = null,
  cardSessionId = null,
}) {
  try {
    const payload = { session_id: sessionId, mode: mode };
    if (qrPayload) payload.qr_payload = qrPayload;

    const response = await fetch(`${API_BASE_URL}/mark_attendance`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const cardId = cardSessionId || sessionId;

    if (data.status === "success") {
      // ✅ Naya mark — banner update karo
      markedSessionIds.add(cardId);
      currentLiveSessions = currentLiveSessions.map((s) =>
        s.session_id === cardId ? { ...s, already_marked: true } : s
      );
      const bannerContainer = document.getElementById("liveSessionBanner");
      if (bannerContainer) bannerContainer.innerHTML = "";
      renderLiveSessionBanner(currentLiveSessions);

      setTimeout(() => showMessage("Attendance marked successfully!", "success"), 300);
      setTimeout(loadAttendance, 500);

    } else if (data.status === "already_marked") {
      // ✅ Already marked — banner green dikhaو, error mat dikhaو
      markedSessionIds.add(cardId);
      currentLiveSessions = currentLiveSessions.map((s) =>
        s.session_id === cardId ? { ...s, already_marked: true } : s
      );
      const bannerContainer = document.getElementById("liveSessionBanner");
      if (bannerContainer) bannerContainer.innerHTML = "";
      renderLiveSessionBanner(currentLiveSessions);

      showMessage(data.message || "Attendance already marked.", "info");

    } else {
      // ✅ Real error — enrollment issue, session closed, QR expired etc.
      showMessage(data.message || "Failed to mark attendance.", "error");
    }
  } catch (err) {
    console.error("Error marking attendance:", err);
    showMessage("Network error. Please check your connection and try again.", "error");
  }
}

// ============================================
// FACE RECOGNITION
// ============================================

let faceStream = null;
let challengeActive = false;
let currentChallengeIndex = 0;
let faceLandmarker = null;
let lastVideoTime = -1;
let faceCardSessionId = null;

async function initFaceLandmarker() {
  if (faceLandmarker) return;
  
  try {
    // Wait for CDN scripts to be available
    if (typeof FilesetResolver === "undefined" || typeof FaceLandmarker === "undefined") {
      console.log("Waiting for Mediapipe scripts to load...");
      for (let i = 0; i < 100; i++) { // Increase wait time to 10 seconds
        if (typeof FilesetResolver !== "undefined" && typeof FaceLandmarker !== "undefined") break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (typeof FilesetResolver === "undefined" || typeof FaceLandmarker === "undefined") {
      throw new Error("Mediapipe library failed to load from CDN. Please check your internet connection.");
    }

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU", // Try GPU first
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });
    
    console.log("AI Models loaded successfully.");
  } catch (err) {
    console.error("AI Model loading error:", err);
    
    // Fallback to CPU if GPU fails
    if (err.message && err.message.includes("GPU")) {
      console.log("GPU failed, retrying with CPU...");
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "CPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
        console.log("AI Models loaded successfully using CPU.");
        return;
      } catch (cpuErr) {
        console.error("CPU fallback also failed:", cpuErr);
      }
    }
    
    showMessage("AI Models failed to load. Please refresh the page or check your internet.", "error");
  }
}

// Shuffle function
function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

const baseChallenge = { type: "center", text: "Keep your face centered", icon: "fa-user" };
const dynamicChallenges = [
  { type: "blink", text: "Now blink your eyes", icon: "fa-eye" },
  { type: "left", text: "Turn your face to the LEFT side", icon: "fa-arrow-left" },
  { type: "right", text: "Turn your face to the RIGHT side", icon: "fa-arrow-right" },
];

const challenges = [baseChallenge, ...shuffleArray(dynamicChallenges)];

function markFaceForSession(sessionId) {
  faceCardSessionId = sessionId;
  document.getElementById("faceSessionId").value = sessionId;
  document.getElementById("faceModal").classList.remove("hidden");
  showFaceStep(1);
  initFaceLandmarker();
}

function markFace() {
  faceCardSessionId = null;
  document.getElementById("faceModal").classList.remove("hidden");
  showFaceStep(1);
  initFaceLandmarker();
}

function showFaceStep(step) {
  document.getElementById("faceStep1").classList.add("hidden");
  document.getElementById("faceStep2").classList.add("hidden");
  document.getElementById("faceStep3").classList.add("hidden");
  document.getElementById(`faceStep${step}`).classList.remove("hidden");
}

function closeFaceModal() {
  stopCamera();
  document.getElementById("faceModal").classList.add("hidden");
  challengeActive = false;
  faceCardSessionId = null;
}

function stopCamera() {
  if (faceStream) {
    faceStream.getTracks().forEach((track) => track.stop());
    faceStream = null;
  }
}

async function startFaceAttendance() {
  const sessionId = document.getElementById("faceSessionId").value;
  if (!sessionId) {
    showMessage("Please enter Session ID first.", "warning");
    return;
  }
  try {
    faceStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });
    const video = document.getElementById("faceVideo");
    video.srcObject = faceStream;
    showFaceStep(2);
    video.onloadedmetadata = () => {
      startAntiSpoofing();
    };
  } catch (err) {
    console.error("Camera error:", err);
    closeFaceModal();
    showMessage(
      "Camera access denied. Please allow camera permission and try again.",
      "error"
    );
  }
}

async function startAntiSpoofing() {
  if (!faceLandmarker) {
    document.getElementById("challengeText").textContent =
      "Loading AI Models...";
    await initFaceLandmarker();
  }
  challengeActive = true;
  currentChallengeIndex = 0;
  detectFrame();
}

function updateChallengeUI() {
  const challenge = challenges[currentChallengeIndex];
  if (!challenge) return;
  const textEl = document.getElementById("challengeText");
  const progressEl = document.getElementById("challengeProgress");
  const progressTextEl = document.getElementById("challengeProgressText");
  textEl.innerHTML = `<i class="fas ${challenge.icon} me-2"></i> ${challenge.text}`;
  const progress = (currentChallengeIndex / challenges.length) * 100;
  progressEl.style.width = `${progress}%`;
  progressTextEl.textContent = `${Math.round(progress)}%`;
}

async function detectFrame() {
  if (!challengeActive) return;
  const video = document.getElementById("faceVideo");
  if (video.readyState < 2) {
    requestAnimationFrame(detectFrame);
    return;
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = faceLandmarker.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const blendshapes = results.faceBlendshapes[0].categories;
      const challenge = challenges[currentChallengeIndex];
      let success = false;

      if (challenge.type === "center") {
        const nose = landmarks[1];
        if (nose.x > 0.3 && nose.x < 0.7) success = true;
      } else if (challenge.type === "blink") {
        const eyeBlinkLeft = blendshapes.find(
          (b) => b.categoryName === "eyeBlinkLeft"
        ).score;
        const eyeBlinkRight = blendshapes.find(
          (b) => b.categoryName === "eyeBlinkRight"
        ).score;
        if (eyeBlinkLeft > 0.4 || eyeBlinkRight > 0.4) success = true;
      } else if (challenge.type === "left") {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (
          Math.abs(nose.x - rightEye.x) <
          Math.abs(nose.x - leftEye.x) * 0.6
        )
          success = true;
      } else if (challenge.type === "right") {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (
          Math.abs(nose.x - leftEye.x) <
          Math.abs(nose.x - rightEye.x) * 0.6
        )
          success = true;
      }

      if (success) {
        const textEl = document.getElementById("challengeText");
        textEl.style.borderColor = "#2ecc71";
        textEl.innerHTML = `<i class="fas fa-check-circle me-2"></i> Good!`;
        challengeActive = false;
        setTimeout(() => {
          currentChallengeIndex++;
          if (currentChallengeIndex < challenges.length) {
            challengeActive = true;
            updateChallengeUI();
            detectFrame();
          } else {
            finishChallenges();
          }
        }, 1000);
        return;
      }
    }
  }
  updateChallengeUI();
  requestAnimationFrame(detectFrame);
}

function finishChallenges() {
  challengeActive = false;
  document.getElementById("challengeProgress").style.width = "100%";
  document.getElementById("challengeProgressText").textContent = "100%";
  document.getElementById("challengeText").innerHTML =
    '<i class="fas fa-sync fa-spin me-2"></i> Matching Face...';
  captureAndMatch();
}

async function captureAndMatch() {
  const video = document.getElementById("faceVideo");
  const canvas = document.getElementById("faceCanvas");
  const context = canvas.getContext("2d");

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    setTimeout(captureAndMatch, 500);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL("image/jpeg", 0.95);
  const sessionId = parseInt(document.getElementById("faceSessionId").value);

  try {
    const response = await apiCall("/api/mark_face_attendance", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, image: imageData }),
    });

    if (!response) {
      stopCamera();
      document.getElementById("faceModal").classList.add("hidden");
      showMessage("Could not connect to server. Please check your connection.", "error");
      return;
    }

    const data = await response.json();

    if (data.status === "success" || data.status === "already_marked") {
      closeFaceModal();
      const isAlready = data.status === "already_marked";
      showMessage(
        isAlready
          ? (data.message || "Attendance already marked for this session.")
          : "Attendance marked successfully!",
        isAlready ? "info" : "success"
      );

      if (faceCardSessionId) {
        markedSessionIds.add(faceCardSessionId);
        currentLiveSessions = currentLiveSessions.map((s) =>
          s.session_id === faceCardSessionId ? { ...s, already_marked: true } : s
        );
        const bannerContainer = document.getElementById("liveSessionBanner");
        if (bannerContainer) bannerContainer.innerHTML = "";
        renderLiveSessionBanner(currentLiveSessions);
      }
      setTimeout(loadAttendance, 500);

    } else {
      stopCamera();
      document.getElementById("faceModal").classList.add("hidden");
      Swal.fire({
        icon: "error",
        title: "Face Match Failed",
        text: data.message || "Your face did not match. Please try again.",
        showCancelButton: true,
        confirmButtonText: "Try Again",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#e74c3c",
        cancelButtonColor: "#64748b",
        allowOutsideClick: false,
      }).then((result) => {
        if (result.isConfirmed) {
          showFaceStep(1);
          document.getElementById("faceModal").classList.remove("hidden");
        }
        // Cancel dabaya — modal band rehta hai, kuch nahi hota
      });
    }

  } catch (err) {
    console.error("Match error:", err);
    stopCamera();
    document.getElementById("faceModal").classList.add("hidden");
    Swal.fire({
      icon: "error",
      title: "Recognition Failed",
      text: "Something went wrong. Please check your connection and try again.",
      showCancelButton: true,
      confirmButtonText: "Try Again",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#64748b",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        showFaceStep(1);
        document.getElementById("faceModal").classList.remove("hidden");
      }
    });
  }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
  if (activeSessionPollingInterval) {
    clearInterval(activeSessionPollingInterval);
    activeSessionPollingInterval = null;
  }

  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.clear();
  window.location.href = "/";
}

window.addEventListener("beforeunload", function () {
  if (activeSessionPollingInterval) {
    clearInterval(activeSessionPollingInterval);
  }
});

// ============================================
// FINES
// ============================================

async function loadFines() {
  const response = await apiCall("/my_fines");
  if (!response) return;

  const data = await response.json();
  if (data.status !== "success" || data.fines.length === 0) return;

  const pendingFines = data.fines.filter((f) => f.status === "Pending");
  if (pendingFines.length === 0) return;

  const container = document.querySelector(".container");
  const fineSection = document.createElement("div");
  fineSection.className = "section";
  fineSection.innerHTML = `
    <h3 style="color: #e74c3c;">
      <i class="fas fa-exclamation-triangle"></i> Pending Fines
    </h3>
    ${pendingFines
      .map(
        (fine) => `
      <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:10px; padding:20px; margin-bottom:15px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${fine.course_code} - ${fine.course_name}</strong><br>
            <small style="color:#666;">
              Attendance: ${fine.attendance_percentage}% | Issued: ${fine.issued_date}
            </small><br>
            <span style="font-size:20px; font-weight:700; color:#e74c3c;">Fine: Rs. ${fine.fine_amount}</span>
          </div>
          <button onclick="openPayment(${fine.fine_id}, '${fine.course_code}', ${fine.fine_amount})"
            style="background:linear-gradient(135deg,#27ae60,#2ecc71); color:white; border:none; padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer;">
            <i class="fas fa-credit-card"></i> Pay Now
          </button>
        </div>
      </div>
    `
      )
      .join("")}
  `;
  container.insertBefore(fineSection, container.firstChild);
}

let stripeInstance = null;
let stripeElements = null;
let cardElement = null;

async function openPayment(fineId, courseCode, amount) {
  if (!stripeInstance) {
    const keyRes = await fetch(`${API_BASE_URL}/get_stripe_key`, {
      credentials: "include",
    });
    const keyData = await keyRes.json();
    stripeInstance = Stripe(keyData.publishable_key);
  }

  const modal = document.createElement("div");
  modal.id = "paymentModal";
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);z-index:9999;
    display:flex;align-items:center;justify-content:center;`;

  modal.innerHTML = `
    <div style="background:white;border-radius:15px;padding:35px;
                width:450px;max-width:95%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <h3 style="color:#2c3e50;margin-bottom:5px;">
        <i class="fas fa-credit-card"></i> Pay Fine — Stripe
      </h3>
      <p style="color:#666;margin-bottom:20px;">
        ${courseCode} | <strong style="color:#e74c3c;">Rs. ${amount}</strong>
      </p>
      <div id="stripe-card-element"
        style="border:1px solid #ddd;border-radius:8px;padding:14px;
               margin-bottom:15px;background:#fafafa;"></div>
      <p id="stripe-error"
        style="color:#e74c3c;font-size:13px;margin-bottom:10px;display:none;"></p>
      <div style="display:flex;gap:10px;">
        <button id="payNowBtn" onclick="processStripePayment(${fineId},${amount})"
          style="flex:1;background:linear-gradient(135deg,#27ae60,#2ecc71);
                 color:white;border:none;padding:14px;border-radius:8px;
                 font-weight:700;font-size:16px;cursor:pointer;">
          <i class="fas fa-lock"></i> Pay Rs. ${amount}
        </button>
        <button onclick="document.getElementById('paymentModal').remove()"
          style="background:#ecf0f1;border:none;padding:14px 20px;
                 border-radius:8px;cursor:pointer;font-weight:600;">
          Cancel
        </button>
      </div>
      <p style="text-align:center;font-size:11px;color:#aaa;margin-top:15px;">
        <i class="fas fa-lock"></i> Secured by Stripe
      </p>
    </div>`;

  document.body.appendChild(modal);

  stripeElements = stripeInstance.elements();
  cardElement = stripeElements.create("card", {
    style: {
      base: {
        fontSize: "16px",
        color: "#2c3e50",
        "::placeholder": { color: "#aaa" },
      },
    },
  });
  cardElement.mount("#stripe-card-element");
}

async function processStripePayment(fineId, amount) {
  const btn = document.getElementById("payNowBtn");
  const errEl = document.getElementById("stripe-error");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  errEl.style.display = "none";

  try {
    // Step 1: Payment Intent create karo
    const intentRes = await fetch(`${API_BASE_URL}/create_payment_intent`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fine_id: fineId, amount: amount }),
    });
    const intentData = await intentRes.json();

    if (intentData.status !== "success") {
      errEl.textContent = intentData.message || "Payment setup failed";
      errEl.style.display = "block";
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
      return;
    }

    // Step 2: Stripe se card payment confirm karo
    const { error, paymentIntent } = await stripeInstance.confirmCardPayment(
      intentData.client_secret,
      { payment_method: { card: cardElement } },
    );

    // Agar card decline ho gaya
    if (error) {
      errEl.textContent = error.message;
      errEl.style.display = "block";
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
      return;
    }

    // Step 3: Payment successful, ab backend mein fine update karo
    if (paymentIntent.status === "succeeded") {
      const payRes = await fetch(`${API_BASE_URL}/pay_fine`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fine_id: fineId,
          payment_intent_id: paymentIntent.id, // ← YE ZAROORI HAI
        }),
      });
      const payData = await payRes.json();

      if (payData.status === "success") {
        // 🧾 RECEIPT AAYI TO SHOW KARO
        if (payData.receipt) {
          document.getElementById("paymentModal").remove();
          showReceipt(payData.receipt);
          showMessage("✅ Payment successful! Receipt generated.", "success");
        } else {
          // ⚠️ BACKUP — agar receipt nahi aayi to simple success dikhao
          const txnId = paymentIntent.id;
          document.getElementById("paymentModal").innerHTML = `
            <div style="background:white;border-radius:15px;padding:40px;
                        width:450px;max-width:95%;text-align:center;">
              <div style="width:70px;height:70px;background:#e8f8f0;
                          border-radius:50%;display:flex;align-items:center;
                          justify-content:center;margin:0 auto 20px;">
                <i class="fas fa-check" style="color:#27ae60;font-size:30px;"></i>
              </div>
              <h3 style="color:#27ae60;">Payment Successful!</h3>
              <p style="color:#666;">Transaction ID: <code>${txnId}</code></p>
              <p style="color:#666;">Amount: <strong>Rs. ${amount}</strong></p>
              <button onclick="document.getElementById('paymentModal').remove();location.reload();"
                style="background:linear-gradient(135deg,#27ae60,#2ecc71);color:white;
                       border:none;padding:12px 40px;border-radius:8px;
                       font-weight:700;font-size:15px;cursor:pointer;margin-top:15px;">
                Done
              </button>
            </div>`;
          showMessage("✅ Payment successful!", "success");
        }
      } else {
        // Backend se error aaya
        errEl.textContent =
          payData.message || "Payment failed. Please try again.";
        errEl.style.display = "block";
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
      }
    }
  } catch (err) {
    console.error("Payment error:", err);
    errEl.textContent = "Network error. Please try again.";
    errEl.style.display = "block";
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
  }
}

function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 16);
  input.value = v.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, "").slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  input.value = v;
}

async function processPayment(fineId, amount) {
  const cardNumber = document.getElementById("cardNumber").value;
  const expiry = document.getElementById("expiryDate").value;
  const cvv = document.getElementById("cvvCode").value;
  const name = document.getElementById("cardName").value;
  const errorEl = document.getElementById("cardError");
  const btn = document.getElementById("payNowBtn");

  if (!cardNumber || !expiry || !cvv || !name) {
    errorEl.textContent = "Please fill all fields.";
    errorEl.style.display = "block";
    return;
  }

  const rawCard = cardNumber.replace(/\s/g, "");
  if (!TEST_CARDS[rawCard]) {
    errorEl.textContent =
      "Invalid card details. Please check your card number.";
    errorEl.style.display = "block";
    return;
  }
  errorEl.style.display = "none";

  btn.disabled = true;
  btn.style.opacity = "0.8";

  const steps = [
    {
      text: '<i class="fas fa-spinner fa-spin"></i> Contacting bank...',
      delay: 1500,
    },
    {
      text: '<i class="fas fa-spinner fa-spin"></i> Verifying card...',
      delay: 1200,
    },
    {
      text: '<i class="fas fa-spinner fa-spin"></i> Confirming payment...',
      delay: 900,
    },
  ];

  for (const step of steps) {
    btn.innerHTML = step.text;
    await new Promise((r) => setTimeout(r, step.delay));
  }

  const response = await apiCall("/pay_fine", {
    method: "POST",
    body: JSON.stringify({ fine_id: fineId }),
  });

  if (!response) {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
    return;
  }

  const data = await response.json();

  if (data.status === "success") {
    const txnId = "TXN" + Date.now() + Math.floor(Math.random() * 999);
    const ref =
      "UNI-FINE-" +
      new Date().getFullYear() +
      "-" +
      Math.floor(Math.random() * 9000 + 1000);
    const masked = "••••" + rawCard.slice(-4);
    const now = new Date().toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
    });

    document.getElementById("paymentModal").innerHTML = `
      <div style="background:white; border-radius:15px; padding:40px;
                  width:450px; max-width:95%; box-shadow:0 20px 60px rgba(0,0,0,0.3);
                  text-align:center;">

        <div style="width:70px; height:70px; background:#e8f8f0;
                    border-radius:50%; display:flex; align-items:center;
                    justify-content:center; margin:0 auto 20px;">
          <i class="fas fa-check" style="color:#27ae60; font-size:30px;"></i>
        </div>

        <h3 style="color:#27ae60; margin-bottom:5px;">Payment Successful!</h3>
        <p style="color:#666; margin-bottom:25px;">Your fine has been cleared.</p>

        <div style="background:#f8f9fa; border-radius:10px; padding:20px;
                    text-align:left; font-size:14px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
            <span style="color:#888;">Amount Paid</span>
            <strong>Rs. ${amount}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
            <span style="color:#888;">Card</span>
            <span>${masked}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
            <span style="color:#888;">Transaction ID</span>
            <span style="font-size:12px;">${txnId}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
            <span style="color:#888;">Reference</span>
            <span style="font-size:12px;">${ref}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 0;">
            <span style="color:#888;">Date & Time</span>
            <span style="font-size:12px;">${now}</span>
          </div>
        </div>

        <p style="color:#27ae60; font-size:13px; margin-bottom:20px;">
          <i class="fas fa-envelope"></i> Receipt sent to your registered email
        </p>

        <button onclick="document.getElementById('paymentModal').remove(); location.reload();"
          style="background:linear-gradient(135deg,#27ae60,#2ecc71); color:white;
                 border:none; padding:12px 40px; border-radius:8px;
                 font-weight:700; font-size:15px; cursor:pointer;">
          Done
        </button>
      </div>
    `;

    showMessage("✅ Payment successful! Receipt sent to email.", "success");
  } else {
    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-lock"></i> Pay Rs. ${amount}`;
    errorEl.textContent = data.message || "Payment failed. Please try again.";
    errorEl.style.display = "block";
  }
}

// Payment SUCCESS ke baad ye function call karein
function showReceipt(receiptData) {
  const receiptHTML = `
        <div style="border: 2px dashed #27ae60; padding: 20px; background: #f0fff0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="color: #27ae60; margin: 0;">✅ PAYMENT SUCCESSFUL</h3>
                <small>Receipt No: <strong>${receiptData.receipt_no}</strong></small>
            </div>
            
            <table style="width: 100%; font-size: 14px;">
                <tr>
                    <td style="padding: 8px 0; color: #666;">Student Name:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${receiptData.student_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Roll No:</td>
                    <td style="padding: 8px 0;">${receiptData.roll_no}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Course:</td>
                    <td style="padding: 8px 0;">${receiptData.course}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Attendance:</td>
                    <td style="padding: 8px 0; color: #e74c3c;">${receiptData.attendance}%</td>
                </tr>
                <tr style="border-top: 1px solid #ddd;">
                    <td style="padding: 12px 0; color: #666; font-size: 16px;"><strong>Amount Paid:</strong></td>
                    <td style="padding: 12px 0; font-size: 18px; color: #27ae60;"><strong>Rs. ${receiptData.amount}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Payment ID:</td>
                    <td style="padding: 8px 0; font-size: 11px;">${receiptData.payment_id}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666;">Date & Time:</td>
                    <td style="padding: 8px 0;">${receiptData.paid_at}</td>
                </tr>
                <tr style="border-top: 1px solid #ddd;">
                    <td style="padding: 12px 0; color: #666;"><strong>Status:</strong></td>
                    <td style="padding: 12px 0; color: #27ae60; font-weight: bold; font-size: 16px;">● ${receiptData.status}</td>
                </tr>
            </table>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
                <p>This is a computer-generated receipt</p>
                <p>Thank you for your payment!</p>
            </div>
        </div>
    `;

  document.getElementById("receiptContent").innerHTML = receiptHTML;
  document.getElementById("receiptModal").style.display = "block";
}

// Utility functions
// Close Receipt AND Reload page
function closeReceiptAndReload() {
  document.getElementById("receiptModal").style.display = "none";
  location.reload();
}

// Sirf close (baghair reload ke)
function closeReceipt() {
  document.getElementById("receiptModal").style.display = "none";
}

// Print Receipt
function printReceipt() {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 8px 0; }
        </style>
      </head>
      <body>${document.getElementById("receiptContent").innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Download PDF
function downloadReceipt() {
  const element = document.getElementById("receiptContent");
  const opt = {
    margin: 0.5,
    filename: "payment-receipt.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };
  html2pdf().set(opt).from(element).save();
}

// ============================================
// INITIALIZE
// ============================================

loadAttendance();
startPolling();

