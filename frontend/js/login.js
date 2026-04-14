
function login() {
    const role = document.getElementById("role").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (role === "" || username === "" || password=== "") {
        alert("Please enter name and select role");
        return;
    }

    // NAME SAVE KAR DO
    localStorage.setItem("username", username);
    localStorage.setItem("role", role);

    if (role === "student") {
        window.location.href = "student-dashboard.html";
    } else if (role === "teacher") {
        window.location.href = "teacher-dashboard.html";
    } else if (role === "admin") {
        window.location.href = "admin-dashboard.html";
    }
}

