document.addEventListener("DOMContentLoaded", function () {

    
    // USER NAME LOAD
    const name = localStorage.getItem("username");
    if (name) {
        document.getElementById("userName").innerText = name;
    }

    // CHART CODE
    const canvas = document.getElementById("attendanceChart");
    const ctx = canvas.getContext("2d");

    new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Sep", "Oct", "Nov", "Dec", "Jan"],
            datasets: [{
                label: "Attendance %",
                data: [78, 82, 85, 88, 91], // STATIC DATA
                borderColor: "#2980b9",
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

});

function markQR() {
    alert("Attendance marked successfully using QR Code.");
}

function markFace() {
    alert("Face verified. Attendance marked successfully.");
}

function logout() {
    if(confirm("Are you sure you want to logout?")) {
        window.location.href = "index.html";
    }
}

