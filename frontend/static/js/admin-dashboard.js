// ============================================
// ADMIN DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = "http://" + window.location.hostname + ":5000";

// Get user from localStorage
const user = JSON.parse(localStorage.getItem("user"));
const userId = localStorage.getItem("userId");
const userRole = localStorage.getItem("userRole");

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

  if (data.students.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-success">No students with low attendance!</td></tr>';
    return;
  }

  data.students.forEach((s) => {
    const row = tbody.insertRow();
    const color = s.percentage < 50 ? "danger" : "warning";
    row.innerHTML = `
            <td><strong>${s.full_name}</strong></td>
            <td>${s.email}</td>
            <td>${s.course_code} - ${s.course_name}</td>
            <td>
                <span class="badge bg-${color} fs-6">
                    ${s.percentage}%
                </span>
            </td>
            <td><strong>Rs. 500</strong></td>
            <td>
                <button class="btn btn-danger btn-sm" 
                    onclick="issueFine(${s.user_id}, '${s.course_code}', '${s.course_name}', ${s.percentage})">
                    <i class="fas fa-gavel me-1"></i> Issue Fine
                </button>
            </td>
        `;
  });
}

async function issueFine(studentId, courseCode, courseName, percentage) {
  Swal.fire({
    title: "Issue Fine?",
    html: `<b>${courseCode}</b> - Issue a fine of <b>Rs. 500</b> for low attendance?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e74c3c",
    cancelButtonColor: "#95a5a6",
    confirmButtonText: "Yes, Issue!",
    cancelButtonText: "Cancel",
  }).then(async (result) => {
    if (result.isConfirmed) {
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
          text: "Fine successfully issue ho gayi!",
          icon: "success",
          confirmButtonColor: "#27ae60",
        });
        loadLowAttendance();
      } else {
        Swal.fire({
          title: "Error!",
          text: data.message || "Any Problem Happened!",
          icon: "error",
          confirmButtonColor: "#e74c3c",
        });
      }
    }
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
  try {
    const response = await apiCall("/admin_students");
    if (!response) return;

    const data = await response.json();

    if (data.status === "success") {
      const tbody = document.getElementById("studentsTableBody");
      if (!tbody) return;

      tbody.innerHTML = "";

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
  } catch (err) {
    console.error("Error loading students:", err);
  }
}

// ============================================
// LOAD TEACHERS
// ============================================

async function loadTeachers() {
  try {
    const response = await apiCall("/admin_teachers");
    if (!response) return;

    const data = await response.json();

    if (data.status === "success") {
      const tbody = document.getElementById("teachersTableBody");
      if (!tbody) return;

      tbody.innerHTML = "";

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
  } catch (err) {
    console.error("Error loading teachers:", err);
  }
}

// ============================================
// SECTION NAVIGATION
// ============================================

function showSection(sectionId) {
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  const activeSection = document.getElementById(sectionId);
  if (activeSection) activeSection.classList.add("active");

  if (sectionId === "fines") loadLowAttendance();
  if (sectionId === "students") loadStudents();
  if (sectionId === "teachers") loadTeachers();
}

// ============================================
// LOGOUT
// ============================================

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

  const button = document.querySelector('#reports button.btn.btn-danger');
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

  const existingValues = Array.from(select.options).map((option) => option.value);
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
  const employeeIdEl = document.getElementById("newEmployeeId");
  const qualificationEl = document.getElementById("newQualification");

  const full_name = nameEl?.value.trim();
  const email = emailEl?.value.trim();
  const password = passwordEl?.value || "";
  const role = roleEl?.value;
  const registration_no = rollNoEl?.value.trim();
  const department_id = departmentEl?.value;
  const employee_id = employeeIdEl?.value.trim();
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

  if (role === "Teacher" && !employee_id) {
    alert("Employee ID is required for Teacher.");
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
        employee_id: role === "Teacher" ? employee_id : "",
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
  const employeeGroup = document.getElementById("teacherEmployeeGroup");
  const qualificationGroup = document.getElementById("teacherQualificationGroup");
  const rollNoEl = document.getElementById("newRollNo");
  const departmentEl = document.getElementById("newDepartment");
  const employeeIdEl = document.getElementById("newEmployeeId");

  if (!roleEl) return;
  const selectedRole = roleEl.value;

  if (selectedRole === "Teacher") {
    if (rollGroup) rollGroup.classList.add("d-none");
    if (departmentGroup) departmentGroup.classList.add("d-none");
    if (employeeGroup) employeeGroup.classList.remove("d-none");
    if (qualificationGroup) qualificationGroup.classList.remove("d-none");
    if (rollNoEl) {
      rollNoEl.required = false;
      rollNoEl.value = "";
    }
    if (departmentEl) {
      departmentEl.required = false;
      departmentEl.value = "";
    }
    if (employeeIdEl) employeeIdEl.required = true;
  } else {
    if (rollGroup) rollGroup.classList.remove("d-none");
    if (departmentGroup) departmentGroup.classList.remove("d-none");
    if (employeeGroup) employeeGroup.classList.add("d-none");
    if (qualificationGroup) qualificationGroup.classList.add("d-none");
    if (rollNoEl) rollNoEl.required = true;
    if (departmentEl) departmentEl.required = true;
    if (employeeIdEl) {
      employeeIdEl.required = false;
      employeeIdEl.value = "";
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
// INITIALIZE
// ============================================

loadStats();
loadAttendanceTrendChart();
initAddUserForm();
ensureReportFormatOptions();
