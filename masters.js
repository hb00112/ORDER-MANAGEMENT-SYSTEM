// Enhanced party data array with same structure
const partyData = [
    // Bicholim
    {
        partyName: "Roop Darpan - Bicholim",
        coordinates: {lat: 15.587945583060277, 
            lng: 73.94766136230967},
        locationLink: null
    },
    {
        partyName: "Mahamay Cosmetics - Bicholim",
        coordinates: {lat:15.587211516066104, lng:73.94797331535224},
        locationLink: null
    },
    {
        partyName: "Advait Enterprises - Bicholim",
        coordinates: null,
        locationLink: null
    },
    // Canacona
    {
        partyName: "Callicas - Canacona",
        coordinates: {lat:15.006606552890053, lng:74.0463952938426},
        locationLink: null
    },
    // Mapusa
    {
        partyName: "Falari Enterpries - Mapusa",
        coordinates: {lat:15.589365247224864, lng:73.8118954616089},
        locationLink: null
    },
    {
        partyName: "Deepak Store - Mapusa",
        coordinates: {lat:15.588641830696005, lng:73.81127494630533},
        locationLink: null
    },
    {
        partyName: "Goswami Gift - Mapusa",
        coordinates: null,
        locationLink: null
    },
    {
        partyName: "G D Kalekar - Mapusa",
        coordinates: {lat:15.588557509558795, lng:73.81151139521666},
        locationLink: null
    },
    {
        partyName: "MS Dangui - Mapusa",
        coordinates: {lat:15.588928018799352,lng: 73.81211117427368},
        locationLink: null
    },
    {
        partyName: "Jagannath Kavlekar LLP - Mapusa",
        coordinates: {lat:15.585820445990006,lng: 73.81233290735419},
        locationLink: null
    },
    {
        partyName: "Siddhivinayak - Mapusa",
        coordinates: {lat:15.587586260033774,lng: 73.81229355926534},
        locationLink: null
    },
    {
        partyName: "Femiline Collection - Margaon",
        coordinates: {lat:15.273099814366223,lng: 73.97284791765553},
        locationLink: null
    },
    {
        partyName: "Visnu Fancy Stores - Margao",
        coordinates: {lat:15.271282819800955,lng: 73.96030743849607},
        locationLink: null
    },
    {
        partyName: "Krishna Fancy - Margao",
        coordinates: {lat:15.271619041983532,lng: 73.95953185225159},
        locationLink: null
    },
    {
        partyName: "Caro Center - Margoa",
        coordinates: {lat:15.272311775037739,lng: 73.95780725263138},
        locationLink: null
    },
    // Panjim
    {
        partyName: "Bharne Retail Trends - Panjim",
        coordinates: {lat:15.500477485323938,lng: 73.8281064230195},
        locationLink: null
    },
    {
        partyName: "Lovely Collection - Panjim",
        coordinates: {lat:15.479218929400968,lng: 73.81219215767942},
        locationLink: null
    },
    {
        partyName: "Shetye Enterprises - Panjim",
        coordinates: {lat:15.485509477728389,lng: 73.82070095136504},
        locationLink: null
    },
    {
        partyName: "M S Dangui - Panjim",
        coordinates: {lat:15.500652759036013,lng: 73.82898800924747},
        locationLink: null
    },
    {
        partyName: "Par Excellence - Panjim",
        coordinates: null,
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
        partyName: "Chirag Bag House - Panjim",
        coordinates: {lat:15.498822395506862,lng: 73.8222645373662},
        locationLink: null
    },
    {
        partyName: "J.V Manerkar - Panjim",
        coordinates: {lat:15.500795472416964,lng: 73.82931163566691},
        locationLink: null
    },
   
    // Parvorim
    {
        partyName: "Poshak Retail - Parvorim",
        coordinates: {lat:15.533518139367382,lng: 73.82225221849463},
        locationLink: null
    },
    // Phonda/Ponda
    {
        partyName: "Avni Traders - Phonda",
        coordinates: null,
        locationLink: null
    },
    {
        partyName: "Feelings - Ponda",
        coordinates: {lat:15.400735367795287,lng: 74.00605617523317},
        locationLink: null
    },
    // Sanvordem
    {
        partyName: "Santosh Shopping - Sanvordem",
        coordinates: null,
        locationLink: null
    },
    // Vasco
    {
        partyName: "Puja Cosmetics - Vasco",
        coordinates: {lat:15.397243286508294,lng: 73.81096095551894},
        locationLink: null
    },
    
  
   
];
function parsePartyString(partyString) {
    const [name, station] = partyString.split(' - ');
    return { name, station };
}

function openMap(index) {
    const party = partyData[index];
    if (party.locationLink) {
        window.open(party.locationLink, '_blank');
    } else if (party.coordinates) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${party.coordinates.lat},${party.coordinates.lng}`, '_blank');
    }
}

/*function getCurrentLocationAndSendMessage(partyName) {
    let map = null;
    let marker = null;
    let selectedPosition = null;
    let mapInitialized = false;

    // Create modal with loading state
    const modalHTML = `
        <div class="location-picker-modal-overlay">
            <div class="location-picker-modal-container">
                <h3 class="location-picker-modal-title">Select Location</h3>
                <div class="location-picker-loading">
                    <div class="spinner"></div>
                    Getting your current location...
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.querySelector('.location-picker-modal-container');

    // Enhanced custom icon with better visibility
    function createCustomIcon() {
        return L.divIcon({
            className: 'custom-map-marker',
            html: `
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="10" fill="#2563eb"/>
                    <circle cx="24" cy="24" r="8" fill="white"/>
                    <circle cx="24" cy="24" r="6" fill="#2563eb"/>
                    <circle cx="24" cy="24" r="2" fill="white"/>
                </svg>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });
    }

    // Enhanced map initialization with better mobile handling
    function initializeMap(position) {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-accuracy-banner">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Drag marker or tap map to set location
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

        // Initialize map with mobile-optimized options
        const mapOptions = {
            zoomControl: false,
            tap: true, // Enable tap for mobile
            touchZoom: true,
            dragging: true,
            maxZoom: 19,
            minZoom: 3
        };

        try {
            map = L.map('location-picker-map', mapOptions).setView([position.lat, position.lng], 17);

            // Add detailed tile layer with satellite option
            const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
                crossOrigin: true
            }).addTo(map);

            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 19,
                crossOrigin: true
            });

            // Add layer control
            const baseMaps = {
                "Streets": streets,
                "Satellite": satellite
            };

            L.control.layers(baseMaps).addTo(map);

            // Add marker with enhanced visibility
            marker = L.marker([position.lat, position.lng], {
                draggable: true,
                icon: createCustomIcon()
            }).addTo(map);

            selectedPosition = position;

            // Enhanced marker drag handling
            marker.on('dragstart', function() {
                map.removeEventListener('click');
            });

            marker.on('dragend', function(event) {
                const pos = marker.getLatLng();
                selectedPosition = {
                    lat: pos.lat,
                    lng: pos.lng
                };
                map.on('click', handleMapClick);
            });

            // Enhanced map click handling
            function handleMapClick(event) {
                const pos = event.latlng;
                marker.setLatLng(pos);
                selectedPosition = {
                    lat: pos.lat,
                    lng: pos.lng
                };
            }

            map.on('click', handleMapClick);

            // Add custom zoom controls
            L.control.zoom({
                position: 'bottomright'
            }).addTo(map);

            // Add enhanced location button
            const locationButton = L.control({position: 'bottomright'});
            locationButton.onAdd = function(map) {
                const btn = L.DomUtil.create('button', 'custom-map-button');
                btn.innerHTML = '📍';
                btn.style.cssText = `
                    width: 40px;
                    height: 40px;
                    background: white;
                    border: 2px solid rgba(0,0,0,0.2);
                    border-radius: 4px;
                    cursor: pointer;
                    margin-bottom: 10px;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
                mapInitialized = true;
            }, 250);

        } catch (error) {
            console.error('Map initialization error:', error);
            showError('Failed to initialize map. Please try again.');
        }
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

    // Enhanced geolocation handling
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
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        } else {
            showError("Geolocation is not supported by your browser.");
        }
    }

    // Start getting location
    getLocation();

    // Global functions with enhanced error handling
    window.closeLocationPicker = function() {
        if (map && mapInitialized) {
            map.remove();
        }
        const overlay = document.querySelector('.location-picker-modal-overlay');
        if (overlay) {
            overlay.remove();
        }
    };

    window.retryGeolocation = function() {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-loading">
                <div class="spinner"></div>
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
*/
// Table population function remains the same
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    populateTable();
});

function handleModalOpen() {
    document.body.classList.add('modal-open');
}

function handleModalClose() {
    document.body.classList.remove('modal-open');
}

function getCurrentLocationAndSendMessage(partyName) {
    let map = null;
    let marker = null;
    let selectedPosition = null;
    let mapInitialized = false;

    // Handle body scroll
    document.body.classList.add('modal-open');

    // Create enhanced modal with loading state
    const modalHTML = `
        <div class="location-picker-modal-overlay">
            <div class="location-picker-modal-container">
                <h3 class="location-picker-modal-title">Select Location</h3>
                <div class="location-picker-loading">
                    <div class="spinner"></div>
                    <div>Getting your current location...</div>
                    <div style="font-size: 0.875em; color: #6b7280; margin-top: 8px;">
                        Please allow location access if prompted
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.querySelector('.location-picker-modal-container');

    // Enhanced custom icon creation
    function createCustomIcon() {
        return L.divIcon({
            className: 'custom-map-marker',
            html: `
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="10" fill="#2563eb"/>
                    <circle cx="24" cy="24" r="8" fill="white"/>
                    <circle cx="24" cy="24" r="6" fill="#2563eb"/>
                    <circle cx="24" cy="24" r="2" fill="white"/>
                </svg>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });
    }

    // Enhanced map initialization with better mobile support
    function initializeMap(position) {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-accuracy-banner">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>Drag marker or tap map to set precise location</span>
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
    
        // Enhanced map options for better detail and performance
        const mapOptions = {
            zoomControl: false,
            tap: true,
            touchZoom: true,
            dragging: true,
            maxZoom: 20,              // Increased max zoom for more detail
            minZoom: 3,
            zoomSnap: 0.5,           // Allow finer zoom levels
            zoomDelta: 0.5,          // Smaller zoom increments
            wheelDebounceTime: 100,
            wheelPxPerZoomLevel: 100,
            tapTolerance: 15,
            bounceAtZoomLimits: true
        };
    
        try {
            map = L.map('location-picker-map', mapOptions).setView([position.lat, position.lng], 18); // Higher initial zoom
    
            // Primary detailed street map layer
            const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 20,
                maxNativeZoom: 19,
                detectRetina: true,
                subdomains: 'abcd',
                className: 'detailed-map-tiles'
            }).addTo(map);
    
            // Enhanced satellite layer
            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 20,
                maxNativeZoom: 19,
                detectRetina: true
            });
    
            // Detailed terrain/topography layer
            const terrain = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>',
                maxZoom: 20,
                maxNativeZoom: 17,
                detectRetina: true
            });
    
            // Layer control with all options
            const baseMaps = {
                "Detailed Streets": streets,
                "Satellite": satellite,
                "Terrain": terrain
            };
    
            L.control.layers(baseMaps, null, {
                position: 'bottomleft',
                collapsed: true,
                hideSingleBase: false
            }).addTo(map);
    
            // Enhanced marker with better visibility
            marker = L.marker([position.lat, position.lng], {
                draggable: true,
                icon: createCustomIcon(),
                autoPan: true,
                autoPanSpeed: 10,
                autoPanPadding: [50, 50]
            }).addTo(map);
    
            selectedPosition = position;
    
            // Enhanced drag handling with smoother updates
            let isDragging = false;
            
            marker.on('dragstart', function() {
                isDragging = true;
                map.removeEventListener('click');
            });
    
            marker.on('drag', function() {
                const pos = marker.getLatLng();
                selectedPosition = {
                    lat: pos.lat,
                    lng: pos.lng
                };
            });
    
            marker.on('dragend', function() {
                isDragging = false;
                const pos = marker.getLatLng();
                selectedPosition = {
                    lat: pos.lat,
                    lng: pos.lng
                };
                // Smooth pan to marker position
                map.panTo(pos, {
                    animate: true,
                    duration: 0.5,
                    easeLinearity: 0.5
                });
                setTimeout(() => {
                    map.on('click', handleMapClick);
                }, 10);
            });
    
            // Enhanced map click handling with smooth animations
            function handleMapClick(event) {
                if (!isDragging) {
                    const pos = event.latlng;
                    marker.setLatLng(pos, {
                        animate: true,
                        duration: 0.5
                    });
                    selectedPosition = {
                        lat: pos.lat,
                        lng: pos.lng
                    };
                    map.panTo(pos, {
                        animate: true,
                        duration: 0.5,
                        easeLinearity: 0.5
                    });
                }
            }
    
            map.on('click', handleMapClick);
    
            // Enhanced zoom controls
            L.control.zoom({
                position: 'bottomright',
                zoomInTitle: 'Zoom in for more detail',
                zoomOutTitle: 'Zoom out for overview'
            }).addTo(map);
    
            // Enhanced location button with animation
            const locationButton = L.control({position: 'bottomright'});
            locationButton.onAdd = function(map) {
                const btn = L.DomUtil.create('button', 'custom-map-button');
                btn.innerHTML = '📍';
                btn.style.cssText = `
                    width: 40px;
                    height: 40px;
                    background: white;
                    border: 2px solid rgba(0,0,0,0.2);
                    border-radius: 4px;
                    cursor: pointer;
                    margin-bottom: 10px;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: transform 0.2s ease;
                `;
                
                btn.onmouseover = function() {
                    btn.style.transform = 'scale(1.1)';
                };
                
                btn.onmouseout = function() {
                    btn.style.transform = 'scale(1)';
                };
                
                btn.onclick = function() {
                    map.flyTo([position.lat, position.lng], 18, {
                        animate: true,
                        duration: 1
                    });
                    marker.setLatLng([position.lat, position.lng], {
                        animate: true,
                        duration: 0.5
                    });
                    selectedPosition = position;
                };
                
                return btn;
            };
            locationButton.addTo(map);
    
            // Force map to update its size with retry mechanism
            let retryCount = 0;
            const maxRetries = 3;
            
            function tryInvalidateSize() {
                if (map && document.getElementById('location-picker-map')) {
                    map.invalidateSize();
                    mapInitialized = true;
                } else if (retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(tryInvalidateSize, 100);
                }
            }
    
            setTimeout(tryInvalidateSize, 250);
    
        } catch (error) {
            console.error('Map initialization error:', error);
            showError('Failed to initialize map. Please try again.');
        }
    }

    // Enhanced error display
    function showError(message) {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Location Error</h3>
            <div class="location-picker-error">
                <div style="margin-bottom: 12px;">${message}</div>
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

    // Enhanced geolocation handling
    function getLocation() {
        if ("geolocation" in navigator) {
            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };

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
                options
            );
        } else {
            showError("Geolocation is not supported by your browser.");
        }
    }

    // Start getting location
    getLocation();

    // Global functions with enhanced error handling and cleanup
    window.closeLocationPicker = function() {
        if (map && mapInitialized) {
            map.remove();
        }
        const overlay = document.querySelector('.location-picker-modal-overlay');
        if (overlay) {
            overlay.remove();
        }
        document.body.classList.remove('modal-open');
    };

    window.retryGeolocation = function() {
        modal.innerHTML = `
            <h3 class="location-picker-modal-title">Select Location</h3>
            <div class="location-picker-loading">
                <div class="spinner"></div>
                <div>Getting your current location...</div>
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

