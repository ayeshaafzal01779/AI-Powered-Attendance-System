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
    msgDiv.className = "message";
    const scanSection = document.querySelector(".scan-section");
    if (scanSection) {
      scanSection.appendChild(msgDiv);
    } else {
      const container = document.querySelector(".container");
      if (container) container.insertBefore(msgDiv, container.firstChild);
    }
  }

  msgDiv.textContent = text;
  msgDiv.className = `message ${type}`;

  setTimeout(() => {
    msgDiv.className = "message";
    msgDiv.textContent = "";
  }, 3000);
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
      loadAttendance();
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
// MARK FACE
// ============================================

function markFace() {
  const sessionIdInput = prompt("📸 Enter Session ID (provided by teacher):");
  if (!sessionIdInput) return;
  const sessionId = parseInt(sessionIdInput, 10);
  if (isNaN(sessionId) || sessionId <= 0) {
    showMessage("Please enter a valid numeric session ID.", "error");
    return;
  }
  alert("📸 Face Recognition: Please position your face in front of camera");
  markAttendance({ sessionId, mode: "Face" });
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
