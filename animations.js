const hcText = document.querySelector('.hc-text');
let gradientAngle = 0;

function updateGradient() {
    gradientAngle += 1; // Adjust the speed by changing the increment
    hcText.style.backgroundImage = `linear-gradient(${gradientAngle}deg, #8B0000, #0000FF)`;
}

setInterval(updateGradient, 50); // Update every 50 milliseconds (adjust as needed)

function adjustForMobileView() {
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.table').forEach(table => {
            table.classList.add('table-responsive');
        });
    } else {
        document.querySelectorAll('.table').forEach(table => {
            table.classList.remove('table-responsive');
        });
    }
}

// Scroll to the top when the page loads
window.onload = function() {
    window.scrollTo(0, 0); // Scrolls to the top-left corner of the page
};
