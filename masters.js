// Party data array - Add parties with either coordinates OR location link
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
        coordinates: {lat:15.498072678766361 , 
            lng:73.82542972334339},
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
        // Using a simpler Google Maps URL format
        window.open(`https://www.google.com/maps/search/?api=1&query=${party.coordinates.lat},${party.coordinates.lng}`, '_blank');
    }
}

function getCurrentLocationAndSendMessage(partyName) {
    // Create overlay and map container
    const overlay = document.createElement('div');
    overlay.className = 'location-picker-modal-overlay';
    
    const mapContainer = document.createElement('div');
    mapContainer.className = 'location-picker-modal-container';
    mapContainer.innerHTML = `
        <h3 class="location-picker-modal-title">Select Location</h3>
        <div class="location-picker-accuracy-banner">Drag the marker or click on the map to select location</div>
        <div id="location-picker-map" class="location-picker-map-canvas"></div>
        <div class="location-picker-button-wrapper">
            <button class="location-picker-button location-picker-button-cancel" onclick="closeLocationPicker()">Cancel</button>
            <button class="location-picker-button location-picker-button-confirm" onclick="sendSelectedLocation()">Send Location</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(mapContainer);
    
    let marker;
    let map;
    let selectedPosition;

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                initializeLocationPicker(pos);
            },
            function(error) {
                const defaultPos = { lat: 20.5937, lng: 78.9629 }; // India center
                initializeLocationPicker(defaultPos);
                alert("Could not get your location. Please select your location on the map.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    function initializeLocationPicker(position) {
        map = L.map('location-picker-map').setView([position.lat, position.lng], 17);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add marker
        marker = L.marker([position.lat, position.lng], {
            draggable: true
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
    }

    // Make functions available globally
    window.closeLocationPicker = function() {
        if (map) {
            map.remove();
        }
        overlay.remove();
        mapContainer.remove();
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

