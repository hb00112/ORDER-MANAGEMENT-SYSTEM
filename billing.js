function loadBillingOrders() {
    const billingOrdersBody = document.getElementById('billingOrdersBody');
    billingOrdersBody.innerHTML = '';

    firebase.database().ref('billingOrders').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${order.orderNumber || 'N/A'}</td>
                        <td>${order.partyName || 'N/A'}</td>
                        <td>${order.items && Array.isArray(order.items) ? order.items.map(item => 
                            `${item.name} (${Object.entries(item.colors || {}).map(([color, sizes]) => 
                                `${color}: ${Object.entries(sizes).map(([size, qty]) => `${size}/${qty}`).join(', ')}`
                            ).join('; ')})`
                        ).join('; ') : 'No items'}</td>
                        <td>${order.status || 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-order" data-order-id="${childSnapshot.key}">View</button>
                            <button class="btn btn-sm btn-success bill-order" data-order-id="${childSnapshot.key}">Bill</button>
                        </td>
                    `;
                    billingOrdersBody.appendChild(row);
                });
            } else {
                billingOrdersBody.innerHTML = '<tr><td colspan="5">No orders waiting for billing</td></tr>';
            }
        })
        .catch(error => {
            console.error("Error loading billing orders: ", error);
            billingOrdersBody.innerHTML = '<tr><td colspan="5">Error loading billing orders</td></tr>';
        });
}

function billOrder(orderId) {
    firebase.database().ref('billingOrders').child(orderId).update({ status: 'Sent' })
        .then(() => {
            console.log("Order billed and moved to Sent successfully");
            loadBillingOrders(); // Reload the billing orders
            loadSentOrders(); // Load the sent orders (new function to be created)
        })
        .catch(error => {
            console.error("Error billing order: ", error);
        });
}

// ... rest of the code remains the same

document.getElementById('billingOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('bill-order')) {
        billOrder(e.target.getAttribute('data-order-id'));
    } else if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});

