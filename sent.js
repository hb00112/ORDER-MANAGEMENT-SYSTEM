function loadSentOrders() {
    const sentOrdersBody = document.getElementById('sentOrdersBody');
    sentOrdersBody.innerHTML = '';

    firebase.database().ref('orders').orderByChild('status').equalTo('Sent').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${order.orderNumber || 'N/A'}</td>
                        <td>${order.partyName || 'N/A'}</td>
                        <td>${order.items && Array.isArray(order.items) ? order.items.map(item => 
                            `${item.name} (${Object.entries(item.quantities || {}).map(([size, qty]) => `${size}/${qty}`).join(', ')})`
                        ).join('; ') : 'No items'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary view-order" data-order-id="${childSnapshot.key}">View</button>
                        </td>
                    `;
                    sentOrdersBody.appendChild(row);
                });
            } else {
                sentOrdersBody.innerHTML = '<tr><td colspan="4">No sent orders found</td></tr>';
            }
        })
        .catch(error => {
            console.error("Error loading sent orders: ", error);
            sentOrdersBody.innerHTML = '<tr><td colspan="4">Error loading sent orders</td></tr>';
        });
}

document.getElementById('sentOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});


