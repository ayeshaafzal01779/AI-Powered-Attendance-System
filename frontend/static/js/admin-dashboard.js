// ============================================
// ADMIN DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = "http://" + window.location.hostname + ":5000";

// Get user from localStorage
const user = JSON.parse(localStorage.getItem("user"));
const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

// ========== DATATABLE INSTANCES ==========
let studentsDataTable = null;
let teachersDataTable = null;

// Role check
if (!user || !userId || userRole !== "Admin") {
  alert("Access Denied. Admin only.");
  window.location.href = "/";
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
// LOW ATTENDANCE & FINES
// ============================================

async function loadLowAttendance() {
  const tbody = document.getElementById("lowAttendanceBody");
  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  const response = await apiCall("/admin_low_attendance");
  if (!response) return;

  const data = await response.json();
  tbody.innerHTML = "";

  if (!data.students || data.students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-success"><i class="fas fa-check-circle me-2"></i>No students with low attendance!</td></tr>';
    return;
  }

  data.students.forEach((s) => {
    const row = tbody.insertRow();
    const color = s.percentage < 50 ? "danger" : "warning";
    const alreadyIssued = s.fine_status === "Pending";

    row.innerHTML = `
      <td><strong>${s.full_name}</strong><br>
          <small class="text-muted">${s.email}</small></td>
      <td>${s.course_code}<br>
          <small class="text-muted">${s.course_name}</small></td>
      <td><span class="badge bg-${color} fs-6">${s.percentage}%</span></td>
      <td>${s.present_days} / ${s.total_sessions} classes</td>
      <td><strong>Rs. 500</strong></td>
      <td>
        ${
          alreadyIssued
            ? `<span class="badge bg-warning text-dark px-3 py-2 fs-6">
               <i class="fas fa-clock me-1"></i> Pending
             </span>`
            : `<button class="btn btn-danger btn-sm px-3"
               onclick="issueFine(${s.user_id}, '${s.course_code}', '${s.course_name}', ${s.percentage})">
               <i class="fas fa-gavel me-1"></i> Issue Fine
             </button>`
        }
      </td>
    `;
  });
}

// ============================================
// ISSUR FINE (ADMIN)
// ============================================

async function issueFine(studentId, courseCode, courseName, percentage) {
  Swal.fire({
    title: "Issue Fine?",
    html: `<b>${courseName}</b><br>Course: <b>${courseCode}</b><br>Fine Amount: <b>Rs. 500</b>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e74c3c",
    cancelButtonColor: "#95a5a6",
    confirmButtonText: "Yes, Issue Fine!",
    cancelButtonText: "Cancel",
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    const response = await apiCall("/admin_issue_fine", {
      method: "POST",
      body: JSON.stringify({
        student_id: studentId,
        course_code: courseCode,
        course_name: courseName,
        percentage: percentage,
      }),
    });

    if (!response) return;
    const data = await response.json();

    if (data.status === "success") {
      Swal.fire({
        title: "Fine Issued!",
        text: "Fine issued successfully. Student ko email bhi bhej di gayi hai.",
        icon: "success",
        confirmButtonColor: "#27ae60",
      }).then(() => {
        // Dono tables refresh karo
        loadLowAttendance();
        loadFinesHistory();
      });
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
    '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const response = await apiCall("/admin_students");
    if (!response) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger">Failed to connect</td></tr>';
      return;
    }

    const data = await response.json();
    if (data.status !== "success") {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-danger">Error loading students</td></tr>';
      return;
    }

    // Destroy existing DataTable
    if (studentsDataTable) {
      studentsDataTable.destroy();
      studentsDataTable = null;
    }

    tbody.innerHTML = "";

    if (!data.students || data.students.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">No students found</td></tr>';
    } else {
      data.students.forEach((student) => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${student.registration_no || "-"}</td>
          <td>${student.full_name}</td>
          <td>${student.email}</td>
          <td>${student.dept_name || "-"}</td>
          <td><span class="badge bg-success">Active</span></td>
        `;
      });
    }

    // Initialize DataTable
    studentsDataTable = new simpleDatatables.DataTable("#studentsTable", {
      perPage: 10,
      perPageSelect: [5, 10, 20, 50],
      searchable: true,
      sortable: true,
      labels: {
        placeholder: "Search students...",
        perPage: "{select} entries per page",
        noRows: "No students found",
        info: "Showing {start} to {end} of {rows} entries",
      },
    });
    // ✅ ADD THIS CODE - Force Black Header
    setTimeout(() => {
      document
        .querySelectorAll("#studentsTable_wrapper .dataTable-table thead th")
        .forEach((th) => {
          th.style.backgroundColor = "#212529";
          th.style.color = "#ffffff";
          th.style.fontWeight = "600";
        });
    }, 50);
  } catch (err) {
    console.error("Error loading students:", err);
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Error loading students</td></tr>';
  }
}

// ============================================
// LOAD TEACHERS
// ============================================

async function loadTeachers() {
  const tbody = document.getElementById("teachersTableBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  try {
    const response = await apiCall("/admin_teachers");
    if (!response) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-danger">Failed to connect</td></tr>';
      return;
    }

    const data = await response.json();
    if (data.status !== "success") {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-danger">Error loading teachers</td></tr>';
      return;
    }

    // Destroy existing DataTable
    if (teachersDataTable) {
      teachersDataTable.destroy();
      teachersDataTable = null;
    }

    tbody.innerHTML = "";

    if (!data.teachers || data.teachers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center text-muted">No teachers found</td></tr>';
    } else {
      data.teachers.forEach((teacher) => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${teacher.employee_id || "-"}</td>
          <td>${teacher.full_name}</td>
          <td>${teacher.email}</td>
          <td>${teacher.qualification || "-"}</td>
        `;
      });
    }

    // Initialize DataTable
    teachersDataTable = new simpleDatatables.DataTable("#teachersTable", {
      perPage: 10,
      perPageSelect: [5, 10, 20, 50],
      searchable: true,
      sortable: true,
      labels: {
        placeholder: "Search teachers...",
        perPage: "{select} entries per page",
        noRows: "No teachers found",
        info: "Showing {start} to {end} of {rows} entries",
      },
    });

    setTimeout(() => {
      document
        .querySelectorAll("#teachersTable_wrapper .dataTable-table thead th")
        .forEach((th) => {
          th.style.backgroundColor = "#212529";
          th.style.color = "#ffffff";
          th.style.fontWeight = "600";
        });
    }, 50);
  } catch (err) {
    console.error("Error loading teachers:", err);
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-danger">Error loading teachers</td></tr>';
  }
}
m;
// ============================================
// SECTION NAVIGATION
// ============================================

function setSidebarActive(sectionId) {
  const sidebarLinks = document.querySelectorAll(".sidebar .nav-link");
  sidebarLinks.forEach((link) => link.classList.remove("active"));

  const activeLink = Array.from(sidebarLinks).find((link) => {
    const onclick = link.getAttribute("onclick") || "";
    return onclick.includes(`showSection('${sectionId}')`);
  });

  if (activeLink) activeLink.classList.add("active");
}

function showSection(sectionId) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  const activeSection = document.getElementById(sectionId);
  if (activeSection) activeSection.classList.add("active");

  if (sectionId === "fines") {
    loadLowAttendance();
    loadFinesHistory();
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
    coursesTableBody.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted py-4">Loading...</td></tr>
    `;
  }

  try {
    const response = await apiCall(
      `/admin_courses?sem_id=${encodeURIComponent(semId)}`,
    );
    if (!response) return;

    const data = await response.json();
    if (data.status !== "success" || !Array.isArray(data.courses)) {
      throw new Error("Invalid courses response");
    }

    if (!coursesTableBody) return;

    if (data.courses.length === 0) {
      coursesTableBody.innerHTML = `
        <tr><td colspan="4" class="text-center text-muted py-4">No courses found</td></tr>
      `;
      return;
    }

    coursesTableBody.innerHTML = "";
    data.courses.forEach((course) => {
      const courseTypeLabel = course.is_compulsory ? "Compulsory" : "Elective";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${course.course_code}</td>
        <td>${course.course_name}</td>
        <td>${course.credit_hours ?? "-"}</td>
        <td>${courseTypeLabel}</td>
      `;
      coursesTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading courses:", err);
    if (coursesTableBody) {
      coursesTableBody.innerHTML = `
        <tr><td colspan="4" class="text-center text-danger py-4">Unable to load courses</td></tr>
      `;
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
  const syncResults = document.getElementById("syncResults");

  // Reset UI
  syncBtn.disabled = true;
  syncStatus.classList.remove("d-none");
  syncResults.classList.add("d-none");
  syncResults.innerHTML = "";

  try {
    const response = await apiCall("/api/admin/sync_faces", {
      method: "POST",
    });

    if (!response) throw new Error("No response from server");
    const data = await response.json();

    if (data.status === "success") {
      syncResults.classList.remove("d-none");
      data.results.forEach((msg) => {
        const div = document.createElement("div");
        div.style.padding = "5px 10px";
        div.style.marginBottom = "2px";
        div.style.borderRadius = "4px";
        div.style.backgroundColor = msg.includes("✅")
          ? "#e8f5e9"
          : msg.includes("⚠️")
            ? "#fff3e0"
            : "#ffebee";
        div.style.color = msg.includes("✅")
          ? "#2e7d32"
          : msg.includes("⚠️")
            ? "#ef6c00"
            : "#c62828";
        div.style.borderLeft = `4px solid ${msg.includes("✅") ? "#4caf50" : msg.includes("⚠️") ? "#ff9800" : "#f44336"}`;
        div.textContent = msg;
        syncResults.appendChild(div);
      });

      Swal.fire({
        title: "Sync Finished!",
        text: "Student dataset has been processed.",
        icon: "success",
        confirmButtonColor: "#27ae60",
      });
      updateFaceStats();
    } else {
      throw new Error(data.message || "Unknown error occurred");
    }
  } catch (err) {
    console.error("Sync error:", err);
    Swal.fire({
      title: "Sync Failed",
      text: err.message,
      icon: "error",
      confirmButtonColor: "#e74c3c",
    });
  } finally {
    syncBtn.disabled = false;
    syncStatus.classList.add("d-none");
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

// Update showSection to refresh stats when face-sync is clicked
const originalShowSection = window.showSection;
window.showSection = function (sectionId) {
  if (sectionId === "face-sync") {
    updateFaceStats();
  }
  if (typeof originalShowSection === "function") {
    originalShowSection(sectionId);
  } else {
    // Fallback if original is not accessible
    document
      .querySelectorAll(".content-section")
      .forEach((s) => s.classList.add("hidden"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove("hidden");
  }
};

// ============================================
// INITIALIZE
// ============================================

loadStats();
loadAttendanceTrendChart();
initAddUserForm();
ensureReportFormatOptions();
