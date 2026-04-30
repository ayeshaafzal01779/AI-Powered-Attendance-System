// ============================================
// STUDENT DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = "http://" + window.location.hostname + ":5000";

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

const pkTimeFmt = new Intl.DateTimeFormat('en-PK', {
  timeZone: 'Asia/Karachi',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

function formatPkTime(value) {
  if (!value) return '--:--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--:--';
  return pkTimeFmt.format(d);
}

// Display student name
document.getElementById("userName").textContent = user.name;

// ============================================
// SHOW MESSAGE - USING SWEETALERT2 TOAST
// ============================================

function showMessage(text, type) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        background: type === 'success' ? '#0f172a' : '#ffffff',
        color: type === 'success' ? '#ffffff' : '#1e293b',
        iconColor: type === 'success' ? '#10b981' : '#ef4444',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
            toast.style.borderRadius = '12px';
            toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
            toast.style.borderLeft = `5px solid ${type === 'success' ? '#10b981' : '#ef4444'}`;
        }
    });
    
    Toast.fire({
        icon: type === 'success' ? 'success' : 'error',
        title: text
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

    const isPollingCall = url.includes('active_sessions_for_student');
    
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
// ============================================
async function pollActiveSessions() {
  try {
    const response = await fetch(`${API_BASE_URL}/active_sessions_for_student`, {
      credentials: 'include'
    });
    
    if (response.status === 401 || response.status === 403) {
      console.log('Polling: Auth error');
      return;
    }
    
    if (!response.ok) {
      console.log('Polling: Server error', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (data.status === 'success') {
      renderLiveSessionBanner(data.sessions || []);
    }
  } catch (err) {
    console.warn('Polling network error (will retry):', err.message);
  }
}

function startPolling() {
  console.log('Live session polling started');
  pollActiveSessions();
  if (activeSessionPollingInterval) clearInterval(activeSessionPollingInterval);
  activeSessionPollingInterval = setInterval(pollActiveSessions, 10000);
}

// ============================================
// RENDER LIVE SESSION BANNER
// ============================================

function renderLiveSessionBanner(sessions) {
    const bannerContainer = document.getElementById("liveSessionBanner");
    if (!bannerContainer) {
        return;
    }

    // Filter valid sessions only
    const validSessions = (sessions || []).filter(s => {
        return s && 
               s.session_id && 
               s.course_name && 
               s.course_name !== '' &&
               s.course_name !== 'null' &&
               s.teacher_name;
    });
    
    if (!validSessions || validSessions.length === 0) {
        bannerContainer.innerHTML = "";
        bannerContainer.classList.add("hidden");
        currentLiveSessions = [];
        return;
    }

    bannerContainer.classList.remove("hidden");

    const newSnapshot = validSessions.map(s => `${s.session_id}:${s.mode}`).sort().join(",");
    const oldSnapshot = (currentLiveSessions || []).map(s => `${s.session_id}:${s.mode}`).sort().join(",");
    
    if (newSnapshot === oldSnapshot && bannerContainer.children.length > 0) {
        return;
    }

    currentLiveSessions = [...validSessions];

    bannerContainer.innerHTML = validSessions.map(s => {
        const mode = (s.mode || 'Pending').toLowerCase();
        let buttonsHtml = '';

        if (mode === 'pending') {
            buttonsHtml = `<div class="waiting-mode-msg">Waiting for teacher to start attendance...</div>`;
        } else if (mode === 'qr') {
            buttonsHtml = `
                <button class="live-qr-btn" onclick="openQRScannerForSession(${s.session_id})">
                    <i class="fas fa-qrcode"></i> Scan QR
                </button>`;
        } else if (mode === 'face') {
            buttonsHtml = `
                <button class="live-face-btn" onclick="markFaceForSession(${s.session_id})">
                    <i class="fas fa-camera"></i> Face Recognition
                </button>`;
        } else if (mode === 'manual') {
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
                <span class="live-session-mode">${s.mode || 'PENDING'} MODE</span>
            </div>
            <div class="live-session-body">
                <h2 class="live-subject-name">${escapeHtml(s.course_name)}</h2>
                
                <div class="live-info-row">
                    <span>Teacher: <strong>${escapeHtml(s.teacher_name)}</strong></span>
                    <span class="info-separator">|</span>
                    <span>Room: <strong>${s.room_no || 'N/A'}</strong></span>
                    <span class="info-separator">|</span>
                    <span>Section: <strong>${s.section_code}</strong></span>
                </div>
                
                <div class="live-action-row">
                    <span class="action-label">Mark your attendance now!</span>
                    <div class="live-action-buttons">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join("");
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function hideLiveCard(sessionId) {
  const card = document.getElementById(`live-card-${sessionId}`);
  if (card) {
    card.style.animation = "fadeOutCard 0.4s ease forwards";
    setTimeout(() => {
      card.remove();
      currentLiveSessions = currentLiveSessions.filter(s => s.session_id !== sessionId);
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

    if (data.status === "success" && data.attendance && data.attendance.length > 0) {
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
            <span class="course-name">${course.course_code} - ${course.course_name}</span>
            <span class="course-percentage ${colorClass}">${percentage}%</span>
          `;
          courseList.appendChild(courseDiv);
        }

        totalClasses += parseInt(course.total_sessions) || 0;
        totalPresent += parseInt(course.present_days) || 0;
      });

      const overallAvg = data.attendance.length > 0 ? (totalPercentage / data.attendance.length).toFixed(1) : 0;
      
      const overallElement = document.getElementById("overallAttendance");
      const classesAttendedElement = document.getElementById("classesAttended");
      const monthAttendanceElement = document.getElementById("monthAttendance");

      if (overallElement) overallElement.textContent = overallAvg + "%";
      if (classesAttendedElement) classesAttendedElement.textContent = `${totalPresent} / ${totalClasses}`;
      if (data.attendance.length > 0 && monthAttendanceElement) {
        monthAttendanceElement.textContent = data.attendance[0].percentage + "%";
      }

      updateChart(chartLabels, chartData);
      loadAttendanceHistory();

      const lowCourses = data.attendance.filter((c) => parseFloat(c.percentage) < 75);
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
        courseList.innerHTML = '<div class="loading-spinner">No attendance records found.</div>';
      }
    }
  } catch (err) {
    console.error("Error loading attendance:", err);
    const courseList = document.getElementById("courseAttendanceList");
    if (courseList) {
      courseList.innerHTML = '<div class="loading-spinner">Error loading attendance data.</div>';
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
      if (historyList) {
        historyList.innerHTML = data.history
          .map((record) => {
            const isPresent = record.status.toLowerCase() === "present";
            const statusClass = isPresent ? "status-present" : "status-absent";

            return `
              <tr>
                <td>${record.session_date}</td>
                <td>
                  <div class="fw-bold">${record.course_code}</div>
                  <small class="text-muted">${record.course_name}</small>
                </td>
                <td><span class="${statusClass}">${record.status}</span></td>
                <td><span class="mode-badge">${record.mode || "System"}</span></td>
                <td><span class="time-text">${formatPkTime(record.marked_at)}</span></td>
              </tr>
            `;
          })
          .join("");
      }
    } else {
      if (historyList) {
        historyList.innerHTML = '<tr><td colspan="5" class="text-center">No recent records found.</td></tr>';
      }
    }
  } catch (err) {
    console.error("Error loading history:", err);
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
  const fallbackBtn = document.getElementById("enterSessionBtn");
  const fallbackNote = document.getElementById("qr-fallback-note");
  const statusDiv = document.getElementById("qr-status");

  if (fallbackBtn) fallbackBtn.classList.toggle("hidden", !showFallback);
  if (fallbackNote) {
    fallbackNote.classList.toggle("hidden", !showFallback);
    if (noteText) fallbackNote.textContent = noteText;
  }
  if (statusDiv && noteText) statusDiv.textContent = noteText;
}

async function startQRScanner() {
  if (isScanning) return;

  const statusDiv = document.getElementById("qr-status");

  if (typeof Html5Qrcode === "undefined") {
    setScannerFallbackUI(true, "QR scanner library cannot load. Enter Session ID manually.");
    return;
  }

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    setScannerFallbackUI(true, "Camera permission denied. Enter Session ID manually.");
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
      onQRFailure,
    );
    if (statusDiv) {
      statusDiv.textContent = "Scanning... Position QR code in frame";
      statusDiv.style.color = "#27ae60";
    }
  } catch (err) {
    console.error("Unable to start scanning:", err);
    if (statusDiv) {
      statusDiv.textContent = "Camera access denied. Please allow camera permission.";
      statusDiv.style.color = "#e74c3c";
    }
    setScannerFallbackUI(true, "Camera permission denied. Enter Session ID instead.");
    isScanning = false;
  }
}

function stopQRScanner() {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().catch((err) => console.error("Error stopping scanner:", err));
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
      icon: 'error',
      title: 'Invalid QR Code',
      text: "Please scan teacher's QR code.",
      confirmButtonColor: '#2c3e50'
    });
    return;
  }

  const sessionId = parseInt(parts[1], 10);
  if (isNaN(sessionId)) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid Session ID',
      text: 'Invalid Session ID in QR code.',
      confirmButtonColor: '#2c3e50'
    });
    return;
  }

  await markAttendance({
    sessionId,
    mode: "QR",
    qrPayload: decodedText,
    cardSessionId: activeScanSessionId || sessionId
  });
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

function enterSessionIdForSession(sessionId) {
  activeScanSessionId = sessionId;
  
  Swal.fire({
    title: 'Enter Session ID',
    input: 'number',
    inputLabel: 'Session ID provided by teacher',
    inputValue: sessionId,
    showCancelButton: true,
    confirmButtonText: 'Submit',
    confirmButtonColor: '#2980b9',
    cancelButtonColor: '#64748b',
    inputValidator: (value) => {
      if (!value || parseInt(value) <= 0) {
        return 'Please enter a valid session ID!';
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      const enteredId = parseInt(result.value, 10);
      markAttendance({ sessionId: enteredId, mode: "Manual", cardSessionId: sessionId });
    }
  });
}

// ============================================
// MARK ATTENDANCE
// ============================================

async function markAttendance({ sessionId, mode, qrPayload = null, cardSessionId = null }) {
  showMessage("Processing attendance...", "success");

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

    if (data.status === "success") {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#0f172a',
        color: '#ffffff',
        iconColor: '#10b981',
        didOpen: (toast) => {
          toast.style.borderRadius = '12px';
          toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.15)';
          toast.style.borderLeft = '5px solid #10b981';
        }
      });
      
      Toast.fire({
        icon: 'success',
        title: 'Attendance Marked!',
        text: 'Your attendance has been recorded successfully.'
      });
      
      const cardId = cardSessionId || sessionId;
      hideLiveCard(cardId);
      setTimeout(loadAttendance, 500);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: data.message || 'Failed to mark attendance',
        confirmButtonColor: '#eceff3'
      });
    }
  } catch (err) {
    console.error("Error marking attendance:", err);
    Swal.fire({
      icon: 'error',
      title: 'Network Error',
      text: 'Please try again.',
      confirmButtonColor: '#2c3e50'
    });
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
    if (typeof FilesetResolver === 'undefined' || typeof FaceLandmarker === 'undefined') {
      for (let i = 0; i < 50; i++) {
        if (typeof FilesetResolver !== 'undefined' && typeof FaceLandmarker !== 'undefined') break;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    if (typeof FilesetResolver === 'undefined') throw new Error("Mediapipe not found");

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
  } catch (err) {
    console.error("AI Model loading error:", err);
    showMessage("AI Models failed to load.", "error");
  }
}

const challenges = [
  { type: 'center', text: 'Keep your face centered', icon: 'fa-user' },
  { type: 'blink', text: 'Now blink your eyes', icon: 'fa-eye' },
  { type: 'left', text: 'Turn your face to the LEFT side', icon: 'fa-arrow-left' },
  { type: 'right', text: 'Turn your face to the RIGHT side', icon: 'fa-arrow-right' }
];

function markFaceForSession(sessionId) {
  faceCardSessionId = sessionId;
  document.getElementById('faceSessionId').value = sessionId;
  document.getElementById('faceModal').classList.remove('hidden');
  showFaceStep(1);
  initFaceLandmarker();
}

function markFace() {
  faceCardSessionId = null;
  document.getElementById('faceModal').classList.remove('hidden');
  showFaceStep(1);
  initFaceLandmarker();
}

function showFaceStep(step) {
  document.getElementById('faceStep1').classList.add('hidden');
  document.getElementById('faceStep2').classList.add('hidden');
  document.getElementById('faceStep3').classList.add('hidden');
  document.getElementById(`faceStep${step}`).classList.remove('hidden');
}

function closeFaceModal() {
  stopCamera();
  document.getElementById('faceModal').classList.add('hidden');
  challengeActive = false;
  faceCardSessionId = null;
}

function stopCamera() {
  if (faceStream) {
    faceStream.getTracks().forEach(track => track.stop());
    faceStream = null;
  }
}

async function startFaceAttendance() {
  const sessionId = document.getElementById('faceSessionId').value;
  if (!sessionId) {
    Swal.fire({
      icon: 'warning',
      title: 'Session ID Required',
      text: 'Please enter Session ID',
      confirmButtonColor: '#2980b9'
    });
    return;
  }
  try {
    faceStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    const video = document.getElementById('faceVideo');
    video.srcObject = faceStream;
    showFaceStep(2);
    video.onloadedmetadata = () => { startAntiSpoofing(); };
  } catch (err) {
    console.error("Camera error:", err);
    Swal.fire({
      icon: 'error',
      title: 'Camera Error',
      text: 'Could not access camera',
      confirmButtonColor: '#2c3e50'
    });
  }
}

async function startAntiSpoofing() {
  if (!faceLandmarker) {
    document.getElementById('challengeText').textContent = "Loading AI Models...";
    await initFaceLandmarker();
  }
  challengeActive = true;
  currentChallengeIndex = 0;
  detectFrame();
}

function updateChallengeUI() {
  const challenge = challenges[currentChallengeIndex];
  if (!challenge) return;
  const textEl = document.getElementById('challengeText');
  const progressEl = document.getElementById('challengeProgress');
  const progressTextEl = document.getElementById('challengeProgressText');
  textEl.innerHTML = `<i class="fas ${challenge.icon} me-2"></i> ${challenge.text}`;
  const progress = (currentChallengeIndex / challenges.length) * 100;
  progressEl.style.width = `${progress}%`;
  progressTextEl.textContent = `${Math.round(progress)}%`;
}

async function detectFrame() {
  if (!challengeActive) return;
  const video = document.getElementById('faceVideo');
  if (video.readyState < 2) { requestAnimationFrame(detectFrame); return; }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const results = faceLandmarker.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      const blendshapes = results.faceBlendshapes[0].categories;
      const challenge = challenges[currentChallengeIndex];
      let success = false;

      if (challenge.type === 'center') {
        const nose = landmarks[1];
        if (nose.x > 0.3 && nose.x < 0.7) success = true;
      } else if (challenge.type === 'blink') {
        const eyeBlinkLeft = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft').score;
        const eyeBlinkRight = blendshapes.find(b => b.categoryName === 'eyeBlinkRight').score;
        if (eyeBlinkLeft > 0.4 || eyeBlinkRight > 0.4) success = true;
      } else if (challenge.type === 'left') {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (Math.abs(nose.x - rightEye.x) < Math.abs(nose.x - leftEye.x) * 0.6) success = true;
      } else if (challenge.type === 'right') {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        if (Math.abs(nose.x - leftEye.x) < Math.abs(nose.x - rightEye.x) * 0.6) success = true;
      }

      if (success) {
        const textEl = document.getElementById('challengeText');
        textEl.style.borderColor = '#2ecc71';
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
  document.getElementById('challengeProgress').style.width = '100%';
  document.getElementById('challengeProgressText').textContent = '100%';
  document.getElementById('challengeText').innerHTML = '<i class="fas fa-sync fa-spin me-2"></i> Matching Face...';
  captureAndMatch();
}

async function captureAndMatch() {
  const video = document.getElementById('faceVideo');
  const canvas = document.getElementById('faceCanvas');
  const context = canvas.getContext('2d');

  if (video.videoWidth === 0 || video.videoHeight === 0) {
    setTimeout(captureAndMatch, 500);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL('image/jpeg', 0.95);
  const sessionId = document.getElementById('faceSessionId').value;

  try {
    const response = await apiCall('/api/mark_face_attendance', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, image: imageData })
    });

    const data = await response.json();
    if (data.status === 'success') {
      showFaceStep(3);
      if (faceCardSessionId) hideLiveCard(faceCardSessionId);
      setTimeout(loadAttendance, 500);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Face Matching Failed',
        text: data.message || 'Could not verify your face',
        confirmButtonColor: '#2c3e50'
      });
      showFaceStep(1);
      stopCamera();
    }
  } catch (err) {
    console.error("Match error:", err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error matching face',
      confirmButtonColor: '#2c3e50'
    });
    showFaceStep(1);
    stopCamera();
  }
}

// ============================================
// LOGOUT
// ============================================

// Add this to your existing logout function
async function logout() {
  // Stop polling when logging out
  if (activeSessionPollingInterval) {
    clearInterval(activeSessionPollingInterval);
    activeSessionPollingInterval = null;
  }
  
  try {
    await fetch(`${API_BASE_URL}/logout`, { method: "POST", credentials: "include" });
  } catch (err) {
    console.error("Logout error:", err);
  }
  localStorage.clear();
  window.location.href = "/";
}

// Also add cleanup when page is unloaded
window.addEventListener('beforeunload', function() {
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
    ${pendingFines.map((fine) => `
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
    `).join("")}
  `;
  container.insertBefore(fineSection, container.firstChild);
}

function openPayment(fineId, courseCode, amount) {
  const modal = document.createElement("div");
  modal.id = "paymentModal";
  modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.5); z-index:9999;
    display:flex; align-items:center; justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:white; border-radius:15px; padding:35px; width:450px; max-width:95%; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <h3 style="color:#2c3e50; margin-bottom:5px;"><i class="fas fa-credit-card text-primary"></i> Pay Fine</h3>
      <p style="color:#666; margin-bottom:25px;">${courseCode} | Amount: <strong style="color:#e74c3c;">Rs. ${amount}</strong></p>
      <div style="margin-bottom:15px;">
        <label style="font-weight:600; display:block; margin-bottom:5px;">Card Number</label>
        <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19"
          style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
      </div>
      <div style="display:flex; gap:15px; margin-bottom:15px;">
        <div style="flex:1;">
          <label style="font-weight:600; display:block; margin-bottom:5px;">Expiry Date</label>
          <input type="text" id="expiryDate" placeholder="MM/YY" maxlength="5"
            style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
        </div>
        <div style="flex:1;">
          <label style="font-weight:600; display:block; margin-bottom:5px;">CVV</label>
          <input type="text" id="cvvCode" placeholder="123" maxlength="3"
            style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
        </div>
      </div>
      <div style="margin-bottom:25px;">
        <label style="font-weight:600; display:block; margin-bottom:5px;">Card Holder Name</label>
        <input type="text" id="cardName" placeholder="Your Full Name"
          style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:14px;">
      </div>
      <div style="display:flex; gap:10px;">
        <button onclick="processPayment(${fineId})"
          style="flex:1; background:linear-gradient(135deg,#27ae60,#2ecc71); color:white; border:none; padding:14px; border-radius:8px; font-weight:700; font-size:16px; cursor:pointer;">
          <i class="fas fa-lock"></i> Pay Rs. ${amount}
        </button>
        <button onclick="document.getElementById('paymentModal').remove()"
          style="background:#ecf0f1; border:none; padding:14px 20px; border-radius:8px; cursor:pointer; font-weight:600;">
          Cancel
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function processPayment(fineId) {
  const cardNumber = document.getElementById("cardNumber").value;
  const expiry = document.getElementById("expiryDate").value;
  const cvv = document.getElementById("cvvCode").value;
  const name = document.getElementById("cardName").value;

  if (!cardNumber || !expiry || !cvv || !name) {
    alert("Sab fields fill karo!");
    return;
  }

  const btn = document.querySelector("#paymentModal button");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  await new Promise((r) => setTimeout(r, 2000));

  const response = await apiCall("/pay_fine", {
    method: "POST",
    body: JSON.stringify({ fine_id: fineId }),
  });

  if (!response) return;
  const data = await response.json();

  if (data.status === "success") {
    document.getElementById("paymentModal").remove();
    const success = document.createElement("div");
    success.style.cssText = `
      position:fixed; top:20px; right:20px; z-index:9999;
      background:#27ae60; color:white; padding:20px 30px;
      border-radius:10px; font-weight:600; font-size:16px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    success.innerHTML = '<i class="fas fa-check-circle"></i> Payment Successful!';
    document.body.appendChild(success);
    setTimeout(() => { success.remove(); location.reload(); }, 3000);
  }
}

// ============================================
// INITIALIZE
// ============================================

loadAttendance();
startPolling();