function loadUsers() {
    const usersBody = document.getElementById('usersBody');
    usersBody.innerHTML = '';

    firebase.database().ref('users').once('value', (snapshot) => {
        const users = snapshot.val();
        if (users) {
            Object.entries(users).forEach(([key, value]) => {
                const row = document.createElement('tr');
                const isCurrentUser = value === username;
                row.innerHTML = `
        <td>${value}${isCurrentUser ? ' (me)' : ''}</td>
        <td>
            ${isCurrentUser ? '' : `<button class="btn btn-sm btn-danger delete-user" data-key="${key}">Delete</button>`}
        </td>
    `;
                usersBody.appendChild(row);
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-user').forEach(button => {
                button.addEventListener('click', function () {
                    const key = this.getAttribute('data-key');
                    deleteUser(key);
                });
            });
        }
    });
}

function deleteUser(key) {
    // Create the modal HTML
    const modalHtml = `
<div class="modal fade" id="passwordModal" tabindex="-1" role="dialog" aria-labelledby="passwordModalLabel" aria-hidden="true">
<div class="modal-dialog modal-dialog-centered" role="document">
<div class="modal-content">
<div class="modal-header bg-primary text-white">
<h5 class="modal-title" id="passwordModalLabel">Authentication Required</h5>
<button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
  <span aria-hidden="true">&times;</span>
</button>
</div>
<div class="modal-body">
<p class="mb-3">Please enter your password to proceed with the delete action.</p>
<div class="form-group">
  <label for="passwordInput" class="sr-only">Password</label>
  <input type="password" id="passwordInput" class="form-control" placeholder="Enter password">
  <div id="passwordError" class="invalid-feedback">
    Incorrect password. Please try again.
  </div>
</div>
</div>
<div class="modal-footer">
<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
<button type="button" class="btn btn-primary" id="submitPassword">Submit</button>
</div>
</div>
</div>
</div>
`;

    // Append the modal to the body if it doesn't exist
    if (!document.getElementById('passwordModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('passwordModal'));
    modal.show();

    // Handle close button
    document.querySelector('#passwordModal .close').addEventListener('click', () => {
        modal.hide();
    });

    // Handle cancel button
    document.querySelector('#passwordModal .btn-secondary').addEventListener('click', () => {
        modal.hide();
    });

    // Handle password submission
    document.getElementById('submitPassword').onclick = function () {
        const passwordInput = document.getElementById('passwordInput');
        const password = passwordInput.value;
        if (password === '9284494154') {
            modal.hide();
            passwordInput.value = ''; // Clear the password

            firebase.database().ref('users').child(key).once('value', (snapshot) => {
                const deletedUsername = snapshot.val();
                firebase.database().ref('users').child(key).remove().then(() => {
                    loadUsers();
                    logActivity('Deleted user', deletedUsername);

                    // If the deleted user is the current user, clear localStorage and reload
                    if (deletedUsername === username) {
                        localStorage.removeItem('hcUsername');
                        location.reload();
                    }
                }).catch(error => {
                    console.error("Error deleting user:", error);
                });
            });
        } else {
            passwordInput.classList.add('is-invalid');
            document.getElementById('passwordError').style.display = 'block';
        }
    };

    // Reset error state when input changes
    document.getElementById('passwordInput').addEventListener('input', function () {
        this.classList.remove('is-invalid');
        document.getElementById('passwordError').style.display = 'none';
    });

    // Clear password when modal is hidden
    document.getElementById('passwordModal').addEventListener('hidden.bs.modal', function () {
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').classList.remove('is-invalid');
        document.getElementById('passwordError').style.display = 'none';
    });
}
function loadApprovalRequests() {
    const approvalRequestsBody = document.getElementById('approvalRequestsBody');
    approvalRequestsBody.innerHTML = '';

    firebase.database().ref('approvalRequests').once('value', (snapshot) => {
        const requests = snapshot.val();
        const hasRequests = requests !== null && Object.keys(requests).length > 0;
        
        // Update notification dots
        updateNotificationDots(hasRequests);
        
        if (requests) {
            Object.entries(requests).forEach(([key, value]) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${value}</td>
                    <td>
                        <button class="btn btn-sm btn-success approve-user" data-key="${key}">Approve</button>
                        <button class="btn btn-sm btn-danger reject-user" data-key="${key}">Reject</button>
                    </td>
                `;
                approvalRequestsBody.appendChild(row);
            });

            // Add event listeners for approve and reject buttons
            document.querySelectorAll('.approve-user, .reject-user').forEach(button => {
                button.addEventListener('click', function () {
                    const key = this.getAttribute('data-key');
                    const action = this.classList.contains('approve-user') ? 'approve' : 'reject';
                    handleApprovalRequest(key, action);
                });
            });
        }
    });
}


function handleApprovalRequest(key, action) {
    // Create the modal HTML
    const modalHtml = `
        <div class="modal fade" id="passwordModal2" tabindex="-1" role="dialog" aria-labelledby="passwordModalLabel2" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="passwordModalLabel2">Authentication Required</h5>
                        <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3">Please enter your password to proceed with the ${action} action.</p>
                        <div class="form-group">
                            <label for="passwordInput2" class="sr-only">Password</label>
                            <input type="password" id="passwordInput2" class="form-control" placeholder="Enter password">
                            <div id="passwordError2" class="invalid-feedback">
                                Incorrect password. Please try again.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitPassword2">Submit</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append the modal to the body if it doesn't exist
    if (!document.getElementById('passwordModal2')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('passwordModal2'));
    modal.show();

    // Handle close button
    document.querySelector('#passwordModal2 .close').addEventListener('click', () => {
        modal.hide();
    });

    // Handle cancel button
    document.querySelector('#passwordModal2 .btn-secondary').addEventListener('click', () => {
        modal.hide();
    });

    // Handle password submission
    document.getElementById('submitPassword2').onclick = function () {
        const passwordInput = document.getElementById('passwordInput2');
        const password = passwordInput.value;
        if (password === '9284494154') {
            modal.hide();
            passwordInput.value = ''; // Clear the password

            if (action === 'approve') {
                firebase.database().ref('approvalRequests').child(key).once('value', (snapshot) => {
                    const username = snapshot.val();
                    firebase.database().ref('users').push(username).then(() => {
                        firebase.database().ref('approvalRequests').child(key).remove().then(() => {
                            loadApprovalRequests(); // This will update the dots as well
                            logActivity('Approved user', username);
                        });
                    });
                });
            } else {
                firebase.database().ref('approvalRequests').child(key).remove().then(() => {
                    loadApprovalRequests(); // This will update the dots as well
                    logActivity('Rejected user', key);
                });
            }
        } else {
            passwordInput.classList.add('is-invalid');
            document.getElementById('passwordError2').style.display = 'block';
        }
    };

    // Reset error state when input changes
    document.getElementById('passwordInput2').addEventListener('input', function () {
        this.classList.remove('is-invalid');
        document.getElementById('passwordError2').style.display = 'none';
    });

    // Clear password when modal is hidden
    document.getElementById('passwordModal2').addEventListener('hidden.bs.modal', function () {
        document.getElementById('passwordInput2').value = '';
        document.getElementById('passwordInput2').classList.remove('is-invalid');
        document.getElementById('passwordError2').style.display = 'none';
    });
}

// Add real-time listener for approval requests
function initializeApprovalRequestsListener() {
    firebase.database().ref('approvalRequests').on('value', (snapshot) => {
        const hasRequests = snapshot.val() !== null && Object.keys(snapshot.val() || {}).length > 0;
        updateNotificationDots(hasRequests);
    });
}

// Call this function when your app initializes
initializeApprovalRequestsListener();

function updateNotificationDots(hasRequests) {
    // Update dot in sidebar
    const sidebarLink = document.querySelector('a[data-section="userManagement"]');
    sidebarLink.classList.toggle('notification-dot', hasRequests);
    sidebarLink.classList.toggle('has-notifications', hasRequests);
    
    // Update dot on approval requests button
    const approvalBtn = document.getElementById('approvalRequestsBtn');
    approvalBtn.classList.toggle('notification-dot', hasRequests);
    approvalBtn.classList.toggle('has-notifications', hasRequests);
    
    // Update dot on menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.toggle('has-notifications', hasRequests);
    }
}
