let cart = [];

// Predefined items
let items = [
  {
    name: "A039",
    sizes: ["32B", "32C", "34B", "34C", "36B", "36C", "38B", "38C", "38D"],
    colors: ["BLACK", "WHITE", "SKIN"],
  },
  {
    name: "A042",
    sizes: ["32B", "32C", "34B", "34C", "36B", "36C", "38B", "38C", "38D"],
    colors: ["BLACK", "WHITE", "SKIN", "CPM"],
  },
  // Add other items with similar structure
];

// Predefined parties
let parties = [
  "PARTY A - AREA1",
  "PARTY B - AREA2",
  "PARTY C - AREA3",
  "XYLO - AREA4",
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
document
  .getElementById("saveOrderBtn")
  .addEventListener("click", showOrderSummaryModal);


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

  //---------------------------------------other--------------------------------
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
      BLACK: "#000000",
      WHITE: "#FFFFFF",
      SKIN: "#FFE0BD",
      // Add more color mappings as needed
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
                          <label class="size-label">${size}</label>
                          <input type="number" name="qty_${color}_${size}" min="0" class="quantity-input">
                      </div>
                  `
                    )
                    .join("")}
              </div>
          </div>
      `;
  }

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
  
  function sendTelegramNotification(partyName, totalQuantity, orderNumber) {
    const token = "6489265710:AAFx6-OaL09SpByMPyfiQBmgetvbtx0InyI";
    const chatId = "-1002170737027";
    const message = `New order received:\nParty Name: ${partyName}\nTotal Quantity: ${totalQuantity}\nOrder Number: ${orderNumber}`;
  
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
      .then((data) => console.log("Telegram notification sent:", data))
      .catch((error) =>
        console.error("Error sending Telegram notification:", error)
      );
  }

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

  
  //-------------------------------item--------------------------------
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
              <div class="modal-dialog">
                  <div class="modal-content">
                      <div class="modal-header">
                          <h5 class="modal-title">Add New Item: ${itemName}</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div class="modal-body">
                          <div class="mb-3">
                              <label for="itemCategory" class="form-label">Category (optional, separate multiple with space)</label>
                              <input type="text" class="form-control" id="itemCategory">
                          </div>
                          <div class="mb-3">
                              <label for="itemSizes" class="form-label">Sizes (mandatory, separate with space)</label>
                              <input type="text" class="form-control" id="itemSizes" required>
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
  
      const newItemModal = new bootstrap.Modal(
        document.getElementById("newItemModal")
      );
  
      // Wait for the modal to be fully added to the DOM
      setTimeout(() => {
        const saveNewItemButton = document.getElementById("saveNewItem");
        if (saveNewItemButton) {
          saveNewItemButton.addEventListener("click", function () {
            const category = document
              .getElementById("itemCategory")
              .value.split(" ")
              .filter(Boolean);
            const sizes = document
              .getElementById("itemSizes")
              .value.split(" ")
              .filter(Boolean);
  
            if (sizes.length === 0) {
              alert("Please enter at least one size.");
              return;
            }
  
            const newItem = { name: itemName, category: category, sizes: sizes };
            items.push(newItem);
            items.sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            );
  
            // Save only the new item to Firebase
            firebase
              .database()
              .ref("items/" + itemName.replace(".", "_"))
              .set(newItem)
              .then(() => {
                console.log(`Added new item: ${itemName}`);
                logActivity(`created new item "${itemName}"`, username);
                alert(`New item "${itemName}" has been added successfully.`);
                newItemModal.hide();
                document.body.removeChild(modal);
              })
              .catch((error) => {
                console.error("Error adding new item:", error);
                alert(
                  "An error occurred while adding the new item. Please try again."
                );
              });
  
            document.getElementById("itemSearch").value = itemName;
            document.getElementById("itemList").style.display = "none";
            showItemDetails(newItem);
          });
  
          newItemModal.show();
        } else {
          console.error("Save button not found in the modal");
        }
      }, 100); // Small delay to ensure DOM is updated
    } else {
      console.log(`Item "${itemName}" already exists.`);
      alert(`Item "${itemName}" already exists in the list.`);
    }
  }
  
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

//---------------------------------CART---------------------------------
function getTotalQuantity(cartItems) {
    return cartItems.reduce((total, item) => total + item.total, 0);
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
    `;
    document.head.appendChild(style);
  
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
  
    // Show modal
    modalInstance.show();
  
    // Play advanced confirmation sound
    playAdvancedConfirmationSound();
  
    // Send notification to Telegram
    sendTelegramNotification(order.partyName, getTotalQuantity(order.items), order.orderNumber, imgData);
  
    // Update pending orders list
    loadPendingOrders();
  }
  
  // Advanced sound function using Web Audio API
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
  }

  function handlePlaceOrder() {
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Processing...";
  
    const modalContent = document.querySelector("#orderSummaryModal .modal-content");
    
    // Calculate total quantity from cart data
    const totalQuantity = calculateTotalQuantity();
  
    html2canvas(modalContent).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      
      // Download the image
      const link = document.createElement("a");
      link.href = imgData;
      const partyName = document.getElementById("partySearch").value;
      const dateTime = new Date().toISOString();
      link.download = `${partyName.replace(/\s+/g, "_")}_${dateTime.replace(/[:.]/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      // Get next order number and save to Firebase
      getNextOrderNumber()
        .then((orderNumber) => {
          const order = {
            orderNumber: orderNumber,
            partyName: partyName,
            dateTime: dateTime,
            items: cart,
            status: "Pending",
            totalQuantity: totalQuantity  // Add total quantity to the order object
          };
  
          saveOrderToFirebase(order)
            .then(() => {
              console.log("Order saved successfully:", order);
              
              // Close the order summary modal
              const orderSummaryModal = bootstrap.Modal.getInstance(document.getElementById("orderSummaryModal"));
              if (orderSummaryModal) {
                orderSummaryModal.hide();
              }
  
              // Show the order confirmation modal
              try {
                showOrderConfirmationModal(order, imgData);
              } catch (error) {
                console.error("Error showing confirmation modal:", error);
                alert("Your order has been placed successfully, but there was an error showing the confirmation. Order number: " + order.orderNumber);
              }
  
              // Reset the cart and update UI
              try {
                resetCart();
                updateCartButtonText(0);
                console.log("Cart reset and UI updated");
              } catch (resetError) {
                console.error("Error resetting cart:", resetError);
              }
            })
            .catch((error) => {
              console.error("Error in order placement process:", error);
              alert("An error occurred during the order process. The order may have been saved, but please check and try again if necessary.");
            })
            .finally(() => {
              placeOrderBtn.disabled = false;
              placeOrderBtn.textContent = "Place Order";
            });
        })
        .catch((error) => {
          console.error("Error getting next order number:", error);
          alert("An error occurred while generating the order number. Please try again.");
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = "Place Order";
        });
    });
  }
  
  // Function to calculate total quantity from cart data
  function calculateTotalQuantity() {
    return cart.reduce((total, item) => {
      return total + Object.values(item.colors).reduce((colorTotal, sizes) => {
        return colorTotal + Object.values(sizes).reduce((sizeTotal, qty) => sizeTotal + qty, 0);
      }, 0);
    }, 0);
  }
  
  function updateCartButtonText(totalQuantity) {
    const cartButton = document.getElementById("saveOrderBtn");
    cartButton.textContent = `Cart (${totalQuantity})`;
  }

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
  
  function showItemDetails(item) {
    const existingDetailsContainer = document.getElementById(
      "itemDetailsContainer"
    );
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
          </div>
      `;
  
    const itemList = document.getElementById("itemList");
    itemList.insertAdjacentElement("afterend", detailsContainer);
  
    // Add click event listeners to color containers
    detailsContainer.querySelectorAll(".color-container").forEach((container) => {
      container.addEventListener("click", handleColorContainerClick);
    });
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
  
  function updateQuantity(size, change) {
    const input = document.getElementById(`qty_${size}`);
    if (input) {
      let newValue = parseInt(input.value) + change;
      newValue = Math.max(0, newValue); // Ensure non-negative value
      input.value = newValue;
    }
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
  
  function resetItemSelection() {
    document.getElementById("itemSearch").value = "";
    const itemDetailsContainer = document.getElementById("itemDetailsContainer");
    if (itemDetailsContainer) {
      itemDetailsContainer.remove();
    }
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
    
  }
  
  function saveOrderToFirebase(order) {
    return firebase.database().ref("orders").push(order);
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

  





