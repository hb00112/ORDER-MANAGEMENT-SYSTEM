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
        coordinates: null,
        locationLink: "https://www.google.com/maps/place/Baron+Showroom/@15.4979591,73.8254615,17z/data=!3m1!4b1!4m6!3m5!1s0x3bbfc08e9bfa0741:0xa725970726a8fa32!8m2!3d15.4979591!4d73.8254615!16s%2Fg%2F11b6lll03y?entry=ttu&g_ep=EgoyMDI0MTEwNi4wIKXMDSoASAFQAw%3D%3D"
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
        window.open(`https://www.google.com/maps?q=${party.coordinates.lat},${party.coordinates.lng}`, '_blank');
    }
}

// Function to create table rows
function populateTable() {
    const tableBody = document.getElementById('partyTableBody');
    tableBody.innerHTML = ''; // Clear existing content

    partyData.forEach((party, index) => {
        const { name, station } = parsePartyString(party.partyName);
        const row = document.createElement('tr');
        
        let locationText = '';
        if (party.coordinates) {
            locationText = `${party.coordinates.lat}, ${party.coordinates.lng}`;
        } else if (party.locationLink) {
            locationText = party.locationLink.substring(0, 50) + '...';
        }
        
        row.innerHTML = `
            <td>${name}</td>
            <td>${station}</td>
           
            <td>
                <span class="location-icon" 
                      onclick="openMap(${index})"
                      style="cursor: pointer;"
                      title="Click to open map">
                    📍
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Initial population of table
document.addEventListener('DOMContentLoaded', () => {
    populateTable();
});
