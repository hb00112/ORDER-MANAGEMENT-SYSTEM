let cart = [];

// Predefined items
let items = [];

// Predefined parties
let parties = [
   "Avni Traders Phonda",
"Bharne Retail Trends Panjim",
  "BURYE EMPORIUM SIOLIM",
"Feelings Phonda",
"Falari Enterpries Mapusa ",
"Puja Cosmetics Vasco",
"Vishnu Fancy Stores Margao",
"Poshak Retail Parvorim",
"Caro Center Margao",
"Lovely Collection Panjim",
"Shetye Enterprises Panjim",
"cash",
"Deepak Store Mapusa",
"M S Dangui Panjim",
"Advait Enterprises Bicholim ",
"Par Excellence Panjim",
"Callicas Cancona",
"J.V Manerkar Panjim",
"Visnu Fancy Stores Margao",
"Santosh Shopping Sanvordem",
"Baron Panjim",
"Goswami Gift Mapusa",
"Krishna Fancy Margao ",
"Femiline Collection Margaon ",
"G D Kalekar Mapusa",
"MS Dangui Mapusa",
"Roop Darpan Bicholim",
"Mahamay Cosmetics Bicholim ",
"Chirag Bag House Panjim",
"Jagannath Kavlekar LLP Mapusa",
"Siddhivinayak Mapusa",
"Manish Cosmetics Miramar"

];

document
  .getElementById("saveOrderBtn")
  .addEventListener("click", showOrderSummaryModal);

const partySearch = document.getElementById("partySearch");
const partyList = document.getElementById("partyList");

partySearch.addEventListener("focus", () => showParties());
partySearch.addEventListener("input", () => showParties(partySearch.value));

document.addEventListener("click", function (e) {
  if (e.target !== partySearch && !partyList.contains(e.target)) {
    partyList.style.display = "none";
  }
});


createCartSummaryTable();

document.getElementById("addToCartBtn").addEventListener("click", addToCart);
document.getElementById("saveOrderBtn").addEventListener("click", showOrderSummaryModal);


//indexed db item

// Initialize IndexedDB for items
function initItemIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KA_OMS_Items_DB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create items store
      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'name' });
        itemStore.createIndex('name', 'name', { unique: true });
      }
      
      // Create metadata store for tracking updates
      if (!db.objectStoreNames.contains('itemMetadata')) {
        db.createObjectStore('itemMetadata', { keyPath: 'key' });
      }
    };
  });
}

function saveItemDataToIndexedDB(itemsArray) {
  return initItemIndexedDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['items', 'itemMetadata'], 'readwrite');
      const itemStore = transaction.objectStore('items');
      const metaStore = transaction.objectStore('itemMetadata');
      
      // Clear existing items
      itemStore.clear();
      
      // Add all items
      itemsArray.forEach(item => {
        itemStore.add(item);
      });
      
      // Update last sync timestamp
      metaStore.put({
        key: 'lastItemSync',
        timestamp: Date.now()
      });
      
      transaction.oncomplete = () => {
        console.log('Items saved to IndexedDB');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

function loadItemDataFromIndexedDB() {
  return initItemIndexedDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['items'], 'readonly');
      const store = transaction.objectStore('items');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('Items loaded from IndexedDB:', request.result.length);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function transformFirebaseToItemFormat(firebaseItems) {
  // Group items by Style
  const groupedItems = {};
  
  firebaseItems.forEach(item => {
    const styleName = item.Style;
    
    if (!groupedItems[styleName]) {
      groupedItems[styleName] = {
        name: styleName,
        sizes: new Set(),
        colors: new Set(),
        colorDetails: {} // Store color name and MRP mapping
      };
    }
    
    // Add size
    if (item.Size) {
      groupedItems[styleName].sizes.add(item.Size);
    }
    
    // Add color
    if (item.Color) {
      groupedItems[styleName].colors.add(item.Color);
      
      // Store color details (Color Name and MRP)
      if (!groupedItems[styleName].colorDetails[item.Color]) {
        groupedItems[styleName].colorDetails[item.Color] = {
          colorName: item['Color Name'] || item.Color,
          mrp: item.MRP ? item.MRP.trim() : ''
        };
      }
    }
  });
  
  // Convert to array format
  const transformedItems = Object.values(groupedItems).map(item => {
    // Convert Sets to sorted arrays
    const sizes = Array.from(item.sizes).sort((a, b) => {
      // Custom sort for sizes like 32B, 32C, 34B, etc.
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    
    const colors = Array.from(item.colors).sort();
    
    // Create colorname array in format: "COLOR : COLOR_NAME, MRP"
    const colorname = colors.map(color => {
      const details = item.colorDetails[color];
      return `${color} : ${details.colorName}, ${details.mrp}`;
    });
    
    return {
      name: item.name,
      sizes: sizes,
      colors: colors,
      colorname: colorname
    };
  });
  
  // Sort items by name
  transformedItems.sort((a, b) => a.name.localeCompare(b.name));
  
  return transformedItems;
}

function fetchItemDataFromFirebase() {
  return firebase.database().ref('itemData/items').once('value')
    .then(snapshot => {
      const firebaseData = snapshot.val();
      if (!firebaseData) {
        console.error('No item data found in Firebase');
        return [];
      }
      
      // Transform the data
      const transformedItems = transformFirebaseToItemFormat(firebaseData);
      console.log('Fetched and transformed items from Firebase:', transformedItems.length);
      
      return transformedItems;
    })
    .catch(error => {
      console.error('Error fetching items from Firebase:', error);
      throw error;
    });
}

function checkForItemDataUpdates() {
  return initItemIndexedDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['itemMetadata'], 'readonly');
      const store = transaction.objectStore('itemMetadata');
      const request = store.get('lastItemSync');
      
      request.onsuccess = () => {
        const lastSync = request.result ? request.result.timestamp : 0;
        
        // Check Firebase for lastUpdated timestamp
        firebase.database().ref('itemData/lastUpdated').once('value')
          .then(snapshot => {
            const firebaseLastUpdated = snapshot.val() || 0;
            
            // If Firebase data is newer, fetch updates
            if (firebaseLastUpdated > lastSync) {
              console.log('Item data updates available');
              resolve(true);
            } else {
              console.log('Item data is up to date');
              resolve(false);
            }
          })
          .catch(reject);
      };
      
      request.onerror = () => reject(request.error);
    });
  });
}

//item firebase main

function initializeItemData() {
  return loadItemDataFromIndexedDB()
    .then(cachedItems => {
      if (cachedItems.length > 0) {
        // Use cached items
        items = cachedItems;
        console.log('Using cached items:', items.length);
        
        // Check for updates in background
        checkForItemDataUpdates().then(hasUpdates => {
          if (hasUpdates) {
            console.log('Updating items from Firebase...');
            return fetchItemDataFromFirebase()
              .then(freshItems => {
                items = freshItems;
                return saveItemDataToIndexedDB(freshItems);
              })
              .then(() => {
                console.log('Items updated successfully');
                updateItemSearchDatalist(); // Refresh UI
              });
          }
        }).catch(error => {
          console.error('Error checking for updates:', error);
        });
        
        return items;
      } else {
        // No cached items, fetch from Firebase
        console.log('No cached items, fetching from Firebase...');
        return fetchItemDataFromFirebase()
          .then(freshItems => {
            items = freshItems;
            return saveItemDataToIndexedDB(freshItems);
          })
          .then(() => {
            console.log('Items initialized from Firebase');
            return items;
          });
      }
    })
    .catch(error => {
      console.error('Error initializing items:', error);
      alert('Error loading item data. Please refresh the page.');
      return [];
    });
}

// Initialize items when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Show loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'itemsLoadingIndicator';
  loadingDiv.innerHTML = `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 9999;">
      <p>Loading item data...</p>
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  
  // Initialize items
  initializeItemData()
    .then(() => {
      console.log('Items initialized:', items.length);
      updateItemSearchDatalist();
      loadingDiv.remove();
    })
    .catch(error => {
      console.error('Failed to initialize items:', error);
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <p style="color: red;">Error loading item data. Please refresh the page.</p>
          <button class="btn btn-primary" onclick="location.reload()">Refresh</button>
        </div>
      `;
    });
});
//----------------------------------------party--------------------------------
function sortParties() {
    parties.sort((a, b) => {
      if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b, undefined, { sensitivity: "base" });
      }
      // Handle non-string elements (you can modify this part based on your needs)
      return 0;
    });
  }
  function showParties(filter = "") {
    partyList.innerHTML = "";
    const filteredParties = parties.filter((party) => {
      if (typeof party === "string") {
        return party.toLowerCase().includes(filter.toLowerCase());
      }
      return false; // or handle non-string elements as needed
    });
  
    filteredParties.forEach((party) => {
      const item = document.createElement("a");
      item.classList.add("list-group-item", "list-group-item-action");
      item.textContent = party;
      item.href = "#";
      item.addEventListener("click", function (e) {
        e.preventDefault();
        partySearch.value = party;
        partyList.style.display = "none";
      });
      partyList.appendChild(item);
    });
  
    if (filteredParties.length === 0 && filter !== "") {
      const addNewItem = document.createElement("a");
      addNewItem.classList.add("list-group-item", "list-group-item-action");
      addNewItem.textContent = `Add "${filter}" as a new party`;
      addNewItem.href = "#";
      addNewItem.addEventListener("click", function (e) {
        e.preventDefault();
        addNewParty(filter);
      });
      partyList.appendChild(addNewItem);
    }
  
    partyList.style.display = "block";
  }
  
  function addNewParty(partyInput) {
    const [partyName, area] = partyInput.split(" - ").map((s) => s.trim());
    if (!partyName || !area) {
      alert(
        'Please enter the party name and area in the format "PARTYNAME - AREA"'
      );
      return;
    }
  
    const fullPartyName = `${partyName} - ${area}`;
    if (!parties.includes(fullPartyName)) {
      parties.push(fullPartyName);
      sortParties();
      // Save only the new party to Firebase
      firebase
        .database()
        .ref("parties/" + fullPartyName.replace(".", "_"))
        .set(true);
      console.log(`Added new party: ${fullPartyName}`);
  
      // Log the activity
      const now = new Date();
      const activityLog = {
        action: "Created new party",
        partyName: fullPartyName,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        username: username,
      };
      firebase.database().ref("activityLogs").push(activityLog);
  
      // Send Telegram message
      const chatId = "-4527298165";
      const botToken = "7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs";
      const message = `${username}: created new party ${fullPartyName}`;
      const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(
        message
      )}`;
  
      fetch(url)
        .then((response) => response.json())
        .then((data) => console.log("Telegram message sent:", data))
        .catch((error) =>
          console.error("Error sending Telegram message:", error)
        );
    }
    partySearch.value = fullPartyName;
    partyList.style.display = "none";
  }
 

// ---------------------Color Management
function handleColorContainerClick(event) {
  // Check if the click was on the input or label
  if (
    event.target.classList.contains("quantity-input") ||
    event.target.classList.contains("size-label")
  ) {
    return; // Do nothing if the click was on an input or label
  }

  // Toggle the grid if the click was on the container itself
  const colorContainer = event.currentTarget;
  const sizeQuantityGrid = colorContainer.querySelector(".size-quantity-grid");

  if (
    sizeQuantityGrid.style.display === "none" ||
    sizeQuantityGrid.style.display === ""
  ) {
    sizeQuantityGrid.style.display = "block";
  } else {
    sizeQuantityGrid.style.display = "none";
  }
}

function getBackgroundColor(color) {
  const colorMap = {
      'BLACK': 'black',
      'WHITE': '#FFFFFF',
      'GRW': '#341917',
      'GRYMRL': '#d8d7dc',
      'LILAST': `url("https://www.enamor.co.in/cdn/shop/files/5_ea03e152-8bbc-4cb3-b605-7ec29a515d86.jpg?v=1684217469") 75% 50% / cover no-repeat`,
      'LIMAPR': 'url("https://www.enamor.co.in/cdn/shop/files/1AvTEPQ_KfpsXo7Tzhyb6Q45y0usBJr7S.jpg?v=1696598482") 75% 50% /  cover no-repeat',
      'RESWPR': 'url(" https://www.enamor.co.in/cdn/shop/files/1nncqC7eWXEd5EVIPwJJUGsS4YfX-Igyz.jpg?v=1696598470") 75% 50% /  cover no-repeat',
      'EVB': 'navy',
      'PEARL': '#E6C7B8',
      'SKIN': '#E4C7A7',
      'DIO': 'white',
      'JBK': '#0A0A0A',
      'PCMARG': 'cyan',
      'PSMARG': 'lightpink',
      'EVEBLU': '#222133',
      'MASAI' : 'url(" https://www.enamor.co.in/cdn/shop/products/a014_masai_13__1_large.jpg?v=1676456937") 30% 50% /  1500% no-repeat',
      'BPRP' : 'url(" https://www.enamor.co.in/cdn/shop/files/5_4fba307d-bfc2-471e-b91f-c1b5bf2d0dba_large.jpg?v=1683789659") 75% 50% /  cover no-repeat',
      'PPRP': 'url("https://www.enamor.co.in/cdn/shop/files/5_5b158d6a-bc65-49bd-8f0f-4382ba1b513f_large.jpg?v=1683789670")75% 50% /  cover no-repeat',   
      'CPM': '#D2E3EB',   
      'GKP': 'url("https://www.enamor.co.in/cdn/shop/products/6_836_large.jpg?v=1700655975")75% 50% /  cover no-repeat',  
      'ODM': '#EEC9D3',  
      'RSBLSH': '#D5868E',  
      'PLS': '#D4C2B6',  
      'GRYMEL': '#d8d7dc',  
      'BDE': 'url("https://www.enamor.co.in/cdn/shop/products/00a027bde_1_4_large.jpg?v=1676458803")65% 100% /  1600% no-repeat',  
      'RTE': '#CC746D',  
      'ECL': '#2F2F4A',  
      'SLI': 'url("https://www.enamor.co.in/cdn/shop/products/6_841_12_large.jpg?v=1676464479")0% 0% /  1000% no-repeat',  
      'CHYBLS': 'url("https://www.enamor.co.in/cdn/shop/products/4_1000_1_large.jpg?v=1716458121")67% 90% /  1400% no-repeat',  
      'CHIVIO': 'url("https://www.enamor.co.in/cdn/shop/files/6_ad2713ea-70f4-497a-9c1b-a33d892d2cd2_large.jpg?v=1708944721")75% 80% /  1000% no-repeat',
      'CMG': '#B5C4D8',
      'GSP': 'url("https://www.enamor.co.in/cdn/shop/products/6_876.jpg?v=1676466389")0% 20% /  1000% no-repeat',
      'DDO': 'url("https://www.enamor.co.in/cdn/shop/products/6_875.jpg?v=1676466411")0% 20% /  1000% no-repeat',
      'LPR': 'url("https://www.enamor.co.in/cdn/shop/files/18b1XCLuTl3M_ytx9Tb1tLfUEK1RDyrBp_large.jpg?v=1696598795")50% 50% /  500% no-repeat',
      'PURPLE': '#6C2B6A',
      'TMG':'#E67F81',
      'RVL': 'url("https://www.enamor.co.in/cdn/shop/products/6_920_4.jpg?v=1677836790")0% 20% /  1000% no-repeat',
      'CFAUP': 'url("https://www.enamor.co.in/cdn/shop/files/5_d2d4cfd4-fb0e-4566-b6a7-8ff9aaaa06ce_large.jpg?v=1683790128")0% 30% /  500% no-repeat',
      'TLPP': 'url("https://www.enamor.co.in/cdn/shop/files/5_eb8ecf80-5f52-46a4-a872-d2e1477beb61.jpg?v=1683790138")0% 30% /  500% no-repeat',
      'PHB': '#E78A84',
      'OLT':'#E9E2D7',
      'BRI':'#B82230',
      'BDE': '#E2C2BF',
      'PBH':'#D0A095',
      'TSE': '#8DC8D0',
      'PHP':'#EAD4CC',
      'MFL': 'url("https://www.enamor.co.in/cdn/shop/products/6_888.jpg?v=1676462012")50% 100% /  800% no-repeat',  
      'GRS': 'linear-gradient(to left, #341917 50%, #E4C7A7 50%)',
      'WHG': 'linear-gradient(to left, #FFFFFF 50%, #d8d7dc 50%)',
      'DHP': 'url("https://www.enamor.co.in/cdn/shop/products/5_1089.jpg?v=1676464602")50% 80% /  800% no-repeat',  
      'MMV': 'url("https://www.enamor.co.in/cdn/shop/products/5_1553.jpg?v=1676466172")50% 80% /  800% no-repeat',  
      'MLP': 'url("https://www.enamor.co.in/cdn/shop/products/1_2024_1_2.jpg?v=1676460147")50% 82% /  800% no-repeat',  
      'PFI': '#FEE0E0',
      'ALS': '#ECD7D7',
      'LSBNBL': '#1B2032',
      'OCH': '#D4979E',
      'PSTLIL':'#E8DDEA',
      'ARO': 'url("https://www.enamor.co.in/cdn/shop/products/6_869_5.jpg?v=1676466323")50% 82% /  800% no-repeat',
      'AUM': 'url("https://www.enamor.co.in/cdn/shop/products/4_1092_1_4.jpg?v=1676458943")60% 86% /  1200% no-repeat',
      'CLM':'#F0EAE5',
      'WFM': 'url("https://www.enamor.co.in/cdn/shop/files/ENAMORDAY-1_4624_Details_6fbe6d62-5cd6-4f86-9c39-44d156c0e8d8.jpg?v=1718885423")60% 86% /  1200% no-repeat',
      'MNPP': 'url("https://www.enamor.co.in/cdn/shop/products/f097_midnight_peony_print_7.jpg?v=1700657442")0% 30% /  500% no-repeat',
      'LCR': 'url("https://www.enamor.co.in/cdn/shop/products/6_459_17.jpg?v=1676464469")100% 30% /  500% no-repeat',
      'NISH':'#372C3B',
     
      'NAVY': '#242638',
      'GOBBLU': '#A5BBCF',
      'JETBLK': '#000000',
      'OLVNT':'#483E36',
      'ROUGE':'#EEA49F',
      'HTMBCO': 'url("https://www.enamor.co.in/cdn/shop/files/5_f3f32b28-5db7-4c42-aba8-97fc355e081d.jpg?v=1709016268")50% 60% /  500% no-repeat',
      'PFPGCO': 'url("https://www.enamor.co.in/cdn/shop/files/5_bec821e4-f5ba-4c0c-a013-6048a8ae8005.jpg?v=1709016265")50% 60% /  500% no-repeat',
  };
  return colorMap[color.toUpperCase()] || "";
}

function getContrastColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

function createColorContainer(item, color) {
  const backgroundColor = getBackgroundColor(color);
  const textColor = backgroundColor
    ? getContrastColor(backgroundColor)
    : "#000000";
  const containerStyle = backgroundColor
    ? `background-color: ${backgroundColor}; color: ${textColor};`
    : "border: 1px solid #ccc;";

  return `
      <div class="color-container" style="${containerStyle}" data-color="${color}">
          <h4>${color}</h4>
          <div class="size-quantity-grid" style="display: none;">
              ${item.sizes
                .map(
                  (size) => `
                  <div class="size-quantity-row">
                      <label class="size-label" data-size="${size}">${size}</label>
                      <input type="number" name="qty_${color}_${size}" min="0" class="quantity-input">
                  </div>
              `
                )
                .join("")}
          </div>
      </div>
  `;
}

function setupSizeLabelInteractions() {
  document.querySelectorAll('.size-label').forEach(label => {
    let pressTimer;
    let isLongPress = false;
    
    // Handle mouse down (for long press)
    label.addEventListener('mousedown', function(e) {
      isLongPress = false;
      const input = this.nextElementSibling;
      
      // Set timer for long press
      pressTimer = setTimeout(() => {
        isLongPress = true;
        // Long press action - reset to 0
        input.value = 0;
        input.dispatchEvent(new Event('change'));
      }, 500); // 1 second for long press
    });
    
    // Handle mouse up (cancel long press if released early)
    label.addEventListener('mouseup', function(e) {
      clearTimeout(pressTimer);
    });
    
    // Handle mouse leave (cancel long press if mouse leaves)
    label.addEventListener('mouseleave', function(e) {
      clearTimeout(pressTimer);
    });
    
    // Handle click (short press)
    label.addEventListener('click', function(e) {
      if (!isLongPress) {
        const input = this.nextElementSibling;
        const currentValue = parseInt(input.value) || 0;
        input.value = currentValue + 1;
        input.dispatchEvent(new Event('change'));
      }
      isLongPress = false;
    });
    
    // Touch events for mobile devices
    label.addEventListener('touchstart', function(e) {
      isLongPress = false;
      const input = this.nextElementSibling;
      
      pressTimer = setTimeout(() => {
        isLongPress = true;
        input.value = 0;
        input.dispatchEvent(new Event('change'));
      }, 1000);
    });
    
    label.addEventListener('touchend', function(e) {
      clearTimeout(pressTimer);
    });
    
    label.addEventListener('touchcancel', function(e) {
      clearTimeout(pressTimer);
    });
  });
}


function handleNewColorClick(event) {
  event.stopPropagation();
  const colorName = prompt("Enter the name of the new color:");
  if (colorName && colorName.trim() !== "") {
      const newColorName = `${colorName.trim()}(N)`;
      const itemName = document.querySelector("#itemDetailsContainer h3").textContent;
      const item = items.find(i => i.name === itemName);
      if (item) {
          item.colors.push(newColorName);
          showItemDetails(item);
      }
  }
}
//--------- User Interface Navigation
function returnToHomepage() {
  document.getElementById("partySearch").value = "";
  document.getElementById("itemSearch").value = "";
  cart = [];
  updateCartSummary();

  const itemDetailsContainer = document.getElementById("itemDetailsContainer");
  if (itemDetailsContainer) {
    itemDetailsContainer.remove();
  }

  loadPendingOrders(); // Refresh the pending orders list
  console.log("Returned to homepage");
}

function showItemDetails(item) {
  const existingDetailsContainer = document.getElementById("itemDetailsContainer");
  if (existingDetailsContainer) {
    existingDetailsContainer.remove();
  }

  const detailsContainer = document.createElement("div");
  detailsContainer.id = "itemDetailsContainer";
  detailsContainer.innerHTML = `
      <h3 style="text-align: center;">${item.name}</h3>
      <div class="color-containers">
          ${item.colors
            .map((color) => createColorContainer(item, color))
            .join("")}
          ${createColorContainer(item, "[new color]")}
      </div>
  `;

  const itemList = document.getElementById("itemList");
  itemList.insertAdjacentElement("afterend", detailsContainer);

  // Add click event listeners to color containers
  detailsContainer.querySelectorAll(".color-container").forEach((container) => {
    container.addEventListener("click", handleColorContainerClick);
  });

  // Add event listener for the [new color] container
  const newColorContainer = detailsContainer.querySelector('.color-container[data-color="[new color]"]');
  newColorContainer.addEventListener("click", handleNewColorClick);
  
  // Set up the size label interactions after a small delay to ensure DOM is ready
  setTimeout(() => {
    setupSizeLabelInteractions();
  }, 50);
}


function resetItemSelection() {
  document.getElementById("itemSearch").value = "";
  const itemDetailsContainer = document.getElementById("itemDetailsContainer");
  if (itemDetailsContainer) {
    itemDetailsContainer.remove();
  }
}


// ------------------Audio Feedback
function playConfirmationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

function playAdvancedConfirmationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create oscillators
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  
  // Create gain nodes
  const gainNode1 = audioContext.createGain();
  const gainNode2 = audioContext.createGain();
  
  // Configure oscillators
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  
  // Configure gain nodes
  gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode1.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
  gainNode1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
  
  gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.2);
  gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
  
  // Connect nodes
  osc1.connect(gainNode1);
  osc2.connect(gainNode2);
  gainNode1.connect(audioContext.destination);
  gainNode2.connect(audioContext.destination);
  
  // Start and stop the sound
  osc1.start(audioContext.currentTime);
  osc2.start(audioContext.currentTime + 0.1);
  osc1.stop(audioContext.currentTime + 0.5);
  osc2.stop(audioContext.currentTime + 0.6);
} 

//----------------// Notifications
function sendTelegramNotification(partyName, totalQuantity, orderNumber, imgData) {
  const token = "6489265710:AAFx6-OaL09SpByMPyfiQBmgetvbtx0InyI";
  const chatId = "-1002170737027";
  const message = `New order received:\nParty Name: ${partyName}\nTotal Quantity: ${totalQuantity}\nOrder Number: ${orderNumber}`;

  // First, send the text message
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  })
    .then((response) => response.json())
    .then((data) => console.log("Telegram text notification sent:", data))
    .catch((error) =>
      console.error("Error sending Telegram text notification:", error)
    );

  // Then, send the image
  // Convert base64 image data to blob
  const byteCharacters = atob(imgData.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {type: 'image/png'});

  // Create FormData and append the image
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', blob, 'order_summary.png');

  // Send the image
  fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => console.log("Telegram image sent:", data))
    .catch(error => console.error("Error sending Telegram image:", error));
}


//------------ Item and Cart Management
function calculateTotalQuantity() {
  return cart.reduce((total, item) => {
    return (
      total +
      Object.values(item.colors).reduce((itemTotal, color) => {
        return (
          itemTotal +
          Object.values(color).reduce((colorTotal, qty) => colorTotal + qty, 0)
        );
      }, 0)
    );
  }, 0);
}

function updateItemSearchDatalist() {
  const datalist = document.getElementById("itemList");
  datalist.innerHTML = "";
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    datalist.appendChild(option);
  });
}

function addNewItem(itemName) {
  if (!items.some((item) => item && item.name === itemName)) {
      // Create a modal dynamically
      const modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "newItemModal";
      modal.setAttribute("tabindex", "-1");
      modal.innerHTML = `
          <div class="modal-dialog modal-lg">
              <div class="modal-content">
                  <div class="modal-header">
                      <h5 class="modal-title">Add New Item</h5>
                      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                      <div class="mb-3">
                          <label for="itemName" class="form-label">Item Name</label>
                          <input type="text" class="form-control" id="itemName" required>
                      </div>
                      <div class="row">
                          <div class="col-md-6">
                              <h6>Number Cup Size</h6>
                              <div id="numCupSizes" class="row"></div>
                              <div class="mt-2">
                                  <input type="text" class="form-control" id="customNumCupSize" placeholder="Enter custom size">
                              </div>
                          </div>
                          <div class="col-md-6">
                              <h6>General Size</h6>
                              <div id="generalSizes" class="row"></div>
                              <div class="mt-2">
                                  <input type="text" class="form-control" id="customGeneralSize" placeholder="Enter custom size">
                              </div>
                          </div>
                      </div>
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                      <button type="button" class="btn btn-primary" id="saveNewItem">Save Item</button>
                  </div>
              </div>
          </div>
      `;
      document.body.appendChild(modal);

      const newItemModal = new bootstrap.Modal(document.getElementById("newItemModal"));

      const numCupSizes = ["32B", "32C", "32D", "32Z", "34B", "34C", "34D", "34Z", "36B", "36C", "36D", "36Z", "38B", "38C", "38D", "38Z", "40B", "40C", "40D", "42B", "42C"];
      const generalSizes = ["XS", "S", "M", "L", "XL", "2XL"];

      const numCupSizesContainer = document.getElementById("numCupSizes");
      const generalSizesContainer = document.getElementById("generalSizes");

      // Function to create checkbox in a column layout
      function createCheckbox(size, container) {
          const col = document.createElement("div");
          col.className = "col-6 mb-2";
          col.innerHTML = `
              <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="${size}" id="${size}">
                  <label class="form-check-label" for="${size}">${size}</label>
              </div>
          `;
          container.appendChild(col);
      }

      // Create Number Cup Size checkboxes
      numCupSizes.forEach(size => createCheckbox(size, numCupSizesContainer));

      // Create General Size checkboxes
      generalSizes.forEach(size => createCheckbox(size, generalSizesContainer));

      // Function to handle custom size input
      function handleCustomSizeInput(inputId, containerid) {
          const customSizeInput = document.getElementById(inputId);
          const container = document.getElementById(containerid);

          customSizeInput.addEventListener("blur", () => {
              const customSize = customSizeInput.value.trim();
              if (customSize) {
                  createCheckbox(customSize, container);
                  customSizeInput.value = "";
              }
          });
      }

      // Set up custom size inputs
      handleCustomSizeInput("customNumCupSize", "numCupSizes");
      handleCustomSizeInput("customGeneralSize", "generalSizes");

      // Pre-fill the item name
      document.getElementById("itemName").value = itemName;

      document.getElementById("saveNewItem").addEventListener("click", function () {
          const itemName = document.getElementById("itemName").value.trim();
          if (!itemName) {
              alert("Please enter an item name.");
              return;
          }

          const selectedSizes = [
              ...document.querySelectorAll("#numCupSizes input:checked"),
              ...document.querySelectorAll("#generalSizes input:checked")
          ].map(input => input.value);

          if (selectedSizes.length === 0) {
              alert("Please select at least one size.");
              return;
          }

          const newItem = { name: itemName, sizes: selectedSizes, colors: ["Any Color"] };
          items.push(newItem);
          items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

          console.log(`Added new item: ${itemName}`);
          alert(`New item "${itemName}" has been added successfully.`);
          newItemModal.hide();
          document.body.removeChild(modal);
          
          document.getElementById("itemSearch").value = itemName;
          document.getElementById("itemList").style.display = "none";
          showItemDetails(newItem);
      });

      newItemModal.show();
  } else {
      console.log(`Item "${itemName}" already exists.`);
      alert(`Item "${itemName}" already exists in the list.`);
  }
} 

function getTotalQuantity(cartItems) {
  return cartItems.reduce((total, item) => total + item.total, 0);
}

function updateCartButtonText(totalQuantity) {
  const cartButton = document.getElementById("saveOrderBtn");
  cartButton.textContent = `Process Order`;
}

function addToCart() {
  const itemName = document.getElementById("itemSearch").value;
  const item = items.find((i) => i.name === itemName);

  if (!item) {
      alert("Please select a valid item.");
      return;
  }

  const cartItem = {
      name: itemName,
      colors: {},
  };

  let itemAdded = false;
  let itemTotalQuantity = 0;

  // Include all colors, including the new ones with (N)
  item.colors.forEach((color) => {
      cartItem.colors[color] = {};
      item.sizes.forEach((size) => {
          const qty =
              parseInt(
                  document.querySelector(`input[name="qty_${color}_${size}"]`).value
              ) || 0;
          if (qty > 0) {
              cartItem.colors[color][size] = qty;
              itemAdded = true;
              itemTotalQuantity += qty;
          }
      });
  });

  if (!itemAdded) {
      alert("Please select at least one size and quantity.");
      return;
  }

  const existingItemIndex = cart.findIndex((item) => item.name === itemName);
  if (existingItemIndex !== -1) {
      // Merge quantities for existing item
      Object.keys(cartItem.colors).forEach((color) => {
          if (!cart[existingItemIndex].colors[color]) {
              cart[existingItemIndex].colors[color] = {};
          }
          Object.keys(cartItem.colors[color]).forEach((size) => {
              if (cart[existingItemIndex].colors[color][size]) {
                  cart[existingItemIndex].colors[color][size] +=
                      cartItem.colors[color][size];
              } else {
                  cart[existingItemIndex].colors[color][size] =
                      cartItem.colors[color][size];
              }
          });
      });
  } else {
      cart.push(cartItem);
  }

  updateCartSummary();
  updateCartButtonText(calculateTotalQuantity());
  updateItemDetailsAfterAddToCart(item);
}

function updateQuantity(size, change) {
  const input = document.getElementById(`qty_${size}`);
  if (input) {
    let newValue = parseInt(input.value) + change;
    newValue = Math.max(0, newValue); // Ensure non-negative value
    input.value = newValue;
  }
}

function updateItemDetailsAfterAddToCart(item) {
  const detailsContainer = document.getElementById("itemDetailsContainer");
  if (detailsContainer) {
    const colorContainers =
      detailsContainer.querySelectorAll(".color-container");
    colorContainers.forEach((container) => {
      const color = container.dataset.color;
      const sizeQuantityGrid = container.querySelector(".size-quantity-grid");
      const inputs = sizeQuantityGrid.querySelectorAll('input[type="number"]');
      inputs.forEach((input) => {
        input.value = ""; // Reset all inputs
      });
    });
  }

  // Optionally, you can add a visual feedback that the item was added to the cart
  showAddedToCartFeedback();
}

function showAddedToCartFeedback() {
  const feedback = document.createElement("div");
  feedback.textContent = "Added to cart";
  feedback.style.position = "fixed";
  feedback.style.top = "20px";
  feedback.style.right = "20px";
  feedback.style.backgroundColor = "#4CAF50";
  feedback.style.color = "white";
  feedback.style.padding = "10px";
  feedback.style.borderRadius = "5px";
  feedback.style.zIndex = "1000";
  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 2000);
}

// --------------Cart Summary
function updateCartSummary() {
  const cartSummary =
    document.getElementById("cartSummary") || createCartSummaryTable();
  const tbody = cartSummary.querySelector("tbody");
  tbody.innerHTML = "";

  let totalQuantity = 0;

  cart.forEach((item, itemIndex) => {
    Object.entries(item.colors).forEach(([color, sizes]) => {
      let colorTotal = 0;
      let sizesAndQuantities = [];

      Object.entries(sizes).forEach(([size, qty]) => {
        if (qty > 0) {
          sizesAndQuantities.push(`${size}/${qty}`);
          colorTotal += qty;
          totalQuantity += qty;
        }
      });

      if (colorTotal > 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>${item.name} (${color})</td>
                    <td>${sizesAndQuantities.join(", ")}</td>
                    <td>${colorTotal}</td>
                `;
        row.classList.add("clickable-row");
        row.addEventListener("click", () =>
          showEditItemModal(itemIndex, color, false)
        );
        tbody.appendChild(row);
      }
    });
  });

  // Update total quantity in the cart button
  updateCartButtonText(totalQuantity);
}

function createCartSummaryTable() {
  const table = document.createElement("table");
  table.id = "cartSummary";
  table.className = "table table-bordered mt-4";
  table.innerHTML = `
        <thead>
            <tr>
                <th>Item Name & Color</th>
                <th>Size and Qty</th>
                <th>(T)</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
  document.getElementById("orders").appendChild(table);
  return table;
}

function editCartSummaryItem(
  itemIndex,
  colorIndex,
  isOrderSummaryModal = false
) {
  console.log("editCartSummaryItem called with:", {
    itemIndex,
    colorIndex,
    isOrderSummaryModal,
  });

  try {
    const item = cart[itemIndex];
    if (!item) {
      console.error("Item not found in cart:", itemIndex);
      alert("Error: Item not found in cart.");
      return;
    }

    const colorKeys = Object.keys(item.colors);
    const color = colorKeys[colorIndex];
    if (!color) {
      console.error("Color not found for item:", {
        itemIndex,
        colorIndex,
        colorKeys,
      });
      alert("Error: Color not found for item.");
      return;
    }

    const sizes = Object.keys(item.colors[color]);
    let newTotal = 0;

    sizes.forEach((size) => {
      const newQty = parseInt(document.getElementById(`qty_${size}`).value);
      if (newQty > 0) {
        item.colors[color][size] = newQty;
        newTotal += newQty;
      } else {
        delete item.colors[color][size];
      }
    });

    if (newTotal === 0) {
      // If all quantities for this color are 0, remove the color
      delete item.colors[color];
      if (Object.keys(item.colors).length === 0) {
        // If no colors left, remove the item from cart
        cart.splice(itemIndex, 1);
      }
    }

    updateCartSummary();
    if (isOrderSummaryModal) {
      updateModalCartSummary();
    }

    console.log("Cart updated:", cart);
  } catch (error) {
    console.error("Error in editCartSummaryItem:", error);
    alert(
      "An error occurred while trying to save the changes. Please try again."
    );
  }
}
function deleteCartItem(itemIndex, color, isOrderSummaryModal) {
  const item = cart[itemIndex];
  delete item.colors[color];
  if (Object.keys(item.colors).length === 0) {
    cart.splice(itemIndex, 1);
  }

  updateCartSummary();
  if (isOrderSummaryModal) {
    updateModalCartSummary();
  }
} 

// --------Modals
function createModal(partyName, dateTime, orderNumber) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "orderConfirmationModal";
  modal.setAttribute("tabindex", "-1");
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Order Confirmation</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p><strong>Party Name:</strong> ${partyName}</p>
          <p><strong>Date and Time:</strong> ${new Date(dateTime).toLocaleString()}</p>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}


function updateModalContent(orderNumber) {
  document.getElementById("orderNumberSpan").textContent = orderNumber;
}


function showOrderSummaryModal() {
  console.log("showOrderSummaryModal function called");
  try {
    // Remove existing modal if present
    const existingModal = document.getElementById("orderSummaryModal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "orderSummaryModal";
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Order Summary</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Loading order summary...</p>
          </div>
          <div class="modal-footer flex-column align-items-stretch">
            <div class="mb-3 w-100">
              <label for="orderNote" class="form-label">Order Note:</label>
              <textarea class="form-control" id="orderNote" rows="3" placeholder="Enter any special instructions here..."></textarea>
            </div>
            <div class="d-flex justify-content-end">
              <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="placeOrderBtn">Place Order</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const modalInstance = new bootstrap.Modal(document.getElementById("orderSummaryModal"));
    modalInstance.show();

    console.log("Modal created and shown");

    // We'll add the content after the modal is shown
    setTimeout(() => {
      try {
        const modalBody = document.querySelector("#orderSummaryModal .modal-body");
        modalBody.innerHTML = `
          <p><strong>Party Name:</strong> <span id="modalPartyName"></span></p>
          <div id="modalCartSummary"></div>
          <p><strong>Total Quantity:</strong> <span id="modalTotalQuantity"></span></p>
        `;

        document.getElementById("modalPartyName").textContent = document.getElementById("partySearch").value;
        updateModalCartSummary();

        // Add event listener to the Place Order button
        document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

        console.log("Modal content updated");
      } catch (innerError) {
        console.error("Error updating modal content:", innerError);
        document.querySelector("#orderSummaryModal .modal-body").innerHTML = `<p>Error loading order summary. Please try again.</p>`;
      }
    }, 100);
  } catch (error) {
    console.error("Error in showOrderSummaryModal:", error);
    alert("An error occurred while showing the order summary. Please try again.");
  }
}

/* function showOrderSummaryModal() {
  console.log("showOrderSummaryModal function called");
  try {
    // Remove existing modal if present
    const existingModal = document.getElementById("orderSummaryModal");
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "orderSummaryModal";
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Order Summary</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Loading order summary...</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="placeOrderBtn">Place Order</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const modalInstance = new bootstrap.Modal(document.getElementById("orderSummaryModal"));
    modalInstance.show();

    console.log("Modal created and shown");

    // We'll add the content after the modal is shown
    setTimeout(() => {
      try {
        const modalBody = document.querySelector("#orderSummaryModal .modal-body");
        modalBody.innerHTML = `
          <p><strong>Party Name:</strong> <span id="modalPartyName"></span></p>
          <div id="modalCartSummary"></div>
          <p><strong>Total Quantity:</strong> <span id="modalTotalQuantity"></span></p>
        `;

        document.getElementById("modalPartyName").textContent = document.getElementById("partySearch").value;
        updateModalCartSummary();

        // Add event listener to the Place Order button
        document.getElementById("placeOrderBtn").addEventListener("click", handlePlaceOrder);

        console.log("Modal content updated");
      } catch (innerError) {
        console.error("Error updating modal content:", innerError);
        document.querySelector("#orderSummaryModal .modal-body").innerHTML = `<p>Error loading order summary. Please try again.</p>`;
      }
    }, 100);


  } catch (error) {
    console.error("Error in showOrderSummaryModal:", error);
    alert("An error occurred while showing the order summary. Please try again.");
  } 
  
}*/
function showEditItemModal(itemIndex, color, isOrderSummaryModal = false) {
  const item = cart[itemIndex];
  const sizes = Object.keys(item.colors[color]);

  const existingModal = document.getElementById("editItemModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.id = "editItemModal";
  modal.setAttribute("tabindex", "-1");
  modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Item: ${
                      item.name
                    } (${color})</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    ${sizes
                      .map(
                        (size) => `
                        <div class="mb-3 d-flex align-items-center">
                            <label class="form-label me-2 mb-0" style="width: 50px;">${size}</label>
                            <div class="input-group" style="width: 150px;">
                                <button class="btn btn-outline-secondary minus-btn" type="button" data-size="${size}">-</button>
                                <input type="number" class="form-control text-center" id="qty_${size}" value="${
                          item.colors[color][size] || 0
                        }" min="0" readonly>
                                <button class="btn btn-outline-secondary plus-btn" type="button" data-size="${size}">+</button>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" id="deleteItemBtn">Delete Item</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveItemBtn">Save Changes</button>
                </div>
            </div>
        </div>
    `;
  document.body.appendChild(modal);

  const editModalInstance = new bootstrap.Modal(
    document.getElementById("editItemModal")
  );

  // Add event listeners for plus and minus buttons
  modal.querySelectorAll(".minus-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateQuantity(btn.dataset.size, -1));
  });
  modal.querySelectorAll(".plus-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateQuantity(btn.dataset.size, 1));
  });

  document.getElementById("saveItemBtn").addEventListener("click", () => {
    saveItemChanges(itemIndex, color, isOrderSummaryModal);
    editModalInstance.hide();
  });

  document.getElementById("deleteItemBtn").addEventListener("click", () => {
    deleteCartItem(itemIndex, color, isOrderSummaryModal);
    editModalInstance.hide();
  });

  editModalInstance.show();
}
function saveItemChanges(itemIndex, color, isOrderSummaryModal) {
  const item = cart[itemIndex];
  const sizes = Object.keys(item.colors[color]);
  let totalQuantity = 0;

  sizes.forEach((size) => {
    const newQty = parseInt(document.getElementById(`qty_${size}`).value);
    if (newQty > 0) {
      item.colors[color][size] = newQty;
      totalQuantity += newQty;
    } else {
      delete item.colors[color][size];
    }
  });

  if (totalQuantity === 0) {
    delete item.colors[color];
    if (Object.keys(item.colors).length === 0) {
      cart.splice(itemIndex, 1);
    }
  }

  updateCartSummary();
  if (isOrderSummaryModal) {
    updateModalCartSummary();
  }
}

function updateModalCartSummary() {
  const modalBody = document.querySelector("#orderSummaryModal .modal-body");
  if (!modalBody) {
    console.error("Modal body not found");
    return;
  }

  const partyName = document.getElementById("partySearch").value || "N/A";
  let totalQuantity = 0;

  let modalContent = `
        <p><strong>Party Name:</strong> ${partyName}</p>
        <table class="table table-bordered table-hover modal-cart-summary">
            <thead>
                <tr>
                    <th>Item Name & Color</th>
                    <th>Sizes and Qty</th>
                    <th>Item Total</th>
                </tr>
            </thead>
            <tbody>
    `;

  if (!Array.isArray(cart) || cart.length === 0) {
    modalContent += '<tr><td colspan="3">No items in cart</td></tr>';
  } else {
    cart.forEach((item, index) => {
      if (!item || typeof item !== "object") return;

      Object.entries(item.colors || {}).forEach(([color, sizes]) => {
        if (typeof sizes === "object") {
          let itemTotal = 0;
          let sizesAndQty = [];

          Object.entries(sizes).forEach(([size, qty]) => {
            if (qty > 0) {
              sizesAndQty.push(`${size}/${qty}`);
              itemTotal += qty;
              totalQuantity += qty;
            }
          });

          if (itemTotal > 0) {
            modalContent += `
                            <tr class="clickable-row" data-index="${index}" data-color="${color}">
                                <td>${item.name} (${color})</td>
                                <td>${sizesAndQty.join(", ") || "N/A"}</td>
                                <td>${itemTotal}</td>
                            </tr>
                        `;
          }
        }
      });
    });
  }

  modalContent += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2"><strong>Total Quantity</strong></td>
                    <td><strong>${totalQuantity}</strong></td>
                </tr>
            </tfoot>
        </table>
    `;

  modalBody.innerHTML = modalContent;

  // Add click event listener to rows
  modalBody.querySelectorAll(".clickable-row").forEach((row) => {
    row.addEventListener("click", function () {
      const itemIndex = parseInt(this.dataset.index);
      const color = this.dataset.color;
      showEditItemModal(itemIndex, color, true);
    });
  });
}

function showOrderConfirmationModal(order, imgData) {
  console.log("Showing order confirmation modal");
  
  // Remove any existing modal
  const existingModal = document.getElementById("orderConfirmationModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create the modal
  const modal = createModal(order.partyName, order.dateTime, order.orderNumber);
  
  // Add advanced animation to the modal
  const animationContainer = document.createElement('div');
  animationContainer.className = 'confirmation-animation';
  animationContainer.innerHTML = `
    <div class="circle"></div>
    <div class="checkmark"></div>
    <div class="pulse"></div>
  `;
  modal.querySelector('.modal-body').prepend(animationContainer);

  // Add styles for the animation
  const style = document.createElement('style');
  style.textContent = `
    .confirmation-animation {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 20px auto;
    }
    .circle {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #23b26d;
      opacity: 0;
      animation: circleAnimation 0.5s forwards;
    }
    .checkmark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 30%;
      height: 60%;
      border-right: 12px solid white;
      border-bottom: 12px solid white;
      transform: translate(-50%, -60%) rotate(45deg) scale(0);
      animation: checkmarkAnimation 0.5s 0.5s forwards;
    }
    .pulse {
      position: absolute;
      top: -5%;
      left: -5%;
      width: 110%;
      height: 110%;
      border-radius: 50%;
      border: 5px solid #23b26d;
      opacity: 0;
      animation: pulseAnimation 2s 1s infinite;
    }
    @keyframes circleAnimation {
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes checkmarkAnimation {
      to { transform: translate(-50%, -60%) rotate(45deg) scale(1); }
    }
    @keyframes pulseAnimation {
      0% { transform: scale(1); opacity: 0.7; }
      100% { transform: scale(1.1); opacity: 0; }
    }
    .modified-order {
      color: #ff6600;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  // Update order number display
  const orderNumberElement = modal.querySelector('.order-number');
  if (orderNumberElement) {
    orderNumberElement.textContent = order.orderNumber;
    if (order.orderNumber.startsWith('Modified')) {
      orderNumberElement.classList.add('modified-order');
    }
  }

  document.body.appendChild(modal);

  // Initialize the modal
  let modalInstance;
  try {
    modalInstance = new bootstrap.Modal(document.getElementById("orderConfirmationModal"));
  } catch (error) {
    console.error("Error initializing modal:", error);
    alert("There was an error showing the order confirmation. Your order has been placed successfully.");
    return;
  }

  // Add event listener for modal hidden event
  modal.addEventListener('hidden.bs.modal', function () {
    window.location.reload();
  });

  // Show modal
  modalInstance.show();

  // Play advanced confirmation sound
  playAdvancedConfirmationSound();
  //sendWebPushNotification(order.partyName);
  // Send notification to Telegram
  sendTelegramNotification(order.partyName, order.totalQuantity, order.orderNumber, imgData);

  // Update pending orders list
  loadPendingOrders();
}

function sendWebPushNotification(partyName) {
  const apiKey = 'b285a62d89f9a1576f806016b692f5b4';
  const token = '98413';

  const payload = {
    badge:'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png',
    title: 'KA OMS',
    message: `New Order for ${partyName}`,
    target_url: 'https://ka-oms.netlify.app', // Replace with your website URL
    icon: 'https://i.postimg.cc/BQ2J7HGM/03042020043247760-brlo.png'
  };

  fetch('https://api.webpushr.com/v1/notification/send/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webpushrKey': apiKey,
      'webpushrAuthToken': token
    },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => console.log('Notification sent:', data))
  .catch(error => console.error('Error sending notification:', error));
}

// Helper function to create the modal structure
function createModal(partyName, dateTime, orderNumber) {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'orderConfirmationModal';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('aria-labelledby', 'orderConfirmationModalLabel');
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="orderConfirmationModalLabel">Order Confirmation</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p>Thank you for your order!</p>
          <p>Party Name: ${partyName}</p>
          <p>Date & Time: ${new Date(dateTime).toLocaleString()}</p>
          <p>Order Number: <span class="order-number">${orderNumber}</span></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;

  return modal;
}

// ---------------Order Processing
// ---------------Order Processing
function handlePlaceOrder() {
  const placeOrderBtn = document.getElementById("placeOrderBtn");
  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Processing...";
  
  const partyName = document.getElementById("partySearch").value;
  const dateTime = new Date();
  const formattedDate = dateTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const orderNote = document.getElementById("orderNote").value.trim();

  try {
    // Create a new PDF document
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set document metadata
    doc.setProperties({
      title: `Order for ${partyName}`,
      subject: 'Order Summary',
      author: 'KA OMS',
      keywords: 'order, summary',
      creator: 'KA OMS System'
    });

    // Add header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(`Order Summary - ${partyName}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date: ${formattedDate}         -`, 105, 30, { align: 'right' });
    doc.text(`-       Created by: ${username}`, 105, 30, { align: 'left' }); 

    // Add a line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);

    // Prepare data for the table
    const tableData = [];
    let totalQuantity = 0;

    cart.forEach(item => {
      Object.entries(item.colors).forEach(([color, sizes]) => {
        let colorTotal = 0;
        const sizeDetails = [];
        
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty > 0) {
            sizeDetails.push(`${size}: ${qty}`);
            colorTotal += qty;
            totalQuantity += qty;
          }
        });

        if (colorTotal > 0) {
          tableData.push({
            item: item.name,
            color: color,
            sizes: sizeDetails.join(', '),
            total: colorTotal
          });
        }
      });
    });

    // Add the table
    doc.autoTable({
      startY: 40,
      head: [['Item', 'Color', 'Size/Qty', 'Total']],
      body: tableData.map(row => [row.item, row.color, row.sizes, row.total]),
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20 }
      },
      margin: { top: 40 },
      didDrawPage: function(data) {
        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageCount}`, 105, 285, { align: 'center' });
      }
    });

    // Add totals
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Total Quantity: ${totalQuantity}`, 20, finalY);

    // Add order notes if present
    if (orderNote) {
      const notesY = finalY + 10;
      doc.setFontSize(12);
      doc.text('Order Notes:', 20, notesY);
      
      // Split notes into multiple lines if needed
      const splitNotes = doc.splitTextToSize(orderNote, 170);
      doc.setFontSize(10);
      doc.text(splitNotes, 20, notesY + 7);
    }

    // Save the PDF
    const fileName = `${partyName.replace(/[^a-z0-9]/gi, '_')}_${formattedDate.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(fileName);

    // Continue with order processing...
    getNextOrderNumber()
      .then((orderNumber) => {
        const newOrder = {
          orderNumber: orderNumber,
          partyName: partyName,
          dateTime: dateTime.toISOString(),
          items: cart,
          status: "Pending",
          totalQuantity: totalQuantity,
          orderNote: orderNote,
          createdBy: username
        };
        return saveOrderToFirebase(newOrder).then(() => newOrder);
      })
      .then((order) => {
        console.log("Order saved successfully:", order);
        
        // Close the order summary modal
        const orderSummaryModal = bootstrap.Modal.getInstance(document.getElementById("orderSummaryModal"));
        if (orderSummaryModal) {
          orderSummaryModal.hide();
        }

        // Show the order confirmation modal
        try {
          showOrderConfirmationModal(order);
        } catch (error) {
          console.error("Error showing confirmation modal:", error);
          }

        // Reset the cart and update UI
        try {
          resetCart();
          updateCartButtonText(0);
          console.log("Cart reset and UI updated");
        } catch (resetError) {
          console.error("Error resetting cart:", resetError);
        }

        // Update pending orders list
        loadPendingOrders();
      })
      .catch((error) => {
        console.error("Error in order placement process:", error);
        alert("An error occurred during the order process. Please try again.");
      })
      .finally(() => {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
      });
  } catch (error) {
    console.error("Error creating PDF:", error);
    alert("An error occurred while creating the PDF. Please try again.");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }
}



function saveOrderToFirebase(order) {
  console.log('Saving order to Firebase:', order);
  
  if (order.key) {
    // Update existing order
    return firebase.database().ref(`orders/${order.key}`).set(order)
      .then(() => {
        console.log('Order updated successfully');
        return order;
      })
      .catch((error) => {
        console.error('Error updating order:', error);
        throw error;
      });
  } else {
    // Create new order
    return firebase.database().ref("orders").push(order)
      .then((ref) => {
        console.log('New order created successfully');
        order.key = ref.key;
        return order;
      })
      .catch((error) => {
        console.error('Error creating new order:', error);
        throw error;
      });
  }
}

function getNextOrderNumber(maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    function attempt(retriesLeft) {
      firebase
        .database()
        .ref("orderCounter")
        .transaction((current) => {
          return (current || 0) + 1;
        })
        .then((result) => {
          if (result.committed) {
            resolve(`K${result.snapshot.val()}`);
          } else {
            throw new Error("Failed to commit transaction");
          }
        })
        .catch((error) => {
          console.error(
            `Error getting next order number (${
              maxRetries - retriesLeft + 1
            }/${maxRetries}):`,
            error
          );
          if (retriesLeft > 0) {
            setTimeout(() => attempt(retriesLeft - 1), delay);
          } else {
            reject(
              new Error("Max retries reached. Unable to get next order number.")
            );
          }
        });
    }
    attempt(maxRetries);
  });
}


//----------------Miscellaneous
function createCategoryRadios(categories) {
  return `
        <div class="category-container">
            ${categories
              .map(
                (cat, index) => `
                <label>
                    <input type="radio" name="category" value="${cat}" ${
                  index === 0 ? "checked" : ""
                }>
                    ${cat}
                </label>
            `
              )
              .join("")}
        </div>
    `;
}

  //-------------------------------non important--------------------------------
 
  
  function loadNewItemsFromFirebase() {
    return firebase
      .database()
      .ref("items")
      .once("value")
      .then((snapshot) => {
        const firebaseItems = snapshot.val();
        if (firebaseItems) {
          // Convert Firebase object to array
          const firebaseItemsArray = Object.entries(firebaseItems).map(
            ([key, value]) => ({
              name: key.replace("_", "."),
              ...value,
            })
          );
  
          // Merge existing items with new items from Firebase
          items = items.filter(
            (item) =>
              !firebaseItemsArray.some((fbItem) => fbItem.name === item.name)
          );
          items = [...items, ...firebaseItemsArray];
  
          // Sort items by name
          items.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
  
          // Update the item search datalist
          updateItemSearchDatalist();
  
          console.log("Items loaded from Firebase:", items);
        }
      })
      .catch((error) => {
        console.error("Error loading items from Firebase:", error);
      });
  }


// Variables for modal control
let colorDetailsTimeout;
const colorDetailsModal = document.getElementById('colorDetailsModal');
const colorDetailsOverlay = document.getElementById('colorDetailsOverlay');
const colorPaletteIcon = document.getElementById('colorPaletteIcon');
const colorDetailsClose = document.getElementById('colorDetailsClose');

// Function to show modal
function showColorDetailsModal(item) {
    if (!item || !item.colorname) return;
    
    const colorDetailsList = document.getElementById('colorDetailsList');
    colorDetailsList.innerHTML = '';
    
    // Populate color details
    item.colorname.forEach(colorInfo => {
        const li = document.createElement('li');
        li.className = 'enamor-color-details-item';
        li.textContent = colorInfo;
        colorDetailsList.appendChild(li);
    });
    
    // Show modal and overlay
    colorDetailsModal.style.display = 'block';
    colorDetailsOverlay.style.display = 'block';
    
    // Set auto-close timeout
    clearTimeout(colorDetailsTimeout);
    colorDetailsTimeout = setTimeout(closeColorDetailsModal, 4500);
}

// Function to close modal
function closeColorDetailsModal() {
    colorDetailsModal.style.display = 'none';
    colorDetailsOverlay.style.display = 'none';
    clearTimeout(colorDetailsTimeout);
}

// Function to update color palette icon visibility
function updateColorPaletteIcon() {
    const itemDetailsContainer = document.getElementById('itemDetailsContainer');
    if (itemDetailsContainer) {
        const itemName = itemDetailsContainer.querySelector('h3')?.textContent;
        const currentItem = items.find(i => i.name === itemName);
        colorPaletteIcon.style.display = currentItem?.colorname ? 'inline' : 'none';
    } else {
        colorPaletteIcon.style.display = 'none';
    }
}

// Event listeners
colorPaletteIcon.addEventListener('click', () => {
    const itemName = document.querySelector('#itemDetailsContainer h3')?.textContent;
    const currentItem = items.find(i => i.name === itemName);
    showColorDetailsModal(currentItem);
});

colorDetailsClose.addEventListener('click', closeColorDetailsModal);
colorDetailsOverlay.addEventListener('click', closeColorDetailsModal);

// Observe DOM changes to update color palette icon visibility
const colorDetailsObserver = new MutationObserver(updateColorPaletteIcon);
colorDetailsObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial check for icon visibility
updateColorPaletteIcon();



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

     
//salesman pdf upload
// Updated PDF Upload Modal Creation
function createPdfUploadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'pdfUploadModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'pdfUploadModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="pdfUploadModalLabel">Upload PDF Order</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="pdfFile" class="form-label">Select PDF file</label>
                        <input class="form-control" type="file" id="pdfFile" accept=".pdf">
                    </div>
                    <div class="mb-3">
                        <label for="pdfDescription" class="form-label">Description (optional)</label>
                        <textarea class="form-control" id="pdfDescription" rows="2"></textarea>
                    </div>
                    
                    <!-- PDF Content Preview -->
                    <div id="pdfPreviewContainer" style="display: none;">
                        <hr>
                        <h6>Extracted Order Details:</h6>
                        <div id="extractedContent"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="uploadPdfBtn">Parse PDF</button>
                    <button type="button" class="btn btn-warning" id="reParsePdfBtn" style="display: none;">Re-parse PDF</button>
                    <button type="button" class="btn btn-success" id="uploadOrderBtn" style="display: none;">Upload Order</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('uploadPdfBtn').addEventListener('click', handlePdfUpload);
    document.getElementById('reParsePdfBtn').addEventListener('click', handleReParsePdf);
    document.getElementById('uploadOrderBtn').addEventListener('click', uploadParsedOrder);
}

// Global variable to store parsed order data
let parsedOrderData = null;

// Updated PDF Upload Handler
function handlePdfUpload() {
    const fileInput = document.getElementById('pdfFile');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a PDF file to upload.');
        return;
    }
    
    const file = fileInput.files[0];
    const uploadBtn = document.getElementById('uploadPdfBtn');
    
    // Disable button and show loading
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Parsing...';
    
    // Use PDF.js to extract text
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            let fullTextContent = '';
            const numPages = pdf.numPages;
            let pagesProcessed = 0;
            const pageTexts = [];
            
            console.log(`PDF has ${numPages} pages`);
            
            // Extract text from all pages sequentially
            const extractPage = (pageNum) => {
                return pdf.getPage(pageNum).then(function(page) {
                    return page.getTextContent().then(function(content) {
                        // Extract text items with positions for better parsing
                        const textItems = content.items.map(item => ({
                            text: item.str,
                            x: item.transform[4],
                            y: item.transform[5],
                            height: item.height
                        }));
                        
                        // Sort items by y position (top to bottom) then x position (left to right)
                        textItems.sort((a, b) => {
                            const yDiff = b.y - a.y; // Reverse because PDF y increases upward
                            if (Math.abs(yDiff) < 5) { // Same line
                                return a.x - b.x; // Left to right
                            }
                            return yDiff;
                        });
                        
                        // Group items by rows
                        const rows = [];
                        let currentRow = [];
                        let lastY = null;
                        
                        textItems.forEach(item => {
                            if (lastY === null || Math.abs(item.y - lastY) > 5) {
                                if (currentRow.length > 0) {
                                    rows.push(currentRow.map(r => r.text).join(' '));
                                    currentRow = [];
                                }
                            }
                            currentRow.push(item);
                            lastY = item.y;
                        });
                        
                        if (currentRow.length > 0) {
                            rows.push(currentRow.map(r => r.text).join(' '));
                        }
                        
                        const pageText = rows.join('\n');
                        console.log(`Page ${pageNum} text:`, pageText.substring(0, 200) + '...');
                        return pageText;
                    });
                });
            };
            
            // Process pages sequentially
            let promise = Promise.resolve();
            for (let i = 1; i <= numPages; i++) {
                promise = promise.then(() => {
                    return extractPage(i).then(pageText => {
                        pageTexts.push(pageText);
                        fullTextContent += pageText + '\n';
                        pagesProcessed++;
                        
                        console.log(`Processed page ${pagesProcessed}/${numPages}`);
                        
                        // Update progress
                        uploadBtn.textContent = `Parsing... ${pagesProcessed}/${numPages}`;
                        
                        if (pagesProcessed === numPages) {
                            console.log('All pages processed, starting content parsing...');
                            parsePdfContent(fullTextContent);
                        }
                    });
                });
            }
            
        }).catch(function(error) {
            console.error('Error parsing PDF:', error);
            alert('Error parsing PDF. Please make sure it\'s a valid PDF file.');
            resetUploadButtons();
        });
    };
    
    fileReader.readAsArrayBuffer(file);
}

// Function to handle re-parsing PDF
function handleReParsePdf() {
    // Reset the preview and buttons
    document.getElementById('pdfPreviewContainer').style.display = 'none';
    document.getElementById('reParsePdfBtn').style.display = 'none';
    document.getElementById('uploadOrderBtn').style.display = 'none';
    document.getElementById('uploadPdfBtn').style.display = 'inline-block';
    
    // Clear parsed data
    parsedOrderData = null;
    
    // Re-trigger the parsing
    handlePdfUpload();
}

// Function to parse extracted PDF content
function parsePdfContent(textContent) {
    try {
        console.log('Extracted text:', textContent);
        
        // Extract outlet name (party name)
        const outletMatch = textContent.match(/Outlet Name\s*:\s*([^[\]]+)(?:\s*\[[^\]]+\])?/i);
        let partyName = '';
        
        if (outletMatch) {
            partyName = outletMatch[1].trim();
        } else {
            // Fallback: look for patterns like "PUJA S [144253]"
            const fallbackMatch = textContent.match(/([A-Z\s]+)\s*\[\d+\]/);
            if (fallbackMatch) {
                partyName = fallbackMatch[1].trim();
            }
        }
        
        if (!partyName) {
            throw new Error('Could not extract party name from PDF');
        }
        
        // Extract items - look for SKU patterns
        const items = [];
        const lines = textContent.split(/\n|\r\n|\r/).filter(line => line.trim());
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for item pattern: number followed by SKU (contains hyphens and commas)
            const itemMatch = line.match(/^\d+\s+([A-Z0-9\-]+)[,\s]+([A-Z]+)[,\s]+([A-Z0-9]+)\s+(\d+)\s+([A-Z0-9]+)\s+([\d.]+)$/);
            
            if (itemMatch) {
                const [, skuBase, color, size, qty, sizeConfirm, value] = itemMatch;
                
                // Extract item name (everything before first hyphen)
                const itemName = skuBase.split('-')[0];
                
                items.push({
                    itemName: itemName,
                    color: color,
                    size: size,
                    quantity: parseInt(qty),
                    value: parseFloat(value)
                });
            } else {
                // Alternative pattern matching for different formats
                const altMatch = line.match(/(\w+(?:-\w+)*)[,\s]+([A-Z]+)[,\s]+([A-Z0-9]+)\s+(\d+)\s+([A-Z0-9]+)\s+([\d.]+)/);
                if (altMatch) {
                    const [, fullSku, color, size, qty, sizeConfirm, value] = altMatch;
                    const itemName = fullSku.split('-')[0];
                    
                    items.push({
                        itemName: itemName,
                        color: color,
                        size: size,
                        quantity: parseInt(qty),
                        value: parseFloat(value)
                    });
                }
            }
        }
        
        if (items.length === 0) {
            throw new Error('No items found in PDF. Please check the format.');
        }
        
        // Process items into cart format
        const cartItems = processItemsToCartFormat(items);
        
        // Calculate total quantity
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Store parsed data
        parsedOrderData = {
            partyName: partyName,
            items: cartItems,
            totalQuantity: totalQuantity,
            originalItems: items
        };
        
        // Display extracted content
        displayExtractedContent(parsedOrderData);
        
        // Update button visibility - show both Re-parse and Upload buttons
        document.getElementById('uploadPdfBtn').style.display = 'none';
        document.getElementById('reParsePdfBtn').style.display = 'inline-block';
        document.getElementById('uploadOrderBtn').style.display = 'inline-block';
        
    } catch (error) {
        console.error('Error parsing PDF content:', error);
        alert('Error parsing PDF content: ' + error.message);
        resetUploadButtons();
    }
}

// Function to convert items to cart format
function processItemsToCartFormat(items) {
    const cartItems = {};
    
    items.forEach(item => {
        const itemName = item.itemName;
        
        if (!cartItems[itemName]) {
            cartItems[itemName] = {
                name: itemName,
                colors: {}
            };
        }
        
        if (!cartItems[itemName].colors[item.color]) {
            cartItems[itemName].colors[item.color] = {};
        }
        
        if (!cartItems[itemName].colors[item.color][item.size]) {
            cartItems[itemName].colors[item.color][item.size] = 0;
        }
        
        cartItems[itemName].colors[item.color][item.size] += item.quantity;
    });
    
    return Object.values(cartItems);
}

// Function to display extracted content
function displayExtractedContent(data) {
    const container = document.getElementById('extractedContent');
    const previewContainer = document.getElementById('pdfPreviewContainer');
    
    let html = `
        <div class="card">
            <div class="card-body">
                <h6 class="card-title">Party Name: ${data.partyName}</h6>
                <p class="card-text"><strong>Total Quantity: ${data.totalQuantity}</strong></p>
                
                <h6>Items:</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>Quantity</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    data.originalItems.forEach(item => {
        html += `
            <tr>
                <td>${item.itemName}</td>
                <td>${item.color}</td>
                <td>${item.size}</td>
                <td>${item.quantity}</td>
                <td>${item.value.toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    previewContainer.style.display = 'block';
}

// Updated function to upload parsed order (renamed from saveParsedOrder)
function uploadParsedOrder() {
    if (!parsedOrderData) {
        alert('No order data to upload.');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadOrderBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    
    const description = document.getElementById('pdfDescription').value.trim();
    const dateTime = new Date();
    
    // Get next order number and save
    getNextOrderNumber()
        .then((orderNumber) => {
            const newOrder = {
                orderNumber: orderNumber,
                partyName: parsedOrderData.partyName,
                dateTime: dateTime.toISOString(),
                items: parsedOrderData.items,
                status: "Pending",
                totalQuantity: parsedOrderData.totalQuantity,
                orderNote: description || 'Order created from PDF upload',
                createdBy: username || 'PDF Import',
                source: 'PDF Import'
            };
            
            return saveOrderToFirebase(newOrder).then(() => newOrder);
        })
        .then((order) => {
            console.log("PDF Order uploaded successfully:", order);
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('pdfUploadModal'));
            if (modal) {
                modal.hide();
            }
            
            // Show success message
            alert(`Order ${order.orderNumber} created successfully from PDF for ${order.partyName}!`);
            
            // Reset form
            resetPdfUploadForm();
            
            // Refresh pending orders
            if (typeof loadPendingOrders === 'function') {
                loadPendingOrders();
            }
        })
        .catch((error) => {
            console.error("Error uploading PDF order:", error);
            alert("Error uploading order. Please try again.");
        })
        .finally(() => {
            uploadBtn.disabled = false;
            uploadBtn.textContent = originalText;
        });
}

// Helper function to reset upload buttons
function resetUploadButtons() {
    document.getElementById('uploadPdfBtn').disabled = false;
    document.getElementById('uploadPdfBtn').textContent = 'Parse PDF';
    document.getElementById('uploadPdfBtn').style.display = 'inline-block';
    
    document.getElementById('reParsePdfBtn').style.display = 'none';
    document.getElementById('uploadOrderBtn').style.display = 'none';
}

// Helper function to reset form
function resetPdfUploadForm() {
    document.getElementById('pdfFile').value = '';
    document.getElementById('pdfDescription').value = '';
    document.getElementById('pdfPreviewContainer').style.display = 'none';
    resetUploadButtons();
    parsedOrderData = null;
}


// function for order pdf upload and item data uploadation
// Updated function to show PDF upload button and Item Data button
function showPdfUploadButton() {
    const ordersHeader = document.querySelector('.enamor-orders-header');
    
    // Check if the PDF upload button already exists
    if (!document.getElementById('pdfUploadBtn')) {
        const pdfUploadBtn = document.createElement('button');
        pdfUploadBtn.id = 'pdfUploadBtn';
        pdfUploadBtn.className = 'btn btn-outline-primary btn-sm ms-2';
        pdfUploadBtn.innerHTML = '<i class="bi bi-upload"></i> Upload PDF Order';
        pdfUploadBtn.setAttribute('data-bs-toggle', 'modal');
        pdfUploadBtn.setAttribute('data-bs-target', '#pdfUploadModal');
        
        ordersHeader.appendChild(pdfUploadBtn);
        
        // Create the modal if it doesn't exist
        if (!document.getElementById('pdfUploadModal')) {
            createPdfUploadModal();
        }
    }
    
    // Show Item Data button only for HEMANT(ADMIN)
    if (username === 'HEMANT(ADMIN)') {
        showItemDataButton();
    }
}

// Function to show Item Data button (exclusive to HEMANT)
function showItemDataButton() {
    const ordersHeader = document.querySelector('.enamor-orders-header');
    
    // Check if the button already exists
    if (!document.getElementById('itemDataBtn')) {
        const itemDataBtn = document.createElement('button');
        itemDataBtn.id = 'itemDataBtn';
        itemDataBtn.className = 'btn btn-outline-success btn-sm ms-2';
        itemDataBtn.innerHTML = '<i class="bi bi-database"></i> Item Data';
        itemDataBtn.setAttribute('data-bs-toggle', 'modal');
        itemDataBtn.setAttribute('data-bs-target', '#itemDataModal');
        
        ordersHeader.appendChild(itemDataBtn);
        
        // Create the modal if it doesn't exist
        if (!document.getElementById('itemDataModal')) {
            createItemDataModal();
        }
    }
}

// Function to create Item Data modal
function createItemDataModal() {
    const modalHTML = `
        <div class="modal fade" id="itemDataModal" tabindex="-1" aria-labelledby="itemDataModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title" id="itemDataModalLabel">
                            <i class="bi bi-database"></i> Item Data Management
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info" role="alert">
                            <i class="bi bi-info-circle"></i> Upload an Excel file (.xlsx or .xls) to update item data.
                        </div>
                        
                        <!-- Last Update Info -->
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title">Last Update Information</h6>
                                <p class="card-text mb-1">
                                    <strong>Last Updated:</strong> 
                                    <span id="lastUpdateDate" class="text-muted">Never updated</span>
                                </p>
                                <p class="card-text mb-0">
                                    <strong>Total Items:</strong> 
                                    <span id="totalItems" class="text-muted">0</span>
                                </p>
                            </div>
                        </div>
                        
                        <!-- File Upload Section -->
                        <div class="mb-3">
                            <label for="itemDataFile" class="form-label">
                                <strong>Select Excel File</strong>
                            </label>
                            <input type="file" class="form-control" id="itemDataFile" 
                                   accept=".xlsx,.xls" required>
                            <div class="form-text">
                                Supported formats: .xlsx, .xls
                            </div>
                        </div>
                        
                        <!-- Header Row Selection -->
                        <div id="headerRowSection" class="mb-3 d-none">
                            <label for="headerRowInput" class="form-label">
                                <strong>Header Row Number</strong>
                            </label>
                            <input type="number" class="form-control" id="headerRowInput" 
                                   min="1" value="1" placeholder="Enter row number (e.g., 1, 2, 3)">
                            <div class="form-text">
                                Specify which row contains the column headers (default is row 1)
                            </div>
                        </div>
                        
                        <!-- Preview Section -->
                        <div id="itemDataPreview" class="d-none">
                            <h6>Data Preview (First 5 rows)</h6>
                            <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                                <table class="table table-sm table-bordered" id="previewTable">
                                    <thead class="table-light"></thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <p class="text-muted small">
                                <strong>Total rows to be uploaded:</strong> <span id="totalRowCount">0</span>
                            </p>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div id="uploadProgress" class="d-none mt-3">
                            <div class="progress">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                     role="progressbar" style="width: 0%" id="uploadProgressBar">0%</div>
                            </div>
                            <p class="text-center mt-2 mb-0" id="uploadStatus">Processing...</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-success" id="uploadItemDataBtn" disabled>
                            <i class="bi bi-cloud-upload"></i> Upload Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Initialize event listeners
    initializeItemDataListeners();
    
    // Load last update info when modal opens
    document.getElementById('itemDataModal').addEventListener('show.bs.modal', loadLastUpdateInfo);
}

// Initialize event listeners for item data modal
function initializeItemDataListeners() {
    const fileInput = document.getElementById('itemDataFile');
    const uploadBtn = document.getElementById('uploadItemDataBtn');
    const headerRowInput = document.getElementById('headerRowInput');
    
    // File selection handler
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            // Show header row selection
            document.getElementById('headerRowSection').classList.remove('d-none');
            
            // Store file in window for reprocessing
            window.currentItemFile = file;
            
            // Initial preview with default header row
            await previewItemData(file, 1);
            uploadBtn.disabled = false;
        } else {
            uploadBtn.disabled = true;
            document.getElementById('itemDataPreview').classList.add('d-none');
            document.getElementById('headerRowSection').classList.add('d-none');
            window.currentItemFile = null;
        }
    });
    
    // Header row input handler - update preview in real-time
    headerRowInput.addEventListener('input', async function() {
        const headerRow = parseInt(this.value);
        if (window.currentItemFile && headerRow > 0) {
            await previewItemData(window.currentItemFile, headerRow);
        }
    });
    
    // Upload button handler
    uploadBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        const headerRow = parseInt(headerRowInput.value) || 1;
        if (file) {
            await uploadItemData(file, headerRow);
        }
    });
}

// Function to preview Excel data
async function previewItemData(file, headerRow = 1) {
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Validate header row
        if (headerRow < 1 || headerRow > range.e.r + 1) {
            alert(`Invalid header row. Please enter a value between 1 and ${range.e.r + 1}`);
            return;
        }
        
        // Adjust the range to start from the header row
        const adjustedRange = {
            s: { r: headerRow - 1, c: range.s.c },
            e: { r: range.e.r, c: range.e.c }
        };
        
        // Convert to JSON with specified header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            range: adjustedRange,
            defval: '',
            raw: false
        });
        
        if (jsonData.length === 0) {
            alert('No data found below the specified header row. Please check your Excel file.');
            return;
        }
        
        // Store the parsed data temporarily
        window.tempItemData = jsonData;
        window.tempHeaderRow = headerRow;
        
        // Display preview
        displayPreview(jsonData, headerRow);
        
    } catch (error) {
        console.error('Error previewing file:', error);
        alert('Error reading Excel file. Please ensure it is a valid .xlsx or .xls file.');
    }
}

// Function to display data preview
function displayPreview(data, headerRow) {
    const previewDiv = document.getElementById('itemDataPreview');
    const previewTable = document.getElementById('previewTable');
    const thead = previewTable.querySelector('thead');
    const tbody = previewTable.querySelector('tbody');
    
    // Clear previous content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (data.length === 0) return;
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create header row with indicator
    const headerRow_tr = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.className = 'bg-success text-white';
        headerRow_tr.appendChild(th);
    });
    thead.appendChild(headerRow_tr);
    
    // Add a small info row showing which row is used as header
    const infoRow = document.createElement('tr');
    const infoCell = document.createElement('td');
    infoCell.colSpan = headers.length;
    infoCell.className = 'text-muted small text-center';
    infoCell.innerHTML = `<i class="bi bi-info-circle"></i> Using row ${headerRow} as headers`;
    infoRow.appendChild(infoCell);
    thead.appendChild(infoRow);
    
    // Create preview rows (first 5)
    const previewRows = data.slice(0, 5);
    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    
    // Update total count
    document.getElementById('totalRowCount').textContent = data.length;
    
    // Show preview
    previewDiv.classList.remove('d-none');
}

// Function to sanitize Firebase keys
function sanitizeFirebaseKey(key) {
    if (!key) return key;
    // Replace invalid characters with underscores
    return String(key)
        .replace(/\./g, '_')
        .replace(/#/g, '_')
        .replace(/\$/g, '_')
        .replace(/\//g, '_')
        .replace(/\[/g, '_')
        .replace(/\]/g, '_')
        .trim();
}

// Function to sanitize object keys for Firebase
function sanitizeObjectForFirebase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectForFirebase(item));
    } else if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const sanitizedKey = sanitizeFirebaseKey(key);
                sanitized[sanitizedKey] = sanitizeObjectForFirebase(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}

// Function to upload item data to Firebase
async function uploadItemData(file, headerRow) {
    const uploadBtn = document.getElementById('uploadItemDataBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    
    try {
        // Disable upload button
        uploadBtn.disabled = true;
        progressDiv.classList.remove('d-none');
        progressBar.style.width = '10%';
        progressBar.textContent = '10%';
        uploadStatus.textContent = 'Reading file...';
        
        // Use the temporarily stored data
        let jsonData = window.tempItemData;
        
        if (!jsonData || jsonData.length === 0) {
            throw new Error('No data to upload');
        }
        
        progressBar.style.width = '40%';
        progressBar.textContent = '40%';
        uploadStatus.textContent = 'Sanitizing data for Firebase...';
        
        // Sanitize all keys in the data to be Firebase-compatible
        jsonData = sanitizeObjectForFirebase(jsonData);
        
        // Create structured data with metadata
        const uploadData = {
            items: jsonData,
            metadata: {
                uploadedBy: username,
                uploadDate: new Date().toISOString(),
                totalItems: jsonData.length,
                fileName: file.name,
                headerRow: headerRow
            }
        };
        
        progressBar.style.width = '70%';
        progressBar.textContent = '70%';
        uploadStatus.textContent = 'Uploading to Firebase...';
        
        // Upload to Firebase
        await firebase.database().ref('itemData').set(uploadData);
        
        // Log activity (if logActivity function exists)
        if (typeof logActivity === 'function') {
            logActivity('Item data updated', `${username} uploaded ${jsonData.length} items from ${file.name} (header row: ${headerRow})`);
        } else {
            // Alternative logging to Firebase activities
            firebase.database().ref('activities').push({
                action: 'Item data updated',
                details: `${username} uploaded ${jsonData.length} items from ${file.name} (header row: ${headerRow})`,
                timestamp: new Date().toISOString(),
                user: username
            });
        }
        
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        uploadStatus.textContent = 'Upload complete!';
        
        // Show success message
        setTimeout(() => {
            alert(`Successfully uploaded ${jsonData.length} items!`);
            
            // Reset form
            document.getElementById('itemDataFile').value = '';
            document.getElementById('headerRowInput').value = '1';
            document.getElementById('itemDataPreview').classList.add('d-none');
            document.getElementById('headerRowSection').classList.add('d-none');
            progressDiv.classList.add('d-none');
            progressBar.style.width = '0%';
            uploadBtn.disabled = true;
            
            // Reload last update info
            loadLastUpdateInfo();
            
            // Clear temporary data
            delete window.tempItemData;
            delete window.tempHeaderRow;
            delete window.currentItemFile;
        }, 1000);
        
    } catch (error) {
        console.error('Error uploading item data:', error);
        alert('Error uploading data. Please try again.');
        uploadBtn.disabled = false;
        progressDiv.classList.add('d-none');
    }
}

// Function to load last update information
async function loadLastUpdateInfo() {
    try {
        const snapshot = await firebase.database().ref('itemData/metadata').once('value');
        const metadata = snapshot.val();
        
        if (metadata) {
            const uploadDate = new Date(metadata.uploadDate);
            document.getElementById('lastUpdateDate').textContent = uploadDate.toLocaleString();
            document.getElementById('totalItems').textContent = metadata.totalItems || 0;
        } else {
            document.getElementById('lastUpdateDate').textContent = 'Never updated';
            document.getElementById('totalItems').textContent = '0';
        }
    } catch (error) {
        console.error('Error loading last update info:', error);
    }
}


//----------------------------------------------------------