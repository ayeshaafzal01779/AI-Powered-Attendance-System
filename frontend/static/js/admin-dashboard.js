// ==================== CONFIGURATION ====================
// API Base URL - JAB API READY HO TO SIRF YAHAN CHANGE KARNA
// Abhi: null means dummy data use karo
// Baad mein: "http://localhost:5000/api" likh do
const API_BASE_URL = null; // ✅ API READY HO TO SIRF YAHAN CHANGE KARNA!

// ==================== GLOBAL VARIABLES ====================
let securityAlerts = [];
let usersList = [];

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

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rowActionsCell(userId, roleLabel) {
  const safeRole = roleLabel === "Teacher" ? "Teacher" : "Student";
  return `
    <td class="text-end">
      <div class="row-actions">
        <button type="button" class="row-actions-trigger" aria-label="Actions">&#8942;</button>
        <div class="row-actions-menu">
          <button type="button" onclick="adminViewUserProfile(${userId}, '${safeRole}')">View profile</button>
          <button type="button" onclick="adminOpenEditUser(${userId}, '${safeRole}')">Edit</button>
          <button type="button" class="text-danger" onclick="adminDeleteUser(${userId}, '${safeRole}')">Delete</button>
        </div>
      </div>
    </td>
  `;
}

async function adminViewUserProfile(userId, roleLabel) {
  const response = await apiCall(`/admin_user/${userId}`);
  if (!response) return;
  const data = await response.json();
  if (data.status !== "success" || !data.user) {
    Swal.fire({
      title: "Error",
      text: data.message || "Could not load profile",
      icon: "error",
    });
    return;
  }
  const u = data.user;
  let detail = "";
  if (roleLabel === "Student") {
    detail = `
      <div class="text-start small">
        <p class="mb-1"><strong>Roll No:</strong> ${escapeHtml(u.registration_no || "-")}</p>
        <p class="mb-1"><strong>Email:</strong> ${escapeHtml(u.email || "-")}</p>
        <p class="mb-1"><strong>Phone:</strong> ${escapeHtml(u.phone || "-")}</p>
        <p class="mb-1"><strong>Department:</strong> ${escapeHtml(u.dept_name || "-")}</p>
        <p class="mb-0"><strong>Semester:</strong> ${escapeHtml(u.semester_number != null ? u.semester_number : "-")}</p>
      </div>
    `;
  } else {
    detail = `
      <div class="text-start small">
        <p class="mb-1"><strong>Employee ID:</strong> ${escapeHtml(u.employee_id || "-")}</p>
        <p class="mb-1"><strong>Email:</strong> ${escapeHtml(u.email || "-")}</p>
        <p class="mb-1"><strong>Phone:</strong> ${escapeHtml(u.phone || "-")}</p>
        <p class="mb-0"><strong>Qualification:</strong> ${escapeHtml(u.qualification || "-")}</p>
      </div>
    `;
  }
  Swal.fire({
    title: escapeHtml(u.full_name || "Profile"),
    html: detail,
    icon: "info",
    confirmButtonColor: "#2890b9",
  });
}

async function populateEditDepartments(selectedDeptId) {
  const sel = document.getElementById("editDepartment");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select department</option>';
  const response = await apiCall("/admin_departments");
  if (!response) return;
  const data = await response.json();
  if (data.status !== "success" || !Array.isArray(data.departments)) return;
  data.departments.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = String(dept.dept_id);
    opt.textContent = `${dept.dept_name} (${dept.dept_code})`;
    sel.appendChild(opt);
  });
  if (selectedDeptId != null && selectedDeptId !== "") {
    sel.value = String(selectedDeptId);
  }
}

function openEditUserModal() {
  const modalEl = document.getElementById("editUserModal");
  if (!modalEl || typeof bootstrap === "undefined") return;
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function closeEditUserModal() {
  const modalEl = document.getElementById("editUserModal");
  if (!modalEl || typeof bootstrap === "undefined") return;
  const inst = bootstrap.Modal.getInstance(modalEl);
  if (inst) inst.hide();
}

async function adminOpenEditUser(userId, roleLabel) {
  const response = await apiCall(`/admin_user/${userId}`);
  if (!response) return;
  const data = await response.json();
  if (data.status !== "success" || !data.user) {
    Swal.fire({
      title: "Error",
      text: data.message || "Could not load user",
      icon: "error",
    });
    return;
  }
  const u = data.user;
  document.getElementById("editUserId").value = String(u.user_id);
  document.getElementById("editUserRole").value = roleLabel;
  document.getElementById("editFullName").value = u.full_name || "";
  document.getElementById("editEmail").value = u.email || "";
  document.getElementById("editPhone").value = u.phone || "";
  document.getElementById("editPassword").value = "";

  const studentFields = document.getElementById("editStudentFields");
  const teacherFields = document.getElementById("editTeacherFields");
  if (roleLabel === "Student") {
    if (studentFields) studentFields.classList.remove("d-none");
    if (teacherFields) teacherFields.classList.add("d-none");
    document.getElementById("editRegistrationNo").value =
      u.registration_no || "";
    await populateEditDepartments(u.dept_id);
    const semEl = document.getElementById("editSemester");
    if (semEl) {
      semEl.value =
        u.semester_number != null && u.semester_number !== ""
          ? String(u.semester_number)
          : "";
    }
  } else {
    if (studentFields) studentFields.classList.add("d-none");
    if (teacherFields) teacherFields.classList.remove("d-none");
    document.getElementById("editEmployeeId").value = u.employee_id || "";
    document.getElementById("editQualification").value = u.qualification || "";
  }
  openEditUserModal();
}

async function adminDeleteUser(userId, roleLabel) {
  const result = await Swal.fire({
    title: "Delete user?",
    text: "This will remove the user and related records. This cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e74c3c",
    cancelButtonColor: "#95a5a6",
    confirmButtonText: "Yes, delete",
  });
  if (!result.isConfirmed) return;

  const response = await apiCall(`/admin_user/${userId}`, { method: "DELETE" });
  if (!response) return;
  const data = await response.json();
  if (!response.ok || data.status !== "success") {
    Swal.fire({
      title: "Error",
      text: data.message || "Delete failed",
      icon: "error",
    });
    return;
  }
  Swal.fire({
    title: "Deleted",
    icon: "success",
    confirmButtonColor: "#27ae60",
    timer: 1400,
    showConfirmButton: false,
  });
  if (roleLabel === "Student") loadStudents();
  else loadTeachers();
  loadStats();
}

async function submitEditUserForm(event) {
  event.preventDefault();
  const id = document.getElementById("editUserId")?.value;
  const roleLabel = document.getElementById("editUserRole")?.value;
  if (!id || !roleLabel) return;

  const full_name = document.getElementById("editFullName")?.value.trim();
  const email = document.getElementById("editEmail")?.value.trim();
  const phone = document.getElementById("editPhone")?.value.trim();
  const password = document.getElementById("editPassword")?.value || "";

  const payload = { full_name, email, phone: phone || null };
  if (password) payload.password = password;

  if (roleLabel === "Student") {
    payload.registration_no = document
      .getElementById("editRegistrationNo")
      ?.value.trim();
    payload.department_id = document.getElementById("editDepartment")?.value;
    payload.semester_number = document.getElementById("editSemester")?.value;
  } else {
    payload.employee_id = document
      .getElementById("editEmployeeId")
      ?.value.trim();
    payload.qualification = document
      .getElementById("editQualification")
      ?.value.trim();
  }

  const btn = document.querySelector("#editUserForm button[type='submit']");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    const response = await apiCall(`/admin_user/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!response) return;
    const data = await response.json();
    if (!response.ok || data.status !== "success") {
      Swal.fire({
        title: "Error",
        text: data.message || "Update failed",
        icon: "error",
      });
      return;
    }
    closeEditUserModal();
    Swal.fire({
      title: "Saved",
      icon: "success",
      confirmButtonColor: "#27ae60",
      timer: 1200,
      showConfirmButton: false,
    });
    if (roleLabel === "Student") loadStudents();
    else loadTeachers();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save changes";
    }
  }
}

function initEditUserForm() {
  const form = document.getElementById("editUserForm");
  if (form) form.addEventListener("submit", submitEditUserForm);
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
  // AGAR API READY HAI TO REAL DATA LEKAR AAYEGA
  if (API_BASE_URL !== null) {
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

  // AGAR API READY NAHI HAI TO DUMMY DATA USE KARO
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

    // Agar color coding chahiye to:
    const percentage = data.percentage;
    if (percentage < 75) {
      percentageElement.classList.add("text-danger");
      percentageElement.classList.remove("text-success");
    } else if (percentage < 85) {
      percentageElement.classList.add("text-warning");
      percentageElement.classList.remove("text-danger", "text-success");
    } else {
      Swal.fire({
        title: "Error!",
        text: data.message || "Kuch masla hua hai!",
        icon: "error",
        confirmButtonColor: "#e74c3c",
      });
    }
  });
}

// ============================================
// LOAD FINES HISTORY (ADMIN)
// ============================================
async function loadFinesHistory() {
  const tbody = document.getElementById("finesHistoryBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  const response = await apiCall("/admin_fines_list");
  if (!response) return;

  const data = await response.json();
  tbody.innerHTML = "";

  if (!data.fines || data.fines.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted">Koi fine record nahi mila</td></tr>';
    return;
  }

  data.fines.forEach((f) => {
    const row = tbody.insertRow();
    const statusColor = f.status === "Paid" ? "success" : "danger";
    const statusIcon =
      f.status === "Paid"
        ? '<i class="fas fa-check-circle me-1"></i>'
        : '<i class="fas fa-clock me-1"></i>';

    row.innerHTML = `
      <td>
        <strong>${f.full_name}</strong><br>
        <small class="text-muted">${f.email}</small>
      </td>
      <td>
        <strong>${f.course_code}</strong><br>
        <small class="text-muted">${f.course_name}</small>
      </td>
      <td>
        <span class="badge bg-warning text-dark">${f.attendance_percentage}%</span>
      </td>
      <td><strong>Rs. ${f.fine_amount}</strong></td>
      <td>
        <span class="badge bg-${statusColor} px-3 py-2">
          ${statusIcon}${f.status}
        </span>
      </td>
      <td>${f.issued_date || "-"}</td>
      <td>${f.paid_date || "-"}</td>
    `;
  });
}

// ============================================
// LOAD STATS
// ============================================

async function loadStats() {
  try {
    const response = await apiCall("/admin_stats");
    if (!response) return;

    const data = await response.json();

    if (data.status === "success") {
      if (document.getElementById("totalStudents"))
        document.getElementById("totalStudents").textContent =
          data.total_students || 0;
      if (document.getElementById("totalTeachers"))
        document.getElementById("totalTeachers").textContent =
          data.total_teachers || 0;
      if (document.getElementById("totalCourses"))
        document.getElementById("totalCourses").textContent =
          data.total_courses || 0;
      if (document.getElementById("totalSessions"))
        document.getElementById("totalSessions").textContent =
          data.total_sessions || 0;
    }
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents() {
  const tbody = document.getElementById("studentsTableBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const response = await apiCall("/admin_students");
    if (!response) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Failed to connect</td></tr>';
      return;
    }

    const data = await response.json();
    if (data.status !== "success") {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger">Error loading students</td></tr>';
      return;
    }

  // CSV format mein data banao
  let csvContent = "Roll No,Student Name,Department,Time,Mode\n";
  data.presentStudents.forEach((student) => {
    csvContent += `${student.rollNo},${student.name},${student.department},${student.time},${student.mode}\n`;
  });

  // CSV file download karo
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

// Real-time update ke liye (every 5 minutes agar API ready ho to)
function startAutoRefresh() {
  if (API_BASE_URL !== null) {
    setInterval(() => {
      updateTodayPresentCard();
    }, 300000); // 5 minutes = 300,000 milliseconds
  }
}

// ==================== TEACHERS LIST FUNCTIONS ====================

// DUMMY DATA FOR TEACHERS (JAB TAK API NAHI HAI)
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

// Teachers data store karne ke liye
let allTeachers = [];

// Dashboard stats update karne ke liye
async function fetchTeachersData() {
  // AGAR API READY HAI TO REAL DATA LEKAR AAYEGA
  if (API_BASE_URL !== null) {
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

  // AGAR API READY NAHI HAI TO DUMMY DATA USE KARO
  allTeachers = DUMMY_TEACHERS;
  updateTeachersCard();
  return allTeachers;
}

// Dashboard card update karne ka function
async function updateTeachersCard() {
  const data = await fetchTeachersData();
  const countElement = document.getElementById("totalTeachersCount");
  const subtextElement = document.getElementById("totalTeachersSubtext");

  if (countElement) {
    const activeCount = data.filter(
      (teacher) => teacher.status === "active",
    ).length;
    countElement.textContent = data.length;
  }
  if (sectionId === "students") loadStudents();
  if (sectionId === "teachers") loadTeachers();
  if (sectionId === "departments") showDepartmentsView();

  setSidebarActive(sectionId);
}

// ============================================
// LOGOUT
// ============================================

// ============================================
// DEPARTMENTS -> SEMESTERS -> COURSES (ADMIN)
// ============================================
let selectedDepartmentId = null;
let selectedSemesterId = null;
let selectedDepartmentLabelText = "";
let selectedSemesterLabelText = "";

function showDepartmentsView() {
  selectedDepartmentId = null;
  selectedSemesterId = null;
  selectedDepartmentLabelText = "";
  selectedSemesterLabelText = "";

  const departmentsPage = document.getElementById("departmentsPage");
  const semestersPage = document.getElementById("semestersPage");
  const coursesPage = document.getElementById("coursesPage");

  if (departmentsPage) departmentsPage.classList.remove("d-none");
  if (semestersPage) semestersPage.classList.add("d-none");
  if (coursesPage) coursesPage.classList.add("d-none");

  loadDepartmentsTable();
}

function goBackToDepartments() {
  showDepartmentsView();
}

function goBackToSemesters() {
  if (!selectedDepartmentId) {
    showDepartmentsView();
    return;
  }
  loadSemestersTable(selectedDepartmentId);
}

async function loadDepartmentsTable() {
  const departmentsTableBody = document.getElementById("departmentsTableBody");
  if (departmentsTableBody) {
    departmentsTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted py-4">Loading...</td>
      </tr>
    `;
  }

  try {
    const response = await apiCall("/admin_departments");
    if (!response) return;

    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.departments)) {
      throw new Error("Invalid departments response");
    }

    if (!departmentsTableBody) return;

    if (data.departments.length === 0) {
      departmentsTableBody.innerHTML = `
        <tr><td colspan="3" class="text-center text-muted py-4">No departments found</td></tr>
      `;
      return;
    }

    departmentsTableBody.innerHTML = "";
    data.departments.forEach((dept) => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${dept.dept_code}</td>
        <td>${dept.dept_name}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary">
            View Semesters
          </button>
        </td>
      `;
      tr.onclick = () => {
        selectedDepartmentId = dept.dept_id;
        selectedDepartmentLabelText = `${dept.dept_code} - ${dept.dept_name}`;
        loadSemestersTable(dept.dept_id);
      };
      departmentsTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading departments:", err);
    if (departmentsTableBody) {
      departmentsTableBody.innerHTML = `
        <tr><td colspan="3" class="text-center text-danger py-4">Unable to load departments</td></tr>
      `;
    }
  }
}

async function loadSemestersTable(deptId) {
  selectedDepartmentId = deptId;
  selectedSemesterId = null;

  const departmentsPage = document.getElementById("departmentsPage");
  const semestersPage = document.getElementById("semestersPage");
  const coursesPage = document.getElementById("coursesPage");

  if (departmentsPage) departmentsPage.classList.add("d-none");
  if (semestersPage) semestersPage.classList.remove("d-none");
  if (coursesPage) coursesPage.classList.add("d-none");

  const selectedDepartmentLabelEl = document.getElementById(
    "selectedDepartmentLabel",
  );
  if (selectedDepartmentLabelEl) {
    selectedDepartmentLabelEl.textContent =
      selectedDepartmentLabelText || `Department ID: ${deptId}`;
  }

  const semestersTableBody = document.getElementById("semestersTableBody");
  const coursesTableBody = document.getElementById("coursesTableBody");

  if (semestersTableBody) {
    semestersTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">Loading...</td>
      </tr>
    `;
  }
  if (coursesTableBody) {
    coursesTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted py-4">Select a semester</td></tr>
    `;
  }

  try {
    const response = await apiCall(
      `/admin_semesters?dept_id=${encodeURIComponent(deptId)}`,
    );
    if (!response) return;

    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.semesters)) {
      throw new Error("Invalid semesters response");
    }

    if (!semestersTableBody) return;

    if (data.semesters.length === 0) {
      semestersTableBody.innerHTML = `
        <tr><td colspan="5" class="text-center text-muted py-4">No semesters found</td></tr>
      `;
      return;
    }

    semestersTableBody.innerHTML = "";
    data.semesters.forEach((sem) => {
      const label = sem.semester_name
        ? `${sem.semester_name} (${sem.semester_number})`
        : `Semester ${sem.semester_number}`;

      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${sem.semester_number}</td>
        <td>${label}</td>
        <td>${sem.start_date || "-"}</td>
        <td>${sem.end_date || "-"}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary">
            View Courses
          </button>
        </td>
      `;
      tr.onclick = () => {
        selectedSemesterId = sem.sem_id;
        selectedSemesterLabelText = label;
        loadCoursesTable(sem.sem_id);
      };
      semestersTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading semesters:", err);
    if (semestersTableBody) {
      semestersTableBody.innerHTML = `
        <tr><td colspan="5" class="text-center text-danger py-4">Unable to load semesters</td></tr>
      `;
    }
  }
}

async function loadCoursesTable(semId) {
  selectedSemesterId = semId;

  const semestersPage = document.getElementById("semestersPage");
  const coursesPage = document.getElementById("coursesPage");
  if (semestersPage) semestersPage.classList.add("d-none");
  if (coursesPage) coursesPage.classList.remove("d-none");

  const selectedSemesterLabelEl = document.getElementById(
    "selectedSemesterLabel",
  );
  if (selectedSemesterLabelEl) {
    selectedSemesterLabelEl.textContent =
      selectedSemesterLabelText || `Semester ID: ${semId}`;
  }

  const coursesTableBody = document.getElementById("coursesTableBody");
  if (coursesTableBody) {
    coursesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">Loading...</td></tr>`;
  }

  try {
    const response = await apiCall(
      `/admin_courses?sem_id=${encodeURIComponent(semId)}`,
    );
    if (!response) return;

    // Status check pehle
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();

    //  Loose check
    if (data.status !== "success") {
      throw new Error(data.message || "Failed to load courses");
    }

    const courses = data.courses || [];

    if (!coursesTableBody) return;

    if (courses.length === 0) {
      coursesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No courses found for this semester</td></tr>`;
      return;
    }

    coursesTableBody.innerHTML = "";
    courses.forEach((course) => {
      // course_type use karo, is_compulsory fallback
      const courseTypeLabel =
        course.course_type ||
        (course.is_compulsory ? "Compulsory" : "Elective");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${course.course_code || "-"}</td>
        <td>${course.course_name || "-"}</td>
        <td>${course.credit_hours ?? "-"}</td>
        <td>${courseTypeLabel}</td>
      `;
      coursesTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    if (coursesTableBody) {
      coursesTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error: ${err.message}</td></tr>`;
    }
  }
}
function logout() {
  localStorage.clear();
  window.location.href = "/";
}

// ============================================
// REPORTS
// ============================================

async function generateReport() {
  const startDate = document.getElementById("reportStartDate")?.value;
  const endDate = document.getElementById("reportEndDate")?.value;
  const formatSelect = document.getElementById("reportFormat");
  const format = formatSelect?.value || "pdf";

  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  if (startDate > endDate) {
    alert("Start date cannot be after end date.");
    return;
  }

  const button = document.querySelector("#reports button.btn.btn-danger");
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
  }

  try {
    const queryString = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&format=${encodeURIComponent(format)}`;
    const candidateUrls = [
      `/admin_reports_download?${queryString}`,
      `/generate_report?${queryString}`,
      `/admin_report_download?${queryString}`,
      `/download_report?${queryString}`,
    ];

    let response = null;
    const triedStatuses = [];
    for (const url of candidateUrls) {
      const candidateResponse = await apiCall(url, { method: "GET" });
      if (!candidateResponse) continue;
      triedStatuses.push(`${url} -> ${candidateResponse.status}`);
      if (candidateResponse.status !== 404) {
        response = candidateResponse;
        break;
      }
    }

    if (!response) {
      alert(
        "Report endpoint not reachable. Please restart backend server and try again.",
      );
      console.error("All report endpoints unreachable.", triedStatuses);
      return;
    }

    if (!response.ok) {
      let message = `Report download failed (${response.status})`;
      try {
        const errData = await response.json();
        if (errData?.message) message = errData.message;
      } catch (_err) {
        // Ignore JSON parsing error and keep fallback message.
      }
      alert(message);
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const errData = await response.json();
      alert(errData?.message || "Report generation failed.");
      return;
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      alert("Generated file is empty. Please check selected date range.");
      return;
    }

    const ext = format === "excel" ? "xlsx" : "pdf";
    const downloadName = `attendance_report_${startDate}_to_${endDate}.${ext}`;

    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = downloadName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 3000);
  } catch (err) {
    console.error("Error generating report:", err);
    alert("Unable to generate report right now.");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = "Download Report";
    }
  }
}

function ensureReportFormatOptions() {
  let select = document.getElementById("reportFormat");
  if (!select) {
    const reportsSection = document.getElementById("reports");
    const endDateInput = document.getElementById("reportEndDate");
    if (reportsSection && endDateInput && endDateInput.parentElement) {
      select = document.createElement("select");
      select.id = "reportFormat";
      select.className = "form-select w-25";
      endDateInput.parentElement.insertBefore(select, endDateInput.nextSibling);
    } else {
      return;
    }
  }

  const existingValues = Array.from(select.options).map(
    (option) => option.value,
  );
  if (!existingValues.includes("pdf")) {
    const pdfOption = document.createElement("option");
    pdfOption.value = "pdf";
    pdfOption.textContent = "PDF";
    select.appendChild(pdfOption);
  }
  if (!existingValues.includes("excel")) {
    const excelOption = document.createElement("option");
    excelOption.value = "excel";
    excelOption.textContent = "Excel";
    select.appendChild(excelOption);
  }
}

// ============================================
// ADD USER
// ============================================

function resetAddUserForm() {
  const form = document.getElementById("addUserForm");
  if (form) form.reset();
  updateRoleSpecificFields();
}

function closeAddUserModal() {
  const modalEl = document.getElementById("addUserModal");
  if (!modalEl || typeof bootstrap === "undefined") return;
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
}

async function submitAddUserForm(event) {
  event.preventDefault();

  const nameEl = document.getElementById("newName");
  const emailEl = document.getElementById("newEmail");
  const passwordEl = document.getElementById("newPassword");
  const roleEl = document.getElementById("newRole");
  const rollNoEl = document.getElementById("newRollNo");
  const departmentEl = document.getElementById("newDepartment");
  const semesterEl = document.getElementById("newSemester");
  const employeeIdEl = document.getElementById("newEmployeeId");
  const teacherCourseEl = document.getElementById("newTeacherCourseCode");
  const qualificationEl = document.getElementById("newQualification");

  const full_name = nameEl?.value.trim();
  const email = emailEl?.value.trim();
  const password = passwordEl?.value || "";
  const role = roleEl?.value;
  const registration_no = rollNoEl?.value.trim();
  const department_id = departmentEl?.value;
  const semester_number = semesterEl?.value;
  const employee_id = employeeIdEl?.value.trim();
  const course_code = teacherCourseEl?.value.trim();
  const qualification = qualificationEl?.value.trim();

  if (!full_name || !email || !password || !role) {
    alert("Please fill all required fields.");
    return;
  }

  if (role === "Student" && !registration_no) {
    alert("Roll No is required for Student.");
    return;
  }

  if (role === "Student" && !department_id) {
    alert("Department is required for Student.");
    return;
  }

  if (role === "Student" && !semester_number) {
    alert("Semester is required for Student.");
    return;
  }

  if (role === "Teacher" && !employee_id) {
    alert("Employee ID is required for Teacher.");
    return;
  }

  if (role === "Teacher" && !course_code) {
    alert("Course code is required for Teacher.");
    return;
  }

  const submitBtn = document.querySelector(
    "#addUserForm button[type='submit']",
  );
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const response = await apiCall("/admin_add_user", {
      method: "POST",
      body: JSON.stringify({
        full_name,
        email,
        password,
        role,
        registration_no: role === "Student" ? registration_no : "",
        department_id: role === "Student" ? department_id : "",
        semester_number: role === "Student" ? semester_number : "",
        employee_id: role === "Teacher" ? employee_id : "",
        course_code: role === "Teacher" ? course_code : "",
        qualification: role === "Teacher" ? qualification : "",
      }),
    });

    if (!response) return;

    let data = null;
    try {
      data = await response.json();
    } catch (parseErr) {
      const rawText = await response.text();
      throw new Error(
        `Server returned non-JSON response (${response.status}). ${rawText?.slice(0, 120) || ""}`,
      );
    }

    if (!response.ok) {
      const serverMessage =
        data?.message || `Request failed with status ${response.status}`;
      if (typeof Swal !== "undefined") {
        Swal.fire({
          title: "Error",
          text: serverMessage,
          icon: "error",
          confirmButtonColor: "#e74c3c",
        });
      } else {
        alert(serverMessage);
      }
      return;
    }

    if (data.status === "success") {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          title: "User Added",
          text: `${role} account created successfully.`,
          icon: "success",
          confirmButtonColor: "#27ae60",
        });
      } else {
        alert(`${role} account created successfully.`);
      }

      closeAddUserModal();
      resetAddUserForm();
      loadStats();
      if (role === "Student") loadStudents();
      if (role === "Teacher") loadTeachers();
    } else if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Error",
        text: data.message || "Unable to add user.",
        icon: "error",
        confirmButtonColor: "#e74c3c",
      });
    } else {
      alert(data.message || "Unable to add user.");
    }
  } catch (err) {
    console.error("Add user error:", err);
    alert(
      err?.message ||
        "Unable to add user right now. Please check backend server logs.",
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "REGISTER";
    }
  }
}

async function loadDepartments() {
  const departmentEl = document.getElementById("newDepartment");
  if (!departmentEl) return;

  try {
    const response = await apiCall("/admin_departments");
    if (!response) return;
    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.departments)) return;

    departmentEl.innerHTML = '<option value="">Select department</option>';
    data.departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = String(dept.dept_id);
      option.textContent = `${dept.dept_name} (${dept.dept_code})`;
      departmentEl.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading departments:", err);
  }
}

function updateRoleSpecificFields() {
  const roleEl = document.getElementById("newRole");
  const rollGroup = document.getElementById("studentRollGroup");
  const departmentGroup = document.getElementById("studentDepartmentGroup");
  const semesterGroup = document.getElementById("studentSemesterGroup");
  const employeeGroup = document.getElementById("teacherEmployeeGroup");
  const teacherCourseGroup = document.getElementById("teacherCourseGroup");
  const qualificationGroup = document.getElementById(
    "teacherQualificationGroup",
  );
  const rollNoEl = document.getElementById("newRollNo");
  const departmentEl = document.getElementById("newDepartment");
  const semesterEl = document.getElementById("newSemester");
  const employeeIdEl = document.getElementById("newEmployeeId");
  const teacherCourseEl = document.getElementById("newTeacherCourseCode");

  if (!roleEl) return;
  const selectedRole = roleEl.value;

  if (selectedRole === "Teacher") {
    if (rollGroup) rollGroup.classList.add("d-none");
    if (departmentGroup) departmentGroup.classList.add("d-none");
    if (semesterGroup) semesterGroup.classList.add("d-none");
    if (employeeGroup) employeeGroup.classList.remove("d-none");
    if (teacherCourseGroup) teacherCourseGroup.classList.remove("d-none");
    if (qualificationGroup) qualificationGroup.classList.remove("d-none");
    if (rollNoEl) {
      rollNoEl.required = false;
      rollNoEl.value = "";
    }
    if (departmentEl) {
      departmentEl.required = false;
      departmentEl.value = "";
    }
    if (semesterEl) {
      semesterEl.required = false;
      semesterEl.value = "";
    }
    if (employeeIdEl) employeeIdEl.required = true;
    if (teacherCourseEl) teacherCourseEl.required = true;
  } else {
    if (rollGroup) rollGroup.classList.remove("d-none");
    if (departmentGroup) departmentGroup.classList.remove("d-none");
    if (semesterGroup) semesterGroup.classList.remove("d-none");
    if (employeeGroup) employeeGroup.classList.add("d-none");
    if (teacherCourseGroup) teacherCourseGroup.classList.add("d-none");
    if (qualificationGroup) qualificationGroup.classList.add("d-none");
    if (rollNoEl) rollNoEl.required = true;
    if (departmentEl) departmentEl.required = true;
    if (semesterEl) semesterEl.required = true;
    if (employeeIdEl) {
      employeeIdEl.required = false;
      employeeIdEl.value = "";
    }
    if (teacherCourseEl) {
      teacherCourseEl.required = false;
      teacherCourseEl.value = "";
    }
  }
}

function initAddUserForm() {
  const form = document.getElementById("addUserForm");
  const roleEl = document.getElementById("newRole");
  if (!form) return;
  form.addEventListener("submit", submitAddUserForm);
  if (roleEl) {
    roleEl.addEventListener("change", updateRoleSpecificFields);
  }
  loadDepartments();
  updateRoleSpecificFields();
}

// ============================================
// CHART
// ============================================

let statsChart = null;

function renderChart(labels, values, trendMeta = []) {
  const ctx = document.getElementById("attendanceAreaChart");
  if (!ctx) return;

  if (statsChart) {
    statsChart.destroy();
  }

  statsChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Attendance Rate",
          data: values,
          borderColor: "#3498db",
          backgroundColor: "rgba(52, 152, 219, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              const percentage = Number(context.parsed.y || 0).toFixed(2);
              const meta = trendMeta[context.dataIndex] || {};
              const present = Number(meta.present_count || 0);
              const total = Number(meta.total_students || 0);
              return `Attendance: ${percentage}% (${present}/${total})`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: "Percentage (%)" },
        },
      },
    },
  });
}

async function loadAttendanceTrendChart() {
  try {
    const response = await apiCall("/admin_attendance_trend");
    if (!response) return;

    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.trend)) {
      renderChart(
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        [0, 0, 0, 0, 0, 0, 0],
        [],
      );
      return;
    }

    const labels = data.trend.map((item) => item.label);
    const values = data.trend.map((item) => Number(item.percentage) || 0);
    renderChart(labels, values, data.trend);
  } catch (err) {
    console.error("Error loading attendance trend chart:", err);
    renderChart(
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      [0, 0, 0, 0, 0, 0, 0],
      [],
    );
  }
}

// ============================================
// FACE DATA SYNC
// ============================================
async function startDatasetSync() {
  const syncBtn = document.getElementById("syncBtn");
  const syncStatus = document.getElementById("syncStatus");
  const syncResultsWrapper = document.getElementById("syncResultsWrapper");
  const syncResults = document.getElementById("syncResults");
  const syncBadge = document.getElementById("syncBadge");

  syncBtn.disabled = true;
  syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  syncStatus.classList.remove("d-none");
  syncResultsWrapper.classList.add("d-none");
  syncResults.innerHTML = "";

  if (syncBadge) {
    syncBadge.className = "sync-badge processing";
    syncBadge.innerHTML =
      '<i class="fas fa-spinner fa-spin me-1"></i> Processing';
  }

  try {
    const response = await apiCall("/api/admin/sync_faces", {
      method: "POST",
    });

    if (!response) throw new Error("No response from server");
    const data = await response.json();

    if (data.status === "success") {
      syncResultsWrapper.classList.remove("d-none");

      data.results.forEach((msg) => {
        const div = document.createElement("div");

        if (
          msg.includes("✅") ||
          msg.includes("successfully") ||
          msg.includes("Success")
        ) {
          div.className = "sync-log-item success";
        } else if (
          msg.includes("⚠️") ||
          msg.includes("already exists") ||
          msg.includes("skipped")
        ) {
          div.className = "sync-log-item warning";
        } else if (
          msg.includes("❌") ||
          msg.includes("failed") ||
          msg.includes("error")
        ) {
          div.className = "sync-log-item error";
        } else {
          div.className = "sync-log-item info";
        }

        div.innerHTML = `<span class="sync-log-dot"></span> ${msg}`;
        syncResults.appendChild(div);
      });

      Swal.fire({
        title: "Synchronization Complete",
        text: "Student face datasets have been processed successfully.",
        icon: "success",
        confirmButtonColor: "#2c3e50",
        customClass: {
          popup: "custom-swal",
        },
      });

      updateFaceStats();
    } else {
      throw new Error(data.message || "Unknown error occurred");
    }
  } catch (err) {
    console.error("Sync error:", err);
    Swal.fire({
      title: "Synchronization Failed",
      text: err.message || "An unexpected error occurred",
      icon: "error",
      confirmButtonColor: "#2c3e50",
      customClass: {
        popup: "custom-swal",
      },
    });
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Start Synchronization';
    syncStatus.classList.add("d-none");

    if (syncBadge) {
      syncBadge.className = "sync-badge ready";
      syncBadge.innerHTML =
        '<i class="fas fa-circle me-1" style="font-size: 6px;"></i> Ready';
    }
  }
}
async function updateFaceStats() {
  try {
    const response = await apiCall("/api/admin/face_stats");
    if (!response) return;
    const data = await response.json();
    if (data.status === "success") {
      document.getElementById("statStudentCount").textContent =
        data.student_count;
      document.getElementById("statFaceCount").textContent = data.total_faces;
    }
  } catch (err) {
    console.error("Error fetching face stats:", err);
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
