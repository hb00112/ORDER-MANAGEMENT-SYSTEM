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
    if ("geolocation" in navigator) {
        // Show loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.textContent = "Getting accurate location...";
        loadingElement.style.position = 'fixed';
        loadingElement.style.top = '50%';
        loadingElement.style.left = '50%';
        loadingElement.style.transform = 'translate(-50%, -50%)';
        loadingElement.style.padding = '20px';
        loadingElement.style.background = 'white';
        loadingElement.style.border = '1px solid #ccc';
        loadingElement.style.borderRadius = '5px';
        loadingElement.style.zIndex = '1000';
        document.body.appendChild(loadingElement);

        let bestAccuracy = Infinity;
        let bestReading = null;
        let readings = 0;
        const maxReadings = 20; // Increased maximum readings to get better accuracy
        const minAccuracy = 10; // Minimum accuracy in meters
        const maxAccuracy = 100; // Maximum accuracy in meters
        const timeout = 45000; // Extended timeout to 45 seconds

        const watchId = navigator.geolocation.watchPosition(
            function(position) {
                readings++;
                const accuracy = position.coords.accuracy;
                
                // Update loading message with current accuracy
                loadingElement.textContent = `Getting location... Accuracy: ±${Math.round(accuracy)}m`;

                // Only update best reading if accuracy is within our acceptable range
                if (accuracy < bestAccuracy && accuracy >= minAccuracy && accuracy <= maxAccuracy) {
                    bestAccuracy = accuracy;
                    bestReading = position;
                    
                    // If we get a reading with excellent accuracy, use it immediately
                    if (accuracy <= 20) {
                        completeLocationProcess();
                    }
                }

                // Stop if we've reached max readings
                if (readings >= maxReadings) {
                    completeLocationProcess();
                }
            },
            function(error) {
                loadingElement.remove();
                let errorMessage;
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location permission denied. Please allow location access.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable. Please try again outdoors.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please try again.";
                        break;
                    default:
                        errorMessage = "Error getting location: " + error.message;
                }
                alert(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: timeout,
                maximumAge: 0
            }
        );

        function completeLocationProcess() {
            navigator.geolocation.clearWatch(watchId);
            loadingElement.remove();

            if (bestReading && bestAccuracy <= maxAccuracy && bestAccuracy >= minAccuracy) {
                const lat = bestReading.coords.latitude;
                const lng = bestReading.coords.longitude;
                
                // Create a direct Google Maps link
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                
                // Create message with the maps link and accuracy information
                const message = `Dear Sir,\n\n`
                    + `kindly add the below location for ${partyName}\n\n`
                    + `Location Link: ${mapsLink}\n`
                    + `Location Accuracy: ±${Math.round(bestAccuracy)}m\n\n`
                    + `thank you`;
                
                const encodedMessage = encodeURIComponent(message);
                window.open(`https://wa.me/919284494154?text=${encodedMessage}`, '_blank');
            } else {
                alert(`Could not get location with required accuracy (between ${minAccuracy}m and ${maxAccuracy}m). Please try again in an open area.`);
            }
        }

        // Set timeout to prevent indefinite waiting
        setTimeout(() => {
            if (readings > 0) {
                completeLocationProcess();
            }
        }, timeout);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Function to create table rows
function populateTable() {
    const tableBody = document.getElementById('partyTableBody');
    tableBody.innerHTML = ''; // Clear existing content

    partyData.forEach((party, index) => {
        const { name, station } = parsePartyString(party.partyName);
        const row = document.createElement('tr');
        
        // Check if both coordinates and locationLink are null
        const hasNoLocation = !party.coordinates && !party.locationLink;
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${station}</td>
            <td>
                ${hasNoLocation ? 
                    `<span class="current-location-text" 
                           onclick="getCurrentLocationAndSendMessage('${party.partyName}')"
                           style="cursor: pointer; color: blue; text-decoration: underline;"
                           title="Click to send current location">
                        Current location as party location
                    </span>` : 
                    `<span class="location-icon" 
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

