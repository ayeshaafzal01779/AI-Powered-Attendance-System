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

    if (response.status === 401 || response.status === 403) {
      alert("Session expired. Please login again.");
      localStorage.clear();
      window.location.href = "/";
      return null;
    }
    return response;
  } catch (error) {
    console.error("API call error:", error);
    return null;
  }
}

// ============================================
// SHOW MESSAGE
// ============================================

function showMessage(text, type) {
  let msgDiv = document.getElementById("message");

  if (!msgDiv) {
    msgDiv = document.createElement("div");
    msgDiv.id = "message";
    msgDiv.className = "message toast-message";
    document.body.appendChild(msgDiv);
  }

  if (messageTimer) clearTimeout(messageTimer);
  msgDiv.textContent = text;
  msgDiv.className = `message toast-message ${type} show`;

  messageTimer = setTimeout(() => {
    msgDiv.className = "message toast-message";
    msgDiv.textContent = "";
  }, 4500);
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
                        <span class="course-name">${course.course_code} - ${course.course_name}</span>
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
      
      // Load History
      loadAttendanceHistory();

      const lowCourses = data.attendance.filter(
        (c) => parseFloat(c.percentage) < 75,
      );
      if (lowCourses.length > 0) {
        const alertBox = document.getElementById("alertBox");
        const alertMessage = document.getElementById("alertMessage");
        if (alertBox && alertMessage) {
          alertMessage.innerHTML = `⚠️ Your attendance is below 75% in: ${lowCourses.map((c) => c.course_code).join(", ")}`;
          alertBox.classList.remove("hidden");
        }
        // Fines load karo
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
      if (historyList) {
        historyList.innerHTML = data.history
          .map((record) => {
            const isPresent = record.status.toLowerCase() === "present";
            const statusClass = isPresent ? "status-present" : "status-absent";
            
            let modeIcon = "fa-tag";
            if (record.mode === "Face") modeIcon = "fa-user-check";
            else if (record.mode === "QR") modeIcon = "fa-qrcode";
            else if (record.mode === "Teacher") modeIcon = "fa-chalkboard-teacher";


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
// OPEN QR SCANNER
// ============================================

function openQRScanner() {
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
    setScannerFallbackUI(
      true,
      "QR scanner library cannot load. Enter Session ID manually.",
    );
    return;
  }

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    setScannerFallbackUI(
      true,
      "Camera permission denied. Enter Session ID manually.",
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
      onQRFailure,
    );
    if (statusDiv) {
      statusDiv.textContent = "Scanning... Position QR code in frame";
      statusDiv.style.color = "#27ae60";
    }
  } catch (err) {
    console.error("Unable to start scanning:", err);
    if (statusDiv) {
      statusDiv.textContent =
        "Camera access denied. Please allow camera permission or use Session ID fallback.";
      statusDiv.style.color = "#e74c3c";
    }
    setScannerFallbackUI(
      true,
      "Camera permission denied. 'Enter Session ID Instead of Scan '.",
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

// ============================================
// QR SCAN SUCCESS - MARK ATTENDANCE
// ============================================

async function onQRSuccess(decodedText) {
  stopQRScanner();
  closeQRScanner();

  console.log("QR Scanned:", decodedText);

  const parts = decodedText.split(":");

  if (parts.length !== 4 || parts[0] !== "SESSION") {
    showMessage("Invalid QR Code. Please scan teacher's QR code.", "error");
    return;
  }

  const sessionId = parseInt(parts[1], 10);

  if (isNaN(sessionId)) {
    showMessage("Invalid Session ID in QR code.", "error");
    return;
  }

  await markAttendance({
    sessionId,
    mode: "QR",
    qrPayload: decodedText,
  });
}

function onQRFailure(errorMessage) {
  const statusDiv = document.getElementById("qr-status");
  if (statusDiv && isScanning) {
    statusDiv.textContent = "Scanning... Position QR code in frame";
  }
}

// ============================================
// MARK ATTENDANCE
// ============================================

async function markAttendance({ sessionId, mode, qrPayload = null }) {
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
      showMessage("Attendance marked successfully!", "success");
      setTimeout(loadAttendance, 500);
    } else {
      showMessage("" + (data.message || "Failed to mark attendance"), "error");
    }
  } catch (err) {
    console.error("Error marking attendance:", err);
    showMessage("Network error. Please try again.", "error");
  }
}

// ============================================
// MARK QR (Manual Entry Fallback)
// ============================================

function markQR() {
  const sessionIdInput = prompt("📱 Enter Session ID (provided by teacher):");
  if (!sessionIdInput) return;
  const sessionId = parseInt(sessionIdInput, 10);
  if (isNaN(sessionId) || sessionId <= 0) {
    showMessage("Please enter a valid numeric session ID.", "error");
    return;
  }
  markAttendance({ sessionId, mode: "Manual" });
}

// ============================================
// MARK FACE (PHASE 3)
// ============================================

let faceStream = null;
let challengeActive = false;
let currentChallengeIndex = 0;
let faceLandmarker = null;
let lastVideoTime = -1;

// Initialize Mediapipe Face Landmarker
async function initFaceLandmarker() {
    if (faceLandmarker) return;
    
    try {
        console.log("Initializing AI Models...");
        if (typeof FilesetResolver === 'undefined' || typeof FaceLandmarker === 'undefined') {
            console.log("Waiting for Mediapipe scripts to load...");
            // Wait up to 5 seconds for the module to attach variables to window
            for (let i = 0; i < 50; i++) {
                if (typeof FilesetResolver !== 'undefined' && typeof FaceLandmarker !== 'undefined') break;
                await new Promise(r => setTimeout(r, 100));
            }
        }

        if (typeof FilesetResolver === 'undefined') {
            throw new Error("Mediapipe FilesetResolver not found");
        }

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
        console.log("AI Models loaded successfully");
    } catch (err) {
        console.error("AI Model loading error:", err);
        showMessage("AI Models fail to load. Please check your internet connection.", "error");
    }
}

// List of challenges
const challenges = [
    { type: 'center', text: 'Keep your face centered', icon: 'fa-user' },
    { type: 'blink', text: 'Now blink your eyes', icon: 'fa-eye' },
    { type: 'left', text: 'Turn your face to the LEFT side', icon: 'fa-arrow-left' },
    { type: 'right', text: 'Turn your face to the RIGHT side', icon: 'fa-arrow-right' }
];

async function markFace() {
    document.getElementById('faceModal').classList.remove('hidden');
    showFaceStep(1);
    initFaceLandmarker(); // Pre-load in background
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
        showMessage("Please enter Session ID", "error");
        return;
    }

    try {
        faceStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        const video = document.getElementById('faceVideo');
        video.srcObject = faceStream;
        
        showFaceStep(2);
        
        // Wait for video to load
        video.onloadedmetadata = () => {
            startAntiSpoofing();
        };
    } catch (err) {
        console.error("Camera error:", err);
        showMessage("Could not access camera", "error");
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
            
            // Logic for each challenge
            const challenge = challenges[currentChallengeIndex];
            let success = false;

            if (challenge.type === 'center') {
                // Check if face is roughly centered
                const nose = landmarks[1];
                if (nose.x > 0.3 && nose.x < 0.7) success = true;
            } 
            else if (challenge.type === 'blink') {
                // Detect blink using blendshapes
                const eyeBlinkLeft = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft').score;
                const eyeBlinkRight = blendshapes.find(b => b.categoryName === 'eyeBlinkRight').score;
                if (eyeBlinkLeft > 0.4 || eyeBlinkRight > 0.4) success = true;
            }
            else if (challenge.type === 'left') {
                // Detect head turn left
                const nose = landmarks[1];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                // If nose is closer to right eye, head is turned left
                if (Math.abs(nose.x - rightEye.x) < Math.abs(nose.x - leftEye.x) * 0.6) success = true;
            }
            else if (challenge.type === 'right') {
                // Detect head turn right
                const nose = landmarks[1];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                if (Math.abs(nose.x - leftEye.x) < Math.abs(nose.x - rightEye.x) * 0.6) success = true;
            }

            if (success) {
                const textEl = document.getElementById('challengeText');
                textEl.style.borderColor = '#2ecc71';
                textEl.innerHTML = `<i class="fas fa-check-circle me-2"></i> Good!`;
                
                challengeActive = false; // Pause detection
                setTimeout(() => {
                    currentChallengeIndex++;
                    if (currentChallengeIndex < challenges.length) {
                        challengeActive = true;
                        updateChallengeUI();
                        detectFrame();
                    } else {
                        // All challenges complete
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
    
    // Ensure video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("Video not ready for capture, waiting...");
        setTimeout(captureAndMatch, 500);
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw and capture with high quality
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    const sessionId = document.getElementById('faceSessionId').value;

    try {
        const response = await apiCall('/api/mark_face_attendance', {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                image: imageData
            })
        });

        const data = await response.json();
        if (data.status === 'success') {
            showFaceStep(3);
            setTimeout(loadAttendance, 500); // Refresh dashboard stats with small delay
        } else {
            showMessage(data.message || "Face matching failed", "error");
            showFaceStep(1);
            stopCamera();
        }
    } catch (err) {
        console.error("Match error:", err);
        showMessage("Error matching face", "error");
        showFaceStep(1);
        stopCamera();
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
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

// ============================================
// INITIALIZE
// ============================================

loadAttendance();

// ============================================
// LOAD FINES
// ============================================

async function loadFines() {
  const response = await apiCall("http://127.0.0.1:5000/my_fines");
  if (!response) return;

  const data = await response.json();
  if (data.status !== "success" || data.fines.length === 0) return;

  const pendingFines = data.fines.filter((f) => f.status === "Pending");
  if (pendingFines.length === 0) return;

  // Fine alert container banao
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
            <div style="background:#fff3cd; border:1px solid #ffc107; 
                        border-radius:10px; padding:20px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${fine.course_code} - ${fine.course_name}</strong><br>
                        <small style="color:#666;">
                            Attendance: ${fine.attendance_percentage}% | 
                            Issued: ${fine.issued_date}
                        </small><br>
                        <span style="font-size:20px; font-weight:700; color:#e74c3c;">
                            Fine: Rs. ${fine.fine_amount}
                        </span>
                    </div>
                    <button onclick="openPayment(${fine.fine_id}, '${fine.course_code}', ${fine.fine_amount})"
                        style="background:linear-gradient(135deg,#27ae60,#2ecc71); 
                               color:white; border:none; padding:12px 24px; 
                               border-radius:8px; font-weight:600; cursor:pointer;">
                        <i class="fas fa-credit-card"></i> Pay Now
                    </button>
                </div>
            </div>
        `,
          )
          .join("")}
    `;
  container.insertBefore(fineSection, container.firstChild);
}

// ============================================
// PAYMENT MODAL
// ============================================

function openPayment(fineId, courseCode, amount) {
  // Modal HTML
  const modal = document.createElement("div");
  modal.id = "paymentModal";
  modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.5); z-index:9999;
        display:flex; align-items:center; justify-content:center;
    `;
  modal.innerHTML = `
        <div style="background:white; border-radius:15px; padding:35px; 
                    width:450px; max-width:95%; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 style="color:#2c3e50; margin-bottom:5px;">
                <i class="fas fa-credit-card text-primary"></i> Pay Fine
            </h3>
            <p style="color:#666; margin-bottom:25px;">
                ${courseCode} | Amount: <strong style="color:#e74c3c;">Rs. ${amount}</strong>
            </p>
            
            <div style="margin-bottom:15px;">
                <label style="font-weight:600; display:block; margin-bottom:5px;">
                    Card Number
                </label>
                <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" 
                    maxlength="19"
                    style="width:100%; padding:12px; border:1px solid #ddd; 
                           border-radius:8px; font-size:14px;">
            </div>
            
            <div style="display:flex; gap:15px; margin-bottom:15px;">
                <div style="flex:1;">
                    <label style="font-weight:600; display:block; margin-bottom:5px;">
                        Expiry Date
                    </label>
                    <input type="text" id="expiryDate" placeholder="MM/YY" maxlength="5"
                        style="width:100%; padding:12px; border:1px solid #ddd; 
                               border-radius:8px; font-size:14px;">
                </div>
                <div style="flex:1;">
                    <label style="font-weight:600; display:block; margin-bottom:5px;">CVV</label>
                    <input type="text" id="cvvCode" placeholder="123" maxlength="3"
                        style="width:100%; padding:12px; border:1px solid #ddd; 
                               border-radius:8px; font-size:14px;">
                </div>
            </div>
            
            <div style="margin-bottom:25px;">
                <label style="font-weight:600; display:block; margin-bottom:5px;">
                    Card Holder Name
                </label>
                <input type="text" id="cardName" placeholder="Your Full Name"
                    style="width:100%; padding:12px; border:1px solid #ddd; 
                           border-radius:8px; font-size:14px;">
            </div>
            
            <div style="display:flex; gap:10px;">
                <button onclick="processPayment(${fineId})"
                    style="flex:1; background:linear-gradient(135deg,#27ae60,#2ecc71); 
                           color:white; border:none; padding:14px; border-radius:8px; 
                           font-weight:700; font-size:16px; cursor:pointer;">
                    <i class="fas fa-lock"></i> Pay Rs. ${amount}
                </button>
                <button onclick="document.getElementById('paymentModal').remove()"
                    style="background:#ecf0f1; border:none; padding:14px 20px; 
                           border-radius:8px; cursor:pointer; font-weight:600;">
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

  // Processing animation
  const btn = document.querySelector("#paymentModal button");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  await new Promise((r) => setTimeout(r, 2000)); // 2 second delay for effect

  const response = await apiCall("http://127.0.0.1:5000/pay_fine", {
    method: "POST",
    body: JSON.stringify({ fine_id: fineId }),
  });

  if (!response) return;
  const data = await response.json();

  if (data.status === "success") {
    document.getElementById("paymentModal").remove();
    // Success message
    const success = document.createElement("div");
    success.style.cssText = `
            position:fixed; top:20px; right:20px; z-index:9999;
            background:#27ae60; color:white; padding:20px 30px;
            border-radius:10px; font-weight:600; font-size:16px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        `;
    success.innerHTML =
      '<i class="fas fa-check-circle"></i> Payment Successful!';
    document.body.appendChild(success);
    setTimeout(() => {
      success.remove();
      location.reload();
    }, 3000);
  }
}
