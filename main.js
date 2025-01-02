let username = null;
let orderCounter = 0;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize core menu items
    const requiredSections = ['bso', 'orderapprove'];
    requiredSections.forEach(sectionId => {
        ensureSectionInMenu(sectionId);
    });

    function ensureSectionInMenu(sectionId) {
        const slideMenu = document.getElementById('slideMenu');
        const existingLink = slideMenu.querySelector(`a[data-section="${sectionId}"]`);
        
        if (!existingLink) {
            const newLink = document.createElement('a');
            newLink.href = '#';
            newLink.setAttribute('data-section', sectionId);
            newLink.textContent = sectionId === 'bso' ? 'Base Stock Order' : 'Order Approval';
            
            // Insert before PDF Editor (last item)
            const pdfLink = slideMenu.querySelector('a[data-section="pdf"]');
            if (pdfLink) {
                slideMenu.insertBefore(newLink, pdfLink);
            } else {
                slideMenu.appendChild(newLink);
            }
        }
    }

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
                break;
            case 'pending':
                document.getElementById('pendingApprovalScreen').style.display = 'flex';
                break;
            case 'new':
                registerUser();
                break;
        }
    });

    const slideMenu = document.getElementById('slideMenu');
    const menuToggle = document.getElementById('menuToggle');
    const closeBtn = document.querySelector('.close-btn');

    // Unified section handling
    function showSection(sectionId) {
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Update active states
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }

    // Menu navigation setup
    document.querySelectorAll('.nav-link, #slideMenu a[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
            slideMenu.style.width = '0';
        });
    });

    firebase.database().ref('parties').once('value', (snapshot) => {
        const firebaseParties = snapshot.val();
        if (firebaseParties) {
            parties = parties.concat(Object.values(firebaseParties));
            parties = [...new Set(parties)];
            sortParties();
        }
    });

    loadPendingOrders();
    loadBillingOrders();
    loadSentOrders();

    closeBtn.addEventListener('click', () => {
        slideMenu.style.width = '0';
    });

    menuToggle.addEventListener('click', () => {
        slideMenu.style.width = '250px';
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

    setupFirebaseListener();
});
