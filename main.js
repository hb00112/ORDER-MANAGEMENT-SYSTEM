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
    // Hide all sections including pending section
    document.querySelectorAll('.section, .pending-section').forEach(section => {
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

    function updateGreeting() {
        const hour = new Date().getHours();
        let greeting;
        
        if (hour < 12) greeting = "Good morning";
        else if (hour < 18) greeting = "Good afternoon";
        else greeting = "Good evening";
        
        document.getElementById('greetingText').textContent = greeting;
    }

    // Generate User Avatar Initial
    function updateUserAvatar() {
        const username = localStorage.getItem('username') || 'User';
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = username.charAt(0).toUpperCase();
        
        // Generate a color based on username
        const colors = ['#667eea', '#764ba2', '#ff4757', '#2ed573', '#ffa502'];
        const colorIndex = username.length % colors.length;
        avatar.style.background = colors[colorIndex];
        avatar.style.color = 'white';
    }

    // Load Recent Activity
    function loadRecentActivity() {
        // Simulated data - replace with actual data from your system
        const activities = [
            { party: "Fashion Trends", items: 12, time: "2h ago" },
            { party: "Urban Styles", items: 8, time: "5h ago" },
            { party: "Elite Boutique", items: 15, time: "Yesterday" },
            { party: "Trendsetters", items: 5, time: "Yesterday" },
            { party: "Modern Wear", items: 10, time: "2 days ago" }
        ];
        
        const container = document.getElementById('recentActivityList');
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-party">${activity.party}</div>
                <div class="activity-meta">
                    <span>${activity.items} items</span>
                    <span>${activity.time}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                // Add functionality to view this order
                console.log(`Viewing order from ${activity.party}`);
            });
            container.appendChild(item);
        });
    }

    // Initialize welcome screen
    function initWelcomeScreen() {
        // Reset body margins and padding
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        
        // Update greeting
        updateGreeting();
        
        // Update user avatar
        updateUserAvatar();
        
        // Load recent activity
        loadRecentActivity();
        
        // Set username display
        const username = localStorage.getItem('username') || 'User';
        document.getElementById('userNameDisplay').textContent = username;
        
        // Add click handlers for action cards
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                switchSection(section);
            });
        });
        
        // Adjust welcome screen positioning
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.marginTop = '0';
            welcomeScreen.style.paddingTop = '0';
        }
        
        // Adjust navbar positioning
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.marginBottom = '0';
        }
        
        // Adjust welcome content container
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.style.marginTop = '0';
            welcomeContent.style.paddingTop = '20px'; // Adjust as needed
        }
        
        // Adjust quick actions container
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.style.marginTop = '20px'; // Adjust as needed
        }
    }

    // Example section switching function
    function switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(sectionId).classList.add('active');
    }
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initWelcomeScreen();
    });
    const newOrderCard = document.querySelector('.action-card[data-section="orders"]');
    if (newOrderCard) {
        newOrderCard.addEventListener('click', function() {
            // Get the section id from the card
            const sectionId = this.getAttribute('data-section');
            
            // Call the same showSection function that the nav links use
            showSection(sectionId);
            
            // Also update the active state of the corresponding nav link
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            const navLink = document.querySelector(`.nav-link[data-section="orders"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
        });
    }

    const newPending = document.querySelector('.action-card[data-section="pendingOrders"]');
    if (newPending) {
        newPending.addEventListener('click', function() {
            // Get the section id from the card
            const sectionId = this.getAttribute('data-section');
            
            // Call the same showSection function that the nav links use
            showSection(sectionId);
            
            // Also update the active state of the corresponding nav link
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            const navLink = document.querySelector(`.nav-link[data-section="pendingOrders"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
        });
    }

    const newBilling = document.querySelector('.action-card[data-section="billing"]');
    if (newBilling) {
        newBilling.addEventListener('click', function() {
            // Get the section id from the card
            const sectionId = this.getAttribute('data-section');
            
            // Call the same showSection function that the nav links use
            showSection(sectionId);
            
            // Also update the active state of the corresponding nav link
            document.querySelectorAll('.nav-link').forEach(navLink => {
                navLink.classList.remove('active');
            });
            
            const navLink = document.querySelector(`.nav-link[data-section="billing"]`);
            if (navLink) {
                navLink.classList.add('active');
            }
        });
    }
    const stockCard = document.querySelector('.action-card[data-section="stock"]');
if (stockCard) {
    stockCard.addEventListener('click', function() {
        // Get the section id from the card
        const sectionId = this.getAttribute('data-section');
        
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show the stock section
        const stockSection = document.getElementById('stock');
        if (stockSection) {
            stockSection.style.display = 'block';
        }
        
        // Close the slide menu if it's open
        const slideMenu = document.getElementById('slideMenu');
        if (slideMenu) {
            slideMenu.style.width = '0';
        }
    });
}
});
