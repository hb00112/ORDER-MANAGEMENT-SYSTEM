let username = null;
let orderCounter = 0;

document.addEventListener('DOMContentLoaded', function () {
    loadNewItemsFromFirebase().then(() => {
        console.log('Items loaded and datalist updated');
    });

    document.getElementById('usersBtn').addEventListener('click', function () {
        console.log('Users button clicked');
        showSection('users');
        loadUsers();
    });
    
    document.getElementById('approvalRequestsBtn').addEventListener('click', function () {
        console.log('Approval Requests button clicked');
        showSection('approvalRequests');
        loadApprovalRequests();
    });
    
    

    const itemSearch = document.getElementById('itemSearch');
    itemSearch.addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchValue));
        
        if (filteredItems.length > 0) {
            const selectedItem = filteredItems[0];
            showItemDetails(selectedItem);
        } else {
            const itemDetailsContainer = document.getElementById('itemDetailsContainer');
            if (itemDetailsContainer) {
                itemDetailsContainer.remove();
            }
        }
    });

    const itemList = document.getElementById('itemList');
    
    itemSearch.addEventListener('focus', () => showItems());
    itemSearch.addEventListener('input', () => showItems(itemSearch.value));

    document.addEventListener('click', function (e) {
        if (e.target !== itemSearch && !itemList.contains(e.target)) {
            itemList.style.display = 'none';
        }
    });
    
    showSection('homeScreen');
    const userNameDisplay = document.getElementById('userNameDisplay');
    userNameDisplay.textContent = username || 'User';

    checkUserStatus().then((status) => {
        switch (status) {
            case 'active':
                // User is active, allow access to the application
                break;
            case 'pending':
                document.getElementById('pendingApprovalScreen').style.display = 'flex';
                break;
            case 'new':
                registerUser();
                break;
        }
    });

    document.querySelectorAll('.nav-link, #slideMenu a[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);

            // Update active state for nav links
            document.querySelectorAll('.nav-link').forEach(navLink => navLink.classList.remove('active'));
            if (this.classList.contains('nav-link')) {
                this.classList.add('active');
            }

            // Close slide menu if it's open
            slideMenu.style.width = '0';
        });
    });

    firebase.database().ref('parties').once('value', (snapshot) => {
        const firebaseParties = snapshot.val();
        if (firebaseParties) {
            parties = parties.concat(Object.values(firebaseParties));
            parties = [...new Set(parties)]; // Remove duplicates
            sortParties(); // Sort the combined list
        }
    });

    loadPendingOrders();
    loadBillingOrders();
    loadSentOrders();

    const slideMenu = document.getElementById('slideMenu');
    const menuToggle = document.getElementById('menuToggle');
    const closeBtn = document.querySelector('.close-btn');

    closeBtn.addEventListener('click', function () {
        slideMenu.style.width = '0';
    });

    slideMenu.querySelectorAll('a[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            slideMenu.style.width = '0';
        });
    });

    menuToggle.addEventListener('click', function () {
        slideMenu.style.width = '250px';
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.querySelectorAll('.nav-link').forEach(navLink => navLink.classList.remove('active'));
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            this.classList.add('active');
        });
    });

    window.addEventListener('click', function (event) {
        if (!slideMenu.contains(event.target) && event.target !== menuToggle) {
            slideMenu.style.width = '0';
        }
    });

   
    window.addEventListener('resize', adjustForMobileView);
    adjustForMobileView();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }

    function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    }
    
// Call setupFirebaseListener when the page loads
setupFirebaseListener();
});
