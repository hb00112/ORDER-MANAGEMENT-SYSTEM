/// Party data array - Add parties with either coordinates OR location link
const partyData = [
    {
        partyName: "ABC Company - Station A",
        coordinates: {
            lat: 18.5204,
            lng: 73.8567
        },
        locationLink: null
    },
    {
        partyName: "Baron - Panjim",
        coordinates: {
            lat: 15.498072678766361,
            lng: 73.82542972334339
        },
        locationLink: null
    },
    {
        partyName: "XYZ Company - Station B",
        coordinates: null,
        locationLink: null
    }
];

// Function to parse party name and station
function parsePartyString(partyString) {
    const [name, station] = partyString.split(' - ');
    return { name, station };
}

// Function to open map
function openMap(index) {
    const party = partyData[index];
    if (party.locationLink) {
        window.open(party.locationLink, '_blank');
    } else if (party.coordinates) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${party.coordinates.lat},${party.coordinates.lng}`, '_blank');
    }
}

function getCurrentLocationAndSendMessage(partyName) {
    let map = null;
    let marker = null;
    let selectedPosition = null;

    // Create modal elements
    const modalHTML = `
        <div class="location-picker-modal-overlay">
            <div class="location-picker-modal-container">
                <h3 class="location-picker-modal-title">Select Location</h3>
                <div class="location-picker-loading">
                    Getting your current location...
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.querySelector('.location-picker-modal-container');

    function createCustomIcon() {
        return L.divIcon({
            className: 'custom-map-marker',
            html: `
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="8" fill="#2563eb"/>
                    <circle cx="20" cy="20" r="6" fill="white"/>
                    <circle cx="20" cy="20" r="4" fill="#2563eb"/>
                </svg>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    }

    function initializeMap(position) {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-accuracy-banner">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Drag the marker or click on the map to adjust location
                </div>
            </div>
            <div class="location-picker-content">
                <div id="location-picker-map" class="location-picker-map-canvas"></div>
            </div>
            <div class="location-picker-button-wrapper">
                <button class="location-picker-button location-picker-button-cancel" onclick="window.closeLocationPicker()">Cancel</button>
                <button class="location-picker-button location-picker-button-confirm" onclick="window.sendSelectedLocation()">Send Location</button>
            </div>
        `;

        // Initialize map
        map = L.map('location-picker-map', {
            zoomControl: false
        }).setView([position.lat, position.lng], 17);

        // Add tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);

        // Add custom marker
        marker = L.marker([position.lat, position.lng], {
            draggable: true,
            icon: createCustomIcon()
        }).addTo(map);

        selectedPosition = position;

        // Handle marker drag
        marker.on('dragend', function(event) {
            const pos = marker.getLatLng();
            selectedPosition = {
                lat: pos.lat,
                lng: pos.lng
            };
        });

        // Handle map click
        map.on('click', function(event) {
            const pos = event.latlng;
            marker.setLatLng(pos);
            selectedPosition = {
                lat: pos.lat,
                lng: pos.lng
            };
        });

        // Add zoom controls
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Add recenter button
        const locationButton = L.control({position: 'bottomright'});
        locationButton.onAdd = function(map) {
            const btn = L.DomUtil.create('button', 'custom-map-button');
            btn.innerHTML = '📍';
            btn.style.cssText = `
                width: 34px;
                height: 34px;
                background: white;
                border: 2px solid rgba(0,0,0,0.2);
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 10px;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            btn.onclick = function() {
                map.setView([position.lat, position.lng], 17);
                marker.setLatLng([position.lat, position.lng]);
                selectedPosition = position;
            };
            
            return btn;
        };
        locationButton.addTo(map);

        // Force map to update its size
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }

    function showError(message) {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Location Error</h3>
            <div class="location-picker-error">
                ${message}
                <br>
                <button onclick="window.retryGeolocation()" class="location-picker-retry-button">
                    Try Again
                </button>
            </div>
            <div class="location-picker-button-wrapper">
                <button class="location-picker-button location-picker-button-cancel" onclick="window.closeLocationPicker()">
                    Cancel
                </button>
            </div>
        `;
    }

    function getLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    initializeMap(pos);
                },
                function(error) {
                    let errorMsg = "Could not get your location. ";
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg += "Please enable location access in your browser settings.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg += "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMsg += "Location request timed out.";
                            break;
                        default:
                            errorMsg += "An unknown error occurred.";
                    }
                    showError(errorMsg);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            showError("Geolocation is not supported by your browser.");
        }
    }

    // Start getting location
    getLocation();

    // Global functions
    window.closeLocationPicker = function() {
        if (map) {
            map.remove();
        }
        document.querySelector('.location-picker-modal-overlay').remove();
    };

    window.retryGeolocation = function() {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-loading">
                Getting your current location...
            </div>
        `;
        getLocation();
    };

    window.sendSelectedLocation = function() {
        if (selectedPosition) {
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${selectedPosition.lat},${selectedPosition.lng}`;
            const message = `Dear Sir,\n\n`
                + `kindly add the below location for ${partyName}\n\n`
                + `Location Link: ${mapsLink}\n\n`
                + `thank you`;
            
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/919284494154?text=${encodedMessage}`, '_blank');
            closeLocationPicker();
        } else {
            alert("Please select a location first");
        }
    };
}

// Function to create table rows
function populateTable() {
    const tableBody = document.getElementById('partyTableBody');
    tableBody.innerHTML = '';

    partyData.forEach((party, index) => {
        const { name, station } = parsePartyString(party.partyName);
        const row = document.createElement('tr');
        
        const hasNoLocation = !party.coordinates && !party.locationLink;
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${station}</td>
            <td>
                ${hasNoLocation ? 
                    `<span class="party-location-picker-trigger" 
                           onclick="getCurrentLocationAndSendMessage('${party.partyName}')"
                           style="cursor: pointer; color: #2563eb; text-decoration: underline;"
                           title="Click to pick location">
                        Select location on map
                    </span>` : 
                    `<span class="party-location-view-trigger" 
                           onclick="openMap(${index})"
                           style="cursor: pointer;"
                           title="Click to open map">
                        📍
                    </span>`
                }
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Initial population of table
document.addEventListener('DOMContentLoaded', () => {
    populateTable();
});











// unwanted but impt code
function loadItemMaster() {
    const itemMasterBody = document.getElementById('itemMasterBody');
    itemMasterBody.innerHTML = '';

    // Predefined items
    const predefinedItems = [
        { name: "o.e 2pccs", category: ["mix", "1pcs", "2pcs"], sizes: ["s", "m", "l", "xl", "2xl"] },
        { name: "reply", sizes: ["s", "m", "l", "xl", "2xl"] },
        { name: "clasz", sizes: ["45", "50", "55", "60", "65", "70", "75"] },
        { name: "salsa", sizes: ["45", "50", "55", "60", "65", "70", "75"] }
    ];

    // Load predefined items
    predefinedItems.forEach((item, index) => {
        addItemToTable(item, index, true);
    });

    // Load custom items from Firebase
    firebase.database().ref('items').once('value', (snapshot) => {
        const firebaseItems = snapshot.val();
        if (firebaseItems) {
            Object.entries(firebaseItems).forEach(([key, item]) => {
                if (!predefinedItems.some(predefined => predefined.name === item.name)) {
                    addItemToTable(item, key, false);
                }
            });
        }
    });

    function addItemToTable(item, key, isPredefined) {
        const row = document.createElement('tr');
        row.innerHTML = `
<td>${item.name}</td>
<td>${item.category ? item.category.join(', ') : 'N/A'}</td>
<td>${item.sizes ? item.sizes.join(', ') : 'N/A'}</td>
<td>
    ${isPredefined ? '' : `
        <button class="btn btn-sm btn-primary edit-item" data-key="${key}">Edit</button>
        <button class="btn btn-sm btn-danger delete-item" data-key="${key}">Delete</button>
    `}
</td>
`;
        itemMasterBody.appendChild(row);

        if (!isPredefined) {
            row.querySelector('.edit-item').addEventListener('click', () => editItem(key));
            row.querySelector('.delete-item').addEventListener('click', () => deleteItem(key));
        }
    }
}

// Function to edit an item
function editItem(key) {
    firebase.database().ref('items').child(key).once('value', (snapshot) => {
        const item = snapshot.val();
        if (item) {
            const newName = prompt('Enter new item name:', item.name);
            if (newName && newName !== item.name) {
                item.name = newName;
                firebase.database().ref('items').child(key).set(item).then(() => {
                    loadItemMaster();
                    logActivity('Edited item name', username, `${item.name} to ${newName}`);
                }).catch(error => {
                    console.error("Error updating item:", error);
                    alert("Error updating item. Please try again.");
                });
            }
        } else {
            console.error("Item not found");
            alert("Item not found. Please refresh and try again.");
        }
    });
}

// Function to delete an item
function deleteItem(key) {
    if (confirm('Are you sure you want to delete this item?')) {
        firebase.database().ref('items').child(key).once('value', (snapshot) => {
            const item = snapshot.val();
            if (item) {
                firebase.database().ref('items').child(key).remove().then(() => {
                    loadItemMaster();
                    logActivity('Deleted item', username, item.name);
                }).catch(error => {
                    console.error("Error deleting item:", error);
                    alert("Error deleting item. Please try again.");
                });
            } else {
                console.error("Item not found");
                alert("Item not found. Please refresh and try again.");
            }
        });
    }
}

function showItems(filter = '') {
    const itemList = document.getElementById('itemList');
    itemList.innerHTML = '';
    const filteredItems = items.filter(item =>
        item && item.name && item.name.toLowerCase().includes(filter.toLowerCase())
    );

    filteredItems.forEach(item => {
        const element = document.createElement('a');
        element.classList.add('list-group-item', 'list-group-item-action');
        element.textContent = item.name;
        element.href = '#';
        element.addEventListener('click', function (e) {
            e.preventDefault();
            document.getElementById('itemSearch').value = item.name;
            showItemDetails(item);
            itemList.style.display = 'none';
        });
        itemList.appendChild(element);
    });

    if (filteredItems.length === 0 && filter !== '') {
        const addNewItemElement = document.createElement('a');
        addNewItemElement.classList.add('list-group-item', 'list-group-item-action');
        addNewItemElement.textContent = `Add "${filter}" as a new item`;
        addNewItemElement.href = '#';
        addNewItemElement.addEventListener('click', function (e) {
            e.preventDefault();
            addNewItem(filter);
            itemList.style.display = 'none';
        });
        itemList.appendChild(addNewItemElement);
    }

    itemList.style.display = 'block';
}

            
function loadPartyMaster() {
    const partyMasterBody = document.getElementById('partyMasterBody');
    partyMasterBody.innerHTML = '';

    // Define predefined parties
    const predefinedParties = [
        "PARTY A - AREA1", "PARTY B - AREA2", "PARTY C - AREA3", "XYLO - AREA4"
    ];

    firebase.database().ref('parties').once('value', (snapshot) => {
        const firebaseParties = snapshot.val();
        if (firebaseParties) {
            firebaseParties.forEach((party, index) => {
                const row = document.createElement('tr');
                if (predefinedParties.includes(party)) {
                    // For predefined parties, don't include edit and delete buttons
                    row.innerHTML = `
                        <td>${party}</td>
                        <td></td>
                    `;
                } else {
                    // For custom parties, include edit and delete buttons
                    row.innerHTML = `
                        <td>${party}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-party" data-index="${index}">Edit</button>
                            <button class="btn btn-sm btn-danger delete-party" data-index="${index}">Delete</button>
                        </td>
                    `;
                }
                partyMasterBody.appendChild(row);
            });

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-party').forEach(button => {
                button.addEventListener('click', function () {
                    const index = this.getAttribute('data-index');
                    editParty(index);
                });
            });

            document.querySelectorAll('.delete-party').forEach(button => {
                button.addEventListener('click', function () {
                    const index = this.getAttribute('data-index');
                    deleteParty(index);
                });
            });
        }
    });
}


function editParty(index) {
    firebase.database().ref('parties').once('value', (snapshot) => {
        const parties = snapshot.val();
        const oldName = parties[index];
        let newName = prompt('Enter new party name (format: PARTY NAME - AREA):', oldName);
        
        if (newName && newName !== oldName) {
            // Validate the format
            const formatRegex = /^.+\s-\s.+$/;
            if (!formatRegex.test(newName)) {
                alert('Invalid format. Please use the format: PARTY NAME - AREA');
                return;
            }

            // Split the name into party name and area
            const parts = newName.split('-').map(part => part.trim());
            if (parts.length !== 2) {
                alert('The name must contain exactly one hyphen (-)');
                return;
            }

            // Capitalize the party name and area
            const [partyName, area] = parts.map(part => part.toUpperCase());
            newName = `${partyName} - ${area}`;

            parties[index] = newName;
            firebase.database().ref('parties').set(parties).then(() => {
                loadPartyMaster();
                logActivity('Edited party name', oldName, newName);
            }).catch(error => {
                console.error("Error updating party:", error);
            });
        }
    });
}

            function deleteParty(index) {
                if (confirm('Are you sure you want to delete this party?')) {
                    firebase.database().ref('parties').once('value', (snapshot) => {
                        const parties = snapshot.val();
                        const deletedParty = parties[index];
                        parties.splice(index, 1);
                        firebase.database().ref('parties').set(parties).then(() => {
                            loadPartyMaster();
                            logActivity('Deleted party', deletedParty);
                        }).catch(error => {
                            console.error("Error deleting party:", error);
                        });
                    });
                }
            }

