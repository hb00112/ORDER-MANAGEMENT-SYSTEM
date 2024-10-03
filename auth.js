function registerUser() {
    let usernameModal = new bootstrap.Modal(document.getElementById('usernameModal'), {
        backdrop: 'static',
        keyboard: false
    });
    usernameModal.show();

    document.getElementById('saveUsername').addEventListener('click', function () {
        let inputUsername = document.getElementById('usernameInput').value.trim();
        if (inputUsername) {
            if (inputUsername.toUpperCase() === 'HEMANT') {
                // Ask for password
                let password = prompt("Please enter the admin password:");
                if (password === '9284494154') {
                    // Correct password, set as admin
                    let adminUsername = "HEMANT(ADMIN)";
                    localStorage.setItem('hcUsername', adminUsername);
                    username = adminUsername;
                    document.getElementById('userNameDisplay').textContent = username;
                    console.log('Welcome, Administrator ' + username);
                    usernameModal.hide();
                    // You might want to update the UI or redirect the admin user here
                } else {
                    alert('Incorrect password. Proceeding with regular registration.');
                    proceedWithRegularRegistration(inputUsername);
                }
            } else {
                proceedWithRegularRegistration(inputUsername);
            }
        } else {
            alert('Please enter a valid username.');
        }
    });
}

function proceedWithRegularRegistration(inputUsername) {
    // Regular registration process
    document.getElementById('usernameModal').classList.add('d-none');
    document.body.innerHTML += '<div class="fullscreen-overlay" id="loadingOverlay"><div class="approval-content"><h1>Submitting Request</h1><div class="loading-animation"><div class="circle"></div><div class="circle"></div><div class="circle"></div></div></div></div>';

    firebase.database().ref('approvalRequests').push(inputUsername).then(() => {
        localStorage.setItem('hcUsername', inputUsername);
        logActivity('New user registration request', inputUsername);

        // Remove loading overlay and show pending approval screen
        document.getElementById('loadingOverlay').remove();
        document.getElementById('pendingApprovalScreen').style.display = 'flex';
    });
}

function checkUserStatus() {
    return new Promise((resolve, reject) => {
        const storedUsername = localStorage.getItem('hcUsername');
        if (storedUsername) {
            if (storedUsername === 'HEMANT(ADMIN)') {
                // For HEMANT(ADMIN), we assume they've already been validated during registration
                username = storedUsername;
                document.getElementById('userNameDisplay').textContent = username;
                console.log('Welcome back, Administrator ' + username);
                resolve('active');
            } else {
                firebase.database().ref('users').once('value', (snapshot) => {
                    const users = snapshot.val();
                    if (users && Object.values(users).includes(storedUsername)) {
                        username = storedUsername;
                        document.getElementById('userNameDisplay').textContent = username;
                        console.log('Welcome back, ' + username);
                        resolve('active');
                    } else {
                        firebase.database().ref('approvalRequests').once('value', (snapshot) => {
                            const requests = snapshot.val();
                            if (requests && Object.values(requests).includes(storedUsername)) {
                                resolve('pending');
                            } else {
                                localStorage.removeItem('hcUsername');
                                resolve('new');
                            }
                        });
                    }
                });
            }
        } else {
            resolve('new');
        }
    });
}