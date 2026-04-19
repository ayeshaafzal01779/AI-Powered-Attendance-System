// ============================================
// ADMIN DASHBOARD - COMPLETE FIXED VERSION
// ============================================

const API_BASE_URL = null; // Set to "http://your-server:5000" when API ready
const USE_DUMMY_DATA = true; // Change to false when API is ready

// Get user from localStorage
const user = JSON.parse(localStorage.getItem("user"));
const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

// Role check
if (!user || !userId || userRole !== "Admin") {
  alert("Access Denied. Admin only.");
  window.location.href = "/";
}

// SweetAlert2 fallback
function showAlert(title, message, type) {
  if (typeof Swal !== "undefined" && Swal.fire) {
    Swal.fire(title, message, type);
  } else {
    alert(`${title}: ${message}`);
  }
}

// ============================================
// API CALL FUNCTION
// ============================================

async function apiCall(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  const defaultOptions = {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
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

// ==================== GLOBAL VARIABLES ====================
let securityAlerts = [];
let usersList = [];

// ==================== API HELPER (DUMMY/REAL SWITCH) ====================
async function apiRequest(endpoint, options = {}) {
  if (USE_DUMMY_DATA === true) {
    console.log("Using dummy data for:", endpoint);
    return handleDummyRequest(endpoint, options);
  }

  if (!API_BASE_URL) {
    return handleDummyRequest(endpoint, options);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { success: false, error: error.message };
  }
}

// ==================== DUMMY DATA (JAB TAK API NAHI HAI) ====================
const DUMMY_ALERTS = [
  {
    id: 1,
    type: "critical",
    title: "Multiple Failed Login Attempts",
    message:
      '3 failed login attempts detected for user "admin@triai.com" from IP 192.168.1.105',
    timestamp: "2026-04-17 09:15:23",
    status: "unread",
  },
  {
    id: 2,
    type: "warning",
    title: "Suspicious QR Scan Attempt",
    message: "Expired QR code scan attempted by student BIT22004",
    timestamp: "2026-04-17 08:45:12",
    status: "unread",
  },
  {
    id: 3,
    type: "critical",
    title: "Face Recognition Spoof Attempt",
    message:
      "Potential photo spoofing detected during attendance marking - Student BIT22022",
    timestamp: "2026-04-16 14:30:45",
    status: "read",
  },
  {
    id: 4,
    type: "info",
    title: "Unusual Attendance Pattern",
    message: "Student Ali Raza (BIT22004) attendance dropped to 65% this week",
    timestamp: "2026-04-16 10:20:33",
    status: "unread",
  },
  {
    id: 5,
    type: "warning",
    title: "Session Timeout",
    message: "Teacher session expired unexpectedly - Course: CS-304",
    timestamp: "2026-04-15 11:00:00",
    status: "read",
  },
];

const DUMMY_STUDENTS = [
  {
    rollNo: "BIT22022",
    name: "Ayesha Afzal",
    department: "IT",
    semester: "7th",
    faceData: "registered",
  },
  {
    rollNo: "BIT22004",
    name: "Ali Raza",
    department: "IT",
    semester: "7th",
    faceData: "notset",
  },
];

// Dummy requests handler (tab tak ke liye jab tak API nahi hai)
function handleDummyRequest(endpoint, options) {
  // ALERTS - GET
  if (
    endpoint === "/security/alerts" &&
    (!options.method || options.method === "GET")
  ) {
    return { success: true, alerts: DUMMY_ALERTS };
  }

  // ALERTS - POST (naya alert)
  if (endpoint === "/security/alerts" && options.method === "POST") {
    const body = JSON.parse(options.body);
    const newAlert = {
      id: Date.now(),
      ...body,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      status: "unread",
    };
    return { success: true, alert: newAlert };
  }

  // ALERTS - DELETE (ek alert)
  if (endpoint.startsWith("/security/alerts/") && options.method === "DELETE") {
    return { success: true };
  }

  // ALERTS - PUT (read mark)
  if (endpoint.includes("/read") && options.method === "PUT") {
    return { success: true };
  }

  // ALERTS - DELETE ALL
  if (endpoint === "/security/alerts" && options.method === "DELETE") {
    return { success: true };
  }

  // USERS - GET
  if (endpoint === "/users" && (!options.method || options.method === "GET")) {
    return { success: true, users: DUMMY_STUDENTS };
  }

  // USERS - POST (register)
  if (endpoint === "/users/register" && options.method === "POST") {
    return { success: true, message: "User registered successfully" };
  }

  // USERS - DELETE
  if (endpoint.startsWith("/users/") && options.method === "DELETE") {
    return { success: true };
  }

  // DASHBOARD STATS
  if (endpoint === "/dashboard/stats") {
    return {
      success: true,
      totalStudents: 1482,
      totalTeachers: 54,
      todayAttendance: 94.2,
      securityAlerts: 3,
    };
  }

  return { success: true, data: [] };
}

// ==================== SECURITY ALERTS FUNCTIONS ====================

async function loadAlertsFromAPI() {
  const result = await apiRequest("/security/alerts");
  if (result.success && result.alerts) {
    securityAlerts = result.alerts;
  } else {
    securityAlerts = DUMMY_ALERTS;
  }
  updateAlertCount();
}

function updateAlertCount() {
  const unreadCount = securityAlerts.filter(
    (alert) => alert.status === "unread",
  ).length;
  const alertCountElement = document.getElementById("alertCount");
  if (alertCountElement) {
    alertCountElement.textContent = unreadCount.toString().padStart(2, "0");
    if (unreadCount === 0) {
      alertCountElement.classList.remove("text-danger");
      alertCountElement.classList.add("text-success");
    } else {
      alertCountElement.classList.remove("text-success");
      alertCountElement.classList.add("text-danger");
    }
  }
}

async function showSecurityAlerts() {
  await loadAlertsFromAPI();
  renderAlertsList();
  const modal = new bootstrap.Modal(
    document.getElementById("securityAlertsModal"),
  );
  modal.show();
}

function renderAlertsList() {
  const alertsContainer = document.getElementById("alertsList");
  if (!alertsContainer) return;

  if (securityAlerts.length === 0) {
    alertsContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                <h5>No Security Alerts</h5>
                <p class="text-muted">All systems are running smoothly.</p>
            </div>
        `;
    return;
  }

  let alertsHtml = '<div class="alert-list">';
  securityAlerts.forEach((alert) => {
    let iconClass = "";
    let bgClass = "";
    switch (alert.type) {
      case "critical":
        iconClass = "fas fa-skull-crosswalk text-danger";
        bgClass = "bg-danger bg-opacity-10 border-danger";
        break;
      case "warning":
        iconClass = "fas fa-exclamation-triangle text-warning";
        bgClass = "bg-warning bg-opacity-10 border-warning";
        break;
      case "info":
        iconClass = "fas fa-info-circle text-info";
        bgClass = "bg-info bg-opacity-10 border-info";
        break;
      default:
        iconClass = "fas fa-bell text-primary";
        bgClass = "bg-primary bg-opacity-10 border-primary";
    }
    const unreadStyle =
      alert.status === "unread" ? "border-left: 3px solid #e74c3c;" : "";
    alertsHtml += `
            <div class="alert-item card mb-3 ${bgClass}" style="${unreadStyle}" id="alert-${alert.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="d-flex">
                            <div class="me-3 fs-4"><i class="${iconClass}"></i></div>
                            <div>
                                <h6 class="mb-1 fw-bold">${alert.title}</h6>
                                <p class="mb-1 text-muted small">${alert.message}</p>
                                <small class="text-muted"><i class="far fa-clock me-1"></i>${alert.timestamp}</small>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            ${alert.status === "unread" ? `<button class="btn btn-sm btn-outline-success" onclick="markAlertAsRead(${alert.id})"><i class="fas fa-check"></i></button>` : ""}
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteAlert(${alert.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  });
  alertsHtml += "</div>";
  alertsContainer.innerHTML = alertsHtml;
  updateAlertCount();
}

async function markAlertAsRead(alertId) {
  await apiRequest(`/security/alerts/${alertId}/read`, { method: "PUT" });
  await loadAlertsFromAPI();
  renderAlertsList();
}

async function deleteAlert(alertId) {
  if (confirm("Are you sure you want to delete this alert?")) {
    await apiRequest(`/security/alerts/${alertId}`, { method: "DELETE" });
    await loadAlertsFromAPI();
    renderAlertsList();
    updateAlertCount();
    if (securityAlerts.length === 0) {
      setTimeout(() => {
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("securityAlertsModal"),
        );
        if (modal) modal.hide();
      }, 1500);
    }
  }
}

async function clearAllAlerts() {
  if (confirm("⚠️ Are you sure you want to clear ALL security alerts?")) {
    await apiRequest("/security/alerts", { method: "DELETE" });
    securityAlerts = [];
    renderAlertsList();
    updateAlertCount();
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("securityAlertsModal"),
      );
      if (modal) modal.hide();
    }, 2000);
  }
}

// ==================== TODAY'S PRESENT STUDENTS FUNCTIONS ====================

// DUMMY DATA FOR TODAY'S PRESENT (JAB TAK API NAHI HAI)
const DUMMY_PRESENT_STUDENTS = [
  {
    rollNo: "BIT22022",
    name: "Ayesha Afzal",
    department: "IT",
    time: "09:05:32 AM",
    mode: "Face Recognition",
  },
  {
    rollNo: "BIT22023",
    name: "Meerab Gohar",
    department: "IT",
    time: "09:07:15 AM",
    mode: "QR Code",
  },
  {
    rollNo: "BIT22024",
    name: "Aqsa Bibi",
    department: "IT",
    time: "09:03:45 AM",
    mode: "Face Recognition",
  },
  {
    rollNo: "BIT22025",
    name: "Sara Khan",
    department: "CS",
    time: "09:08:22 AM",
    mode: "QR Code",
  },
  {
    rollNo: "BIT22026",
    name: "Omar Ali",
    department: "CS",
    time: "09:10:00 AM",
    mode: "Manual",
  },
  {
    rollNo: "BIT22027",
    name: "Fatima Zafar",
    department: "SE",
    time: "09:02:30 AM",
    mode: "Face Recognition",
  },
  {
    rollNo: "BIT22028",
    name: "Hamza Ahmed",
    department: "IT",
    time: "09:06:18 AM",
    mode: "QR Code",
  },
  {
    rollNo: "BIT22029",
    name: "Zainab Malik",
    department: "CS",
    time: "09:09:45 AM",
    mode: "Face Recognition",
  },
];

// Dashboard stats ke liye dummy data
let todayPresentData = {
  percentage: 94.2,
  totalStudents: 1482,
  presentCount: 78,
  date: new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  presentStudents: DUMMY_PRESENT_STUDENTS,
};

// API se today's present data fetch karne ka function (FUTURE-PROOF)
async function fetchTodayPresentData() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/today/present`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        todayPresentData = result.data;
        updateTodayPresentCard();
        return result.data;
      }
    } catch (error) {
      console.error("API Error - using dummy data:", error);
    }
  }
  return todayPresentData;
}

// Dashboard card update karne ka function
async function updateTodayPresentCard() {
  const data = await fetchTodayPresentData();
  const percentageElement = document.getElementById("todayPresentCount");
  const studentCountElement = document.getElementById(
    "todayPresentStudentCount",
  );

  if (percentageElement) {
    percentageElement.textContent = `${data.percentage}%`;
  }
  if (studentCountElement) {
    studentCountElement.textContent = `(${data.presentCount} / ${data.totalStudents} students)`;

    const percentage = data.percentage;
    if (percentage < 75) {
      percentageElement.classList.add("text-danger");
      percentageElement.classList.remove("text-success");
    } else if (percentage < 85) {
      percentageElement.classList.add("text-warning");
      percentageElement.classList.remove("text-danger", "text-success");
    } else {
      percentageElement.classList.add("text-success");
      percentageElement.classList.remove("text-danger", "text-warning");
    }
  }
}

// Today's Present Card Click Karne Par Modal Show Hoga
async function showTodayPresentList() {
  const data = await fetchTodayPresentData();

  const dateElement = document.getElementById("presentDate");
  const totalCountElement = document.getElementById("totalPresentCount");
  const tableBody = document.getElementById("presentStudentsList");

  if (dateElement) {
    dateElement.textContent =
      data.date || new Date().toLocaleDateString("en-PK");
  }
  if (totalCountElement) {
    totalCountElement.textContent = `${data.presentCount} / ${data.totalStudents}`;
  }

  if (tableBody) {
    if (data.presentStudents && data.presentStudents.length > 0) {
      let rows = "";
      data.presentStudents.forEach((student) => {
        let modeBadge = "";
        switch (student.mode) {
          case "Face Recognition":
            modeBadge = '<span class="badge bg-info">Face</span>';
            break;
          case "QR Code":
            modeBadge = '<span class="badge bg-primary">QR</span>';
            break;
          case "Manual":
            modeBadge = '<span class="badge bg-warning">Manual</span>';
            break;
          default:
            modeBadge = '<span class="badge bg-secondary">Other</span>';
        }

        rows += `
                    <tr>
                        <td><strong>${student.rollNo}</strong></td>
                        <td>${student.name}</td>
                        <td>${student.department}</td>
                        <td><small>${student.time}</small></td>
                        <td>${modeBadge}</td>
                    </tr>
                `;
      });
      tableBody.innerHTML = rows;
    } else {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="fas fa-info-circle me-2"></i>No students present today yet.
                    </td>
                </tr>
            `;
    }
  }

  const modal = new bootstrap.Modal(
    document.getElementById("todayPresentModal"),
  );
  modal.show();
}

// Export present list as CSV
function exportPresentList() {
  const data = todayPresentData;
  if (!data.presentStudents || data.presentStudents.length === 0) {
    alert("No data to export!");
    return;
  }

  let csvContent = "Roll No,Student Name,Department,Time,Mode\n";
  data.presentStudents.forEach((student) => {
    csvContent += `${student.rollNo},${student.name},${student.department},${student.time},${student.mode}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `present_students_${data.date.replace(/\s/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("✅ Present list exported successfully!");
}

function startAutoRefresh() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    setInterval(() => {
      updateTodayPresentCard();
    }, 300000);
  }
}

// ==================== TEACHERS LIST FUNCTIONS ====================

const DUMMY_TEACHERS = [
  {
    id: "T-2024-01",
    name: "Dr. Shahid Khan",
    department: "CS",
    designation: "Associate Professor",
    courses: ["CS-101", "CS-304", "CS-401"],
    status: "active",
    email: "shahid.khan@triai.edu",
    phone: "+92 300 1234567",
    joiningDate: "2020-08-15",
    qualification: "PhD Computer Science",
  },
  {
    id: "T-2024-02",
    name: "Prof. Ayesha Siddiqui",
    department: "IT",
    designation: "Professor",
    courses: ["IT-201", "IT-202", "IT-301"],
    status: "active",
    email: "ayesha.siddiqui@triai.edu",
    phone: "+92 300 2345678",
    joiningDate: "2018-01-10",
    qualification: "PhD Information Technology",
  },
  {
    id: "T-2024-03",
    name: "Dr. Imran Ali",
    department: "SE",
    designation: "Assistant Professor",
    courses: ["SE-101", "SE-102"],
    status: "active",
    email: "imran.ali@triai.edu",
    phone: "+92 300 3456789",
    joiningDate: "2019-09-01",
    qualification: "PhD Software Engineering",
  },
  {
    id: "T-2024-04",
    name: "Ms. Fatima Zafar",
    department: "IT",
    designation: "Lecturer",
    courses: ["IT-101", "IT-102"],
    status: "active",
    email: "fatima.zafar@triai.edu",
    phone: "+92 300 4567890",
    joiningDate: "2021-02-20",
    qualification: "MS Information Technology",
  },
  {
    id: "T-2024-05",
    name: "Dr. Usman Chaudhry",
    department: "AI",
    designation: "Associate Professor",
    courses: ["AI-301", "AI-302", "ML-401"],
    status: "active",
    email: "usman.chaudhry@triai.edu",
    phone: "+92 300 5678901",
    joiningDate: "2017-11-05",
    qualification: "PhD Artificial Intelligence",
  },
  {
    id: "T-2024-06",
    name: "Mr. Bilal Ahmed",
    department: "CS",
    designation: "Lecturer",
    courses: ["CS-201", "CS-202"],
    status: "inactive",
    email: "bilal.ahmed@triai.edu",
    phone: "+92 300 6789012",
    joiningDate: "2022-08-01",
    qualification: "MS Computer Science",
  },
  {
    id: "T-2024-07",
    name: "Dr. Sana Tariq",
    department: "SE",
    designation: "Professor",
    courses: ["SE-401", "SE-402", "SE-403"],
    status: "onleave",
    email: "sana.tariq@triai.edu",
    phone: "+92 300 7890123",
    joiningDate: "2015-03-12",
    qualification: "PhD Software Engineering",
  },
];

let allTeachers = [];

async function fetchTeachersData() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/teachers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        allTeachers = result.data;
        updateTeachersCard();
        return result.data;
      }
    } catch (error) {
      console.error("API Error - using dummy data:", error);
    }
  }

  allTeachers = DUMMY_TEACHERS;
  updateTeachersCard();
  return allTeachers;
}

async function updateTeachersCard() {
  const data = await fetchTeachersData();
  const countElement = document.getElementById("totalTeachersCount");
  const subtextElement = document.getElementById("totalTeachersSubtext");

  if (countElement) {
    countElement.textContent = data.length;
  }
  if (subtextElement) {
    const activeCount = data.filter(
      (teacher) => teacher.status === "active",
    ).length;
    subtextElement.textContent = `${activeCount} active, ${data.length - activeCount} inactive`;
  }
}

async function showAllTeachersList() {
  await fetchTeachersData();

  const totalElement = document.getElementById("modalTotalTeachers");
  const activeTodayElement = document.getElementById("modalActiveToday");
  const departmentsElement = document.getElementById("modalDepartmentsCount");
  const coursesElement = document.getElementById("modalCoursesCount");

  if (totalElement) totalElement.textContent = allTeachers.length;

  if (activeTodayElement) {
    const activeCount = allTeachers.filter((t) => t.status === "active").length;
    activeTodayElement.textContent = activeCount;
  }

  if (departmentsElement) {
    const uniqueDepts = [...new Set(allTeachers.map((t) => t.department))];
    departmentsElement.textContent = uniqueDepts.length;
  }

  if (coursesElement) {
    const totalCourses = allTeachers.reduce(
      (sum, t) => sum + t.courses.length,
      0,
    );
    coursesElement.textContent = totalCourses;
  }

  renderTeachersTable(allTeachers);

  const modal = new bootstrap.Modal(
    document.getElementById("teachersListModal"),
  );
  modal.show();

  setupTeacherFilters();
}

function renderTeachersTable(teachers) {
  const tableBody = document.getElementById("allTeachersList");

  if (!tableBody) return;

  if (teachers.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-info-circle me-2"></i>No teachers found.
                </td>
            </tr>
        `;
    return;
  }

  let rows = "";
  teachers.forEach((teacher) => {
    let statusBadge = "";
    switch (teacher.status) {
      case "active":
        statusBadge = '<span class="badge bg-success">Active</span>';
        break;
      case "inactive":
        statusBadge = '<span class="badge bg-secondary">Inactive</span>';
        break;
      case "onleave":
        statusBadge = '<span class="badge bg-warning">On Leave</span>';
        break;
      default:
        statusBadge = '<span class="badge bg-info">Unknown</span>';
    }

    let coursesBadges = "";
    teacher.courses.forEach((course) => {
      coursesBadges += `<span class="badge bg-info me-1 mb-1">${course}</span>`;
    });

    rows += `
            <tr>
                <td><strong>${teacher.id}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style="width: 35px; height: 35px;">
                            <small>${teacher.name.charAt(0)}${teacher.name.split(" ")[1]?.charAt(0) || ""}</small>
                        </div>
                        <div>
                            <strong>${teacher.name}</strong><br>
                            <small class="text-muted">${teacher.email || ""}</small>
                        </div>
                    </div>
                </td>
                <td>${teacher.department}</td>
                <td>${teacher.designation}</td>
                <td>${coursesBadges || '<span class="text-muted">-</span>'}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info me-1" onclick="viewTeacherDetails('${teacher.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editTeacherDetails('${teacher.id}')" title="Edit Teacher">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacherFromList('${teacher.id}')" title="Delete Teacher">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
  });
  tableBody.innerHTML = rows;
}

function setupTeacherFilters() {
  const searchInput = document.getElementById("teacherSearchInput");
  const departmentFilter = document.getElementById("departmentFilter");
  const statusFilter = document.getElementById("statusFilter");

  const filterFunction = () => {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const department = departmentFilter?.value || "all";
    const status = statusFilter?.value || "all";

    let filteredTeachers = [...allTeachers];

    if (searchTerm) {
      filteredTeachers = filteredTeachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(searchTerm) ||
          teacher.id.toLowerCase().includes(searchTerm) ||
          teacher.department.toLowerCase().includes(searchTerm) ||
          teacher.designation.toLowerCase().includes(searchTerm),
      );
    }

    if (department !== "all") {
      filteredTeachers = filteredTeachers.filter(
        (teacher) => teacher.department === department,
      );
    }

    if (status !== "all") {
      filteredTeachers = filteredTeachers.filter(
        (teacher) => teacher.status === status,
      );
    }

    renderTeachersTable(filteredTeachers);
  };

  if (searchInput) searchInput.addEventListener("keyup", filterFunction);
  if (departmentFilter)
    departmentFilter.addEventListener("change", filterFunction);
  if (statusFilter) statusFilter.addEventListener("change", filterFunction);
}

function viewTeacherDetails(teacherId) {
  const teacher = allTeachers.find((t) => t.id === teacherId);
  if (teacher) {
    alert(
      `👨‍🏫 Teacher Details:\n\nName: ${teacher.name}\nID: ${teacher.id}\nDepartment: ${teacher.department}\nDesignation: ${teacher.designation}\nCourses: ${teacher.courses.join(", ")}\nStatus: ${teacher.status}\nEmail: ${teacher.email}\nPhone: ${teacher.phone}\nQualification: ${teacher.qualification}`,
    );
  } else {
    alert("Teacher not found!");
  }
}

function editTeacherDetails(teacherId) {
  const teacher = allTeachers.find((t) => t.id === teacherId);
  if (teacher) {
    alert(
      `✏️ Edit Teacher: ${teacher.name}\n\n(Edit functionality will be added later)`,
    );
  }
}

async function deleteTeacherFromList(teacherId) {
  if (confirm("⚠️ Are you sure you want to delete this teacher record?")) {
    const teacher = allTeachers.find((t) => t.id === teacherId);

    if (!USE_DUMMY_DATA && API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          allTeachers = allTeachers.filter((t) => t.id !== teacherId);
          updateTeachersCard();
          renderTeachersTable(allTeachers);
          alert(`✅ Teacher ${teacher?.name} deleted successfully!`);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Failed to delete teacher");
      }
    } else {
      allTeachers = allTeachers.filter((t) => t.id !== teacherId);
      updateTeachersCard();
      renderTeachersTable(allTeachers);
      alert(`✅ Teacher ${teacher?.name} deleted successfully!`);
    }
  }
}

function exportTeachersList() {
  if (allTeachers.length === 0) {
    alert("No data to export!");
    return;
  }

  let csvContent =
    "Employee ID,Teacher Name,Department,Designation,Assigned Courses,Status,Email,Phone\n";
  allTeachers.forEach((teacher) => {
    csvContent += `"${teacher.id}","${teacher.name}","${teacher.department}","${teacher.designation}","${teacher.courses.join("; ")}","${teacher.status}","${teacher.email || ""}","${teacher.phone || ""}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `teachers_list_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("✅ Teachers list exported successfully!");
}

function printTeachersList() {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
        <html>
        <head>
            <title>Teachers List - Tri-AI Attendance System</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h2>Teachers List - Tri-AI Attendance System</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <hr>
            <div id="print-area">${document.querySelector("#allTeachersList").parentElement.innerHTML}</div>
            <script>window.print();<\/script>
        </body>
        </html>
    `);
  printWindow.document.close();
}

// ==================== TOTAL STUDENTS LIST FUNCTIONS ====================

const DUMMY_STUDENTS_FULL = [
  {
    rollNo: "BIT22022",
    name: "Ayesha Afzal",
    department: "IT",
    semester: "7th",
    faceStatus: "registered",
    attendance: 92,
    email: "ayesha@triai.edu",
    phone: "+92 300 1111111",
  },
  {
    rollNo: "BIT22023",
    name: "Meerab Gohar",
    department: "IT",
    semester: "7th",
    faceStatus: "registered",
    attendance: 88,
    email: "meerab@triai.edu",
    phone: "+92 300 2222222",
  },
  {
    rollNo: "BIT21005",
    name: "Aqsa Bibi",
    department: "IT",
    semester: "7th",
    faceStatus: "registered",
    attendance: 95,
    email: "aqsa@triai.edu",
    phone: "+92 300 3333333",
  },
  {
    rollNo: "BIT22004",
    name: "Ali Raza",
    department: "IT",
    semester: "7th",
    faceStatus: "notset",
    attendance: 65,
    email: "ali@triai.edu",
    phone: "+92 300 4444444",
  },
  {
    rollNo: "BIT22024",
    name: "Sara Khan",
    department: "CS",
    semester: "5th",
    faceStatus: "registered",
    attendance: 78,
    email: "sara@triai.edu",
    phone: "+92 300 5555555",
  },
  {
    rollNo: "BIT22025",
    name: "Omar Ali",
    department: "CS",
    semester: "5th",
    faceStatus: "registered",
    attendance: 82,
    email: "omar@triai.edu",
    phone: "+92 300 6666666",
  },
  {
    rollNo: "BIT22026",
    name: "Fatima Zafar",
    department: "SE",
    semester: "6th",
    faceStatus: "registered",
    attendance: 91,
    email: "fatima@triai.edu",
    phone: "+92 300 7777777",
  },
  {
    rollNo: "BIT22027",
    name: "Hamza Ahmed",
    department: "IT",
    semester: "7th",
    faceStatus: "notset",
    attendance: 45,
    email: "hamza@triai.edu",
    phone: "+92 300 8888888",
  },
  {
    rollNo: "BIT22028",
    name: "Zainab Malik",
    department: "CS",
    semester: "5th",
    faceStatus: "registered",
    attendance: 87,
    email: "zainab@triai.edu",
    phone: "+92 300 9999999",
  },
  {
    rollNo: "BIT22029",
    name: "Usman Chaudhry",
    department: "SE",
    semester: "6th",
    faceStatus: "notset",
    attendance: 71,
    email: "usman@triai.edu",
    phone: "+92 300 1010101",
  },
  {
    rollNo: "BIT22030",
    name: "Hira Naeem",
    department: "AI",
    semester: "4th",
    faceStatus: "registered",
    attendance: 94,
    email: "hira@triai.edu",
    phone: "+92 300 1112222",
  },
  {
    rollNo: "BIT22031",
    name: "Bilal Ashraf",
    department: "AI",
    semester: "4th",
    faceStatus: "registered",
    attendance: 79,
    email: "bilal@triai.edu",
    phone: "+92 300 2223333",
  },
  {
    rollNo: "BIT22032",
    name: "Sana Tariq",
    department: "DS",
    semester: "3rd",
    faceStatus: "notset",
    attendance: 62,
    email: "sana@triai.edu",
    phone: "+92 300 3334444",
  },
];

let allStudents = [];
let selectedStudentRollNos = [];

async function fetchStudentsData() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        allStudents = result.data;
        updateStudentsCard();
        return result.data;
      }
    } catch (error) {
      console.error("API Error - using dummy data:", error);
    }
  }

  allStudents = DUMMY_STUDENTS_FULL;
  updateStudentsCard();
  return allStudents;
}

async function updateStudentsCard() {
  const data = await fetchStudentsData();
  const countElement = document.getElementById("totalStudentsCount");
  const subtextElement = document.getElementById("totalStudentsSubtext");

  if (countElement) {
    countElement.textContent = data.length.toLocaleString();
  }
  if (subtextElement) {
    const registered = data.filter((s) => s.faceStatus === "registered").length;
    subtextElement.textContent = `${registered} face registered, ${data.length - registered} pending`;
  }
}

async function showAllStudentsList() {
  await fetchStudentsData();

  const totalElement = document.getElementById("modalTotalStudents");
  const presentTodayElement = document.getElementById("modalPresentToday");
  const departmentsElement = document.getElementById("modalStudentDepts");
  const faceRegisteredElement = document.getElementById("modalFaceRegistered");

  if (totalElement) totalElement.textContent = allStudents.length;

  if (presentTodayElement) {
    const presentCount =
      todayPresentData?.presentCount || Math.floor(allStudents.length * 0.75);
    presentTodayElement.textContent = presentCount;
  }

  if (departmentsElement) {
    const uniqueDepts = [...new Set(allStudents.map((s) => s.department))];
    departmentsElement.textContent = uniqueDepts.length;
  }

  if (faceRegisteredElement) {
    const registered = allStudents.filter(
      (s) => s.faceStatus === "registered",
    ).length;
    faceRegisteredElement.textContent = registered;
  }

  renderStudentsTable(allStudents);

  const modal = new bootstrap.Modal(
    document.getElementById("studentsListModal"),
  );
  modal.show();

  setupStudentFilters();

  const selectAllCheckbox = document.getElementById("selectAllStudents");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  selectedStudentRollNos = [];
}

function renderStudentsTable(students) {
  const tableBody = document.getElementById("allStudentsList");

  if (!tableBody) return;

  if (students.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-info-circle me-2"></i>No students found.
                </td>
            </tr>
        `;
    return;
  }

  let rows = "";
  students.forEach((student) => {
    const faceBadge =
      student.faceStatus === "registered"
        ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Registered</span>'
        : '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle me-1"></i>Not Set</span>';

    let attendanceColor = "";
    let attendanceIcon = "";
    if (student.attendance < 75) {
      attendanceColor = "text-danger";
      attendanceIcon = '<i class="fas fa-exclamation-triangle me-1"></i>';
    } else if (student.attendance < 85) {
      attendanceColor = "text-warning";
      attendanceIcon = '<i class="fas fa-chart-line me-1"></i>';
    } else {
      attendanceColor = "text-success";
      attendanceIcon = '<i class="fas fa-check-circle me-1"></i>';
    }

    rows += `
            <tr>
                <td class="text-center">
                    <input type="checkbox" class="studentCheckbox" value="${student.rollNo}" onchange="toggleStudentSelection('${student.rollNo}')">
                </td>
                <td><strong>${student.rollNo}</strong></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2" style="width: 35px; height: 35px;">
                            <small>${student.name.charAt(0)}${student.name.split(" ")[1]?.charAt(0) || ""}</small>
                        </div>
                        <div>
                            <strong>${student.name}</strong><br>
                            <small class="text-muted">${student.email || ""}</small>
                        </div>
                    </div>
                </td>
                <td>${student.department}</td>
                <td>${student.semester}</td>
                <td>${faceBadge}</td>
                <td class="${attendanceColor} fw-bold">${attendanceIcon}${student.attendance}%</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info me-1" onclick="viewStudentDetails('${student.rollNo}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editStudentDetails('${student.rollNo}')" title="Edit Student">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStudentFromList('${student.rollNo}')" title="Delete Student">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
  });
  tableBody.innerHTML = rows;
}

function setupStudentFilters() {
  const searchInput = document.getElementById("studentSearchInput");
  const departmentFilter = document.getElementById("studentDepartmentFilter");
  const semesterFilter = document.getElementById("studentSemesterFilter");
  const faceStatusFilter = document.getElementById("studentFaceStatusFilter");

  const filterFunction = () => {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const department = departmentFilter?.value || "all";
    const semester = semesterFilter?.value || "all";
    const faceStatus = faceStatusFilter?.value || "all";

    let filteredStudents = [...allStudents];

    if (searchTerm) {
      filteredStudents = filteredStudents.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm) ||
          student.rollNo.toLowerCase().includes(searchTerm) ||
          student.department.toLowerCase().includes(searchTerm),
      );
    }

    if (department !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => student.department === department,
      );
    }

    if (semester !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => student.semester === semester,
      );
    }

    if (faceStatus !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => student.faceStatus === faceStatus,
      );
    }

    renderStudentsTable(filteredStudents);
  };

  if (searchInput) searchInput.addEventListener("keyup", filterFunction);
  if (departmentFilter)
    departmentFilter.addEventListener("change", filterFunction);
  if (semesterFilter) semesterFilter.addEventListener("change", filterFunction);
  if (faceStatusFilter)
    faceStatusFilter.addEventListener("change", filterFunction);
}

function toggleStudentSelection(rollNo) {
  const index = selectedStudentRollNos.indexOf(rollNo);
  if (index === -1) {
    selectedStudentRollNos.push(rollNo);
  } else {
    selectedStudentRollNos.splice(index, 1);
  }

  const selectAllCheckbox = document.getElementById("selectAllStudents");
  const allCheckboxes = document.querySelectorAll(".studentCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked =
      selectedStudentRollNos.length === allCheckboxes.length &&
      allCheckboxes.length > 0;
  }
}

function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById("selectAllStudents");
  const allCheckboxes = document.querySelectorAll(".studentCheckbox");

  if (selectAllCheckbox.checked) {
    selectedStudentRollNos = [];
    allCheckboxes.forEach((checkbox) => {
      checkbox.checked = true;
      selectedStudentRollNos.push(checkbox.value);
    });
  } else {
    selectedStudentRollNos = [];
    allCheckboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }
}

async function deleteSelectedStudents() {
  if (selectedStudentRollNos.length === 0) {
    alert("Please select at least one student to delete!");
    return;
  }

  if (
    confirm(
      `⚠️ Are you sure you want to delete ${selectedStudentRollNos.length} student(s)? This action cannot be undone.`,
    )
  ) {
    if (!USE_DUMMY_DATA && API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/bulk-delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({ rollNos: selectedStudentRollNos }),
        });
        const result = await response.json();
        if (result.success) {
          allStudents = allStudents.filter(
            (s) => !selectedStudentRollNos.includes(s.rollNo),
          );
          updateStudentsCard();
          renderStudentsTable(allStudents);
          alert(
            `✅ ${selectedStudentRollNos.length} student(s) deleted successfully!`,
          );
          selectedStudentRollNos = [];
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Failed to delete students");
      }
    } else {
      allStudents = allStudents.filter(
        (s) => !selectedStudentRollNos.includes(s.rollNo),
      );
      updateStudentsCard();
      renderStudentsTable(allStudents);
      alert(
        `✅ ${selectedStudentRollNos.length} student(s) deleted successfully!`,
      );
      selectedStudentRollNos = [];
    }
  }
}

function viewStudentDetails(rollNo) {
  const student = allStudents.find((s) => s.rollNo === rollNo);
  if (student) {
    alert(
      `👨‍🎓 Student Details:\n\nName: ${student.name}\nRoll No: ${student.rollNo}\nDepartment: ${student.department}\nSemester: ${student.semester}\nFace Status: ${student.faceStatus}\nAttendance: ${student.attendance}%\nEmail: ${student.email}\nPhone: ${student.phone}`,
    );
  } else {
    alert("Student not found!");
  }
}

function editStudentDetails(rollNo) {
  const student = allStudents.find((s) => s.rollNo === rollNo);
  if (student) {
    alert(
      `✏️ Edit Student: ${student.name}\n\n(Edit functionality will be added later)`,
    );
  }
}

async function deleteStudentFromList(rollNo) {
  if (confirm("⚠️ Are you sure you want to delete this student record?")) {
    const student = allStudents.find((s) => s.rollNo === rollNo);

    if (!USE_DUMMY_DATA && API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/students/${rollNo}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
        const result = await response.json();
        if (result.success) {
          allStudents = allStudents.filter((s) => s.rollNo !== rollNo);
          updateStudentsCard();
          renderStudentsTable(allStudents);
          alert(`✅ Student ${student?.name} deleted successfully!`);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Failed to delete student");
      }
    } else {
      allStudents = allStudents.filter((s) => s.rollNo !== rollNo);
      updateStudentsCard();
      renderStudentsTable(allStudents);
      alert(`✅ Student ${student?.name} deleted successfully!`);
    }
  }
}

function exportStudentsList() {
  const currentRows = document.querySelectorAll("#allStudentsList tr");
  let studentsToExport = [];

  if (currentRows.length > 0 && currentRows[0].cells.length > 1) {
    currentRows.forEach((row) => {
      if (row.cells[0] && row.cells[0].textContent !== "No students found") {
        studentsToExport.push({
          rollNo: row.cells[1]?.textContent || "",
          name: row.cells[2]?.querySelector("strong")?.textContent || "",
          department: row.cells[3]?.textContent || "",
          semester: row.cells[4]?.textContent || "",
          faceStatus: row.cells[5]?.textContent?.includes("Registered")
            ? "Registered"
            : "Not Set",
          attendance: row.cells[6]?.textContent?.replace(/[^0-9]/g, "") || "0",
        });
      }
    });
  } else {
    studentsToExport = allStudents;
  }

  if (studentsToExport.length === 0) {
    alert("No data to export!");
    return;
  }

  let csvContent =
    "Roll No,Student Name,Department,Semester,Face Status,Attendance (%)\n";
  studentsToExport.forEach((student) => {
    csvContent += `"${student.rollNo}","${student.name}","${student.department}","${student.semester}","${student.faceStatus}","${student.attendance}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `students_list_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("✅ Students list exported successfully!");
}

function printStudentsList() {
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
        <html>
        <head>
            <title>Students List - Tri-AI Attendance System</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h2>Students List - Tri-AI Attendance System</h2>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Total Students: ${allStudents.length}</p>
            <hr>
            <div id="print-area">${document.querySelector("#allStudentsList").parentElement.innerHTML}</div>
            <script>window.print();<\/script>
        </body>
        </html>
    `);
  printWindow.document.close();
}

function sendBulkNotification() {
  if (selectedStudentRollNos.length === 0) {
    alert("Please select at least one student to send notification!");
    return;
  }

  const message = prompt(
    "Enter notification message:",
    "Your attendance is below 75%. Please improve your attendance.",
  );

  if (message && message.trim()) {
    alert(
      `📧 Notification sent to ${selectedStudentRollNos.length} student(s):\n\n"${message}"`,
    );
  }
}

// ==================== LOW ATTENDANCE & FINES FUNCTIONS ====================

const DUMMY_LOW_ATTENDANCE = [
  {
    name: "Ali Raza",
    email: "ali@triai.edu",
    course: "IT-301",
    attendance: 65,
    fine: 5000,
  },
  {
    name: "Hamza Ahmed",
    email: "hamza@triai.edu",
    course: "IT-302",
    attendance: 45,
    fine: 10000,
  },
  {
    name: "Usman Chaudhry",
    email: "usman@triai.edu",
    course: "SE-201",
    attendance: 71,
    fine: 3000,
  },
  {
    name: "Sana Tariq",
    email: "sana@triai.edu",
    course: "DS-101",
    attendance: 62,
    fine: 5000,
  },
];

async function loadLowAttendance() {
  const tbody = document.getElementById("lowAttendanceBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin me-2"></i>Loading low attendance data...</td></tr>';

  if (!USE_DUMMY_DATA && API_BASE_URL) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/low-attendance`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        },
      );
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        renderLowAttendanceTable(result.data);
        return;
      }
    } catch (error) {
      console.error("API Error - using dummy data:", error);
    }
  }

  renderLowAttendanceTable(DUMMY_LOW_ATTENDANCE);
}

function renderLowAttendanceTable(students) {
  const tbody = document.getElementById("lowAttendanceBody");
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-success"><i class="fas fa-check-circle me-2"></i>No students with low attendance! All good!</td></tr>';
    return;
  }

  let rows = "";
  students.forEach((student) => {
    let fineColor = "";
    if (student.fine >= 10000) fineColor = "text-danger fw-bold";
    else if (student.fine >= 5000) fineColor = "text-warning fw-bold";
    else fineColor = "text-info";

    rows += `
      <tr>
        <td><strong>${student.name}</strong></td>
        <td>${student.email}</td>
        <td>${student.course}</td>
        <td class="text-danger fw-bold">${student.attendance}%</td>
        <td class="${fineColor}">Rs. ${student.fine.toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="sendFineNotification('${student.email}')">
            <i class="fas fa-bell me-1"></i>Notify
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = rows;
}

function sendFineNotification(email) {
  if (confirm(`Send fine notification to ${email}?`)) {
    alert(`✅ Notification sent to ${email}`);
  }
}

// ==================== CHART FUNCTIONS ====================

let attendanceChart = null;

const DUMMY_CHART_DATA = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  datasets: [
    {
      label: "Present Students",
      data: [820, 950, 880, 1100, 990, 750],
      borderColor: "#3498db",
      backgroundColor: "rgba(52, 152, 219, 0.1)",
      fill: true,
      tension: 0.4,
    },
  ],
};

async function fetchChartData() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/chart-data`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        return result.data;
      }
    } catch (error) {
      console.error("API Error - using dummy data:", error);
    }
  }
  return DUMMY_CHART_DATA;
}

async function initChart() {
  const chartData = await fetchChartData();
  const ctx = document.getElementById("attendanceAreaChart");

  if (!ctx) return;

  if (attendanceChart) {
    attendanceChart.destroy();
  }

  attendanceChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Present Students: ${context.raw}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Students",
          },
        },
      },
    },
  });
}

function startChartAutoRefresh() {
  if (!USE_DUMMY_DATA && API_BASE_URL) {
    setInterval(() => {
      initChart();
    }, 300000);
  }
}

// ==================== NAVIGATION FUNCTIONS ====================

function showSection(sectionId, event) {
  document
    .querySelectorAll(".content-section")
    .forEach((section) => section.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((link) => link.classList.remove("active"));

  const selectedSection = document.getElementById(sectionId);
  if (selectedSection) selectedSection.classList.add("active");

  if (event && event.currentTarget) event.currentTarget.classList.add("active");
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.clear();
    alert("Logged out successfully!");
    window.location.href = "/";
  }
}

// ==================== TABLE ACTION FUNCTIONS ====================

function deleteRow(button) {
  if (confirm("⚠️ Are you sure you want to delete this record?")) {
    const row = button.closest("tr");
    if (row) row.remove();
  }
}

function deleteTeacherRow(button) {
  if (confirm("⚠️ Are you sure you want to delete this teacher?")) {
    const row = button.closest("tr");
    if (row) row.remove();
  }
}

function viewUser(rollNo) {
  alert(`👤 Viewing student: ${rollNo}`);
}

function editUser(rollNo) {
  alert(`✏️ Editing student: ${rollNo}`);
}

function viewTeacher(name) {
  alert(`👨‍🏫 Viewing teacher: ${name}`);
}

function editTeacher(name) {
  alert(`✏️ Editing teacher: ${name}`);
}

// ==================== DOM CONTENT LOADED ====================

document.addEventListener("DOMContentLoaded", function () {
  // Initialize Tooltips
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  tooltipTriggerList.map(function (el) {
    return new bootstrap.Tooltip(el);
  });

  // Initialize Chart
  initChart();
  startChartAutoRefresh();

  // Load students data
  fetchStudentsData();
  // Load teachers data
  fetchTeachersData();
  // Load today's present data
  updateTodayPresentCard();
  // Auto refresh start karo
  startAutoRefresh();
  // Load initial alerts
  loadAlertsFromAPI();

  // ========== ADD USER FORM ==========
  const addUserForm = document.getElementById("addUserForm");
  if (addUserForm) {
    addUserForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const fullName = document.getElementById("fullName")?.value;
      const rollNo = document.getElementById("rollNo")?.value;
      const role = document.getElementById("role")?.value;
      const department = document.getElementById("department")?.value;
      const semester = document.getElementById("semester")?.value;
      const email = document.getElementById("newEmail")?.value;
      const password = document.getElementById("newPassword")?.value;

      if (!fullName || !rollNo) {
        alert("❌ Please enter Full Name and ID/Roll No!");
        return;
      }

      const result = await apiRequest("/users/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          rollNo,
          role,
          department,
          semester,
          email,
          password,
        }),
      });

      if (result.success) {
        if (role === "Student") {
          // Add to students list
          allStudents.push({
            rollNo: rollNo,
            name: fullName,
            department: department || "IT",
            semester: semester || "7th",
            faceStatus: "notset",
            attendance: 0,
            email: email || "",
            phone: "",
          });
          updateStudentsCard();

          // Also update table if modal is open
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("studentsListModal"),
          );
          if (
            modal &&
            document
              .getElementById("studentsListModal")
              .classList.contains("show")
          ) {
            renderStudentsTable(allStudents);
          }
        } else if (role === "Teacher") {
          allTeachers.push({
            id: rollNo,
            name: fullName,
            department: department || "IT",
            designation: "Lecturer",
            courses: [],
            status: "active",
            email: email || "",
            phone: "",
            joiningDate: new Date().toISOString().slice(0, 10),
            qualification: "Not specified",
          });
          updateTeachersCard();

          const modal = bootstrap.Modal.getInstance(
            document.getElementById("teachersListModal"),
          );
          if (
            modal &&
            document
              .getElementById("teachersListModal")
              .classList.contains("show")
          ) {
            renderTeachersTable(allTeachers);
          }
        }
        alert(`✅ ${role} ${fullName} added successfully!`);
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("addUserModal"),
        );
        if (modal) modal.hide();
        addUserForm.reset();
      } else {
        alert("❌ Registration failed!");
      }
    });
  }

  // ========== SEARCH FUNCTIONALITY FOR MAIN STUDENTS TABLE ==========
  const searchInput = document.querySelector('#students input[type="text"]');
  function filterStudents() {
    const searchTerm = searchInput?.value.toLowerCase() || "";
    const rows = document.querySelectorAll("#students tbody tr");
    rows.forEach((row) => {
      const rollNo = row.cells[0]?.textContent.toLowerCase() || "";
      const name = row.cells[1]?.textContent.toLowerCase() || "";
      row.style.display =
        rollNo.includes(searchTerm) || name.includes(searchTerm) ? "" : "none";
    });
  }
  if (searchInput) searchInput.addEventListener("keyup", filterStudents);

  // ========== ADD TEACHER BUTTON ==========
  const addTeacherBtn = document.querySelector("#teachers .btn-success");
  if (addTeacherBtn) {
    addTeacherBtn.addEventListener("click", function () {
      const roleSelect = document.getElementById("role");
      if (roleSelect) roleSelect.value = "Teacher";
      const modal = new bootstrap.Modal(
        document.getElementById("addUserModal"),
      );
      modal.show();
    });
  }

  // ========== ADD STUDENT BUTTON IN DASHBOARD ==========
  const addStudentBtn = document.querySelector(".add-user-btn");
  if (addStudentBtn) {
    addStudentBtn.addEventListener("click", function () {
      const roleSelect = document.getElementById("role");
      if (roleSelect) roleSelect.value = "Student";
    });
  }

  // ========== REPORT GENERATION ==========
  const downloadBtn = document.querySelector("#reports .btn-danger");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      const startDate = document.querySelector(
        '#reports input[type="date"]:first-child',
      )?.value;
      const endDate = document.querySelector(
        '#reports input[type="date"]:last-child',
      )?.value;
      if (!startDate || !endDate) {
        alert("❌ Please select both start and end dates!");
        return;
      }
      alert(`📄 Report generated for ${startDate} to ${endDate}`);
    });
  }
});
