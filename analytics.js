// analytics.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const db = firebase.database();
    let allOrders = [];
    let allBillingOrders = [];
    let allSentOrders = [];
    let allDeletedOrders = [];
    let allExpiredOrders = [];
    let allStock = [];
    
    // Chart instances
    let chartInstances = {};
    
    // Load all data
    loadAllData().then(() => {
        renderDashboard();
        setupEventListeners();
    });
    
    async function loadAllData() {
        try {
            const snapshot = await db.ref('/').once('value');
            const data = snapshot.val();
            
            // Process orders from different sections
            allOrders = data.orders ? Object.values(data.orders) : [];
            allBillingOrders = data.billingOrders ? Object.values(data.billingOrders) : [];
            allSentOrders = data.sentOrders ? Object.values(data.sentOrders) : [];
            allDeletedOrders = data.deletedOrders ? Object.values(data.deletedOrders) : [];
            allExpiredOrders = data.expiredOrders ? Object.values(data.expiredOrders) : [];
            allStock = data.stock || [];
            
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    function renderDashboard() {
        renderQuickStats();
        renderOrderTrendsChart();
        renderProductDemandChart();
        renderPartyFrequencyChart();
        renderSizeDistributionChart();
    }
    
    function renderQuickStats() {
        // Calculate stats
        const totalOrders = allOrders.length + allBillingOrders.length + allSentOrders.length;
        const totalQuantity = [...allOrders, ...allBillingOrders, ...allSentOrders].reduce((sum, order) => sum + (order.totalQuantity || 0), 0);
        const topProduct = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders])[0] || ['N/A', {totalQty: 0}];
        const activeParties = [...new Set([...allOrders, ...allBillingOrders, ...allSentOrders].map(order => order.partyName))].length;
        
        // Update DOM
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('total-quantity').textContent = totalQuantity;
        document.getElementById('top-product-name').textContent = topProduct[0];
        document.getElementById('top-product-count').textContent = topProduct[1].totalQty;
        document.getElementById('active-parties').textContent = activeParties;
    }
    
    function renderOrderTrendsChart() {
        // Destroy previous instance if exists
        if (chartInstances.orderTrendsChart) {
            chartInstances.orderTrendsChart.destroy();
        }
        
        // Group orders by day for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const ordersByDay = {};
        const dateFormat = { year: 'numeric', month: 'short', day: 'numeric' };
        
        [...allOrders, ...allBillingOrders, ...allSentOrders].forEach(order => {
            const orderDate = new Date(order.dateTime || order.date || order.billingDate);
            if (orderDate >= thirtyDaysAgo) {
                const dateStr = orderDate.toLocaleDateString('en-US', dateFormat);
                if (!ordersByDay[dateStr]) {
                    ordersByDay[dateStr] = { count: 0, quantity: 0 };
                }
                ordersByDay[dateStr].count++;
                ordersByDay[dateStr].quantity += order.totalQuantity || 0;
            }
        });
        
        // Sort dates chronologically
        const sortedDates = Object.keys(ordersByDay).sort((a, b) => 
            new Date(a) - new Date(b)
        );
        
        const ctx = document.getElementById('orderTrendsChart').getContext('2d');
        chartInstances.orderTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [
                    {
                        label: 'Number of Orders',
                        data: sortedDates.map(date => ordersByDay[date].count),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Total Quantity',
                        data: sortedDates.map(date => ordersByDay[date].quantity),
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Volume Trends (Last 30 Days)'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Total Quantity'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }
    
    function renderProductDemandChart() {
        if (chartInstances.productDemandChart) {
            chartInstances.productDemandChart.destroy();
        }
        
        const topProducts = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders]).slice(0, 10);
        
        const ctx = document.getElementById('productDemandChart').getContext('2d');
        chartInstances.productDemandChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(item => item[0]),
                datasets: [{
                    label: 'Total Quantity Ordered',
                    data: topProducts.map(item => item[1].totalQty),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Products by Demand'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const product = topProducts[context.dataIndex];
                                return `Orders: ${product[1].orderCount}\nColors: ${product[1].colors.size}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Quantity'
                        }
                    }
                }
            }
        });
    }
    
    function renderPartyFrequencyChart() {
        if (chartInstances.partyFrequencyChart) {
            chartInstances.partyFrequencyChart.destroy();
        }
        
        const partyStats = analyzeParties([...allOrders, ...allBillingOrders, ...allSentOrders]);
        const sortedParties = Object.entries(partyStats)
            .sort(([,a], [,b]) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);
        
        const ctx = document.getElementById('partyFrequencyChart').getContext('2d');
        chartInstances.partyFrequencyChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: sortedParties.map(([party]) => party),
                datasets: [{
                    data: sortedParties.map(([,stats]) => stats.totalQuantity),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(199, 199, 199, 0.6)',
                        'rgba(83, 102, 255, 0.6)',
                        'rgba(40, 159, 64, 0.6)',
                        'rgba(210, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)',
                        'rgba(40, 159, 64, 1)',
                        'rgba(210, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Parties by Order Quantity'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const party = sortedParties[context.dataIndex];
                                return `Orders: ${party[1].totalOrders}\nProducts: ${party[1].uniqueProducts.size}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function renderSizeDistributionChart() {
        if (chartInstances.sizeDistributionChart) {
            chartInstances.sizeDistributionChart.destroy();
        }
        
        const sizeStats = {};
        
        [...allOrders, ...allBillingOrders, ...allSentOrders].forEach(order => {
            order.items?.forEach(item => {
                if (item.colors) {
                    Object.values(item.colors).forEach(sizeQty => {
                        Object.entries(sizeQty).forEach(([size, qty]) => {
                            if (!sizeStats[size]) {
                                sizeStats[size] = 0;
                            }
                            sizeStats[size] += qty;
                        });
                    });
                }
            });
        });
        
        const sortedSizes = Object.entries(sizeStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        const ctx = document.getElementById('sizeDistributionChart').getContext('2d');
        chartInstances.sizeDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedSizes.map(([size]) => size),
                datasets: [{
                    data: sortedSizes.map(([,qty]) => qty),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(199, 199, 199, 0.6)',
                        'rgba(83, 102, 255, 0.6)',
                        'rgba(40, 159, 64, 0.6)',
                        'rgba(210, 99, 132, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(199, 199, 199, 1)',
                        'rgba(83, 102, 255, 1)',
                        'rgba(40, 159, 64, 1)',
                        'rgba(210, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 10 Sizes by Demand'
                    }
                }
            }
        });
    }
    
    function renderOrdersByStatusChart() {
        if (chartInstances.ordersByStatusChart) {
            chartInstances.ordersByStatusChart.destroy();
        }
        
        const statusCounts = {
            'Pending': allOrders.filter(o => o.status === 'Pending').length,
            'Billing': allBillingOrders.length,
            'Completed': allSentOrders.length,
            'Deleted': allDeletedOrders.length,
            'Expired': allExpiredOrders.length
        };
        
        const ctx = document.getElementById('ordersByStatusChart').getContext('2d');
        chartInstances.ordersByStatusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: 'Number of Orders',
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 206, 86, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Orders by Status'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderProcessingTimeChart() {
        if (chartInstances.processingTimeChart) {
            chartInstances.processingTimeChart.destroy();
        }
        
        // This is a simplified example - you'd need to calculate actual processing times
        const ctx = document.getElementById('processingTimeChart').getContext('2d');
        chartInstances.processingTimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
                datasets: [{
                    label: 'Average Processing Time (hours)',
                    data: [12, 19, 8, 15, 10, 14, 7],
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Processing Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderOrderSizeChart() {
        if (chartInstances.orderSizeChart) {
            chartInstances.orderSizeChart.destroy();
        }
        
        const sizeRanges = {
            '1-10': 0,
            '11-20': 0,
            '21-30': 0,
            '31-40': 0,
            '41+': 0
        };
        
        [...allOrders, ...allBillingOrders, ...allSentOrders].forEach(order => {
            const qty = order.totalQuantity || 0;
            if (qty <= 10) sizeRanges['1-10']++;
            else if (qty <= 20) sizeRanges['11-20']++;
            else if (qty <= 30) sizeRanges['21-30']++;
            else if (qty <= 40) sizeRanges['31-40']++;
            else sizeRanges['41+']++;
        });
        
        const ctx = document.getElementById('orderSizeChart').getContext('2d');
        chartInstances.orderSizeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(sizeRanges),
                datasets: [{
                    data: Object.values(sizeRanges),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Order Size Distribution'
                    }
                }
            }
        });
    }
    
    function renderTopProductsQtyChart() {
        if (chartInstances.topProductsQtyChart) {
            chartInstances.topProductsQtyChart.destroy();
        }
        
        const topProducts = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders])
            .slice(0, 10)
            .sort((a, b) => b[1].totalQty - a[1].totalQty);
        
        const ctx = document.getElementById('topProductsQtyChart').getContext('2d');
        chartInstances.topProductsQtyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(([name]) => name),
                datasets: [{
                    label: 'Total Quantity',
                    data: topProducts.map(([,stats]) => stats.totalQty),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top Products by Quantity'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderTopProductsFreqChart() {
        if (chartInstances.topProductsFreqChart) {
            chartInstances.topProductsFreqChart.destroy();
        }
        
        const topProducts = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders])
            .slice(0, 10)
            .sort((a, b) => b[1].orderCount - a[1].orderCount);
        
        const ctx = document.getElementById('topProductsFreqChart').getContext('2d');
        chartInstances.topProductsFreqChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(([name]) => name),
                datasets: [{
                    label: 'Number of Orders',
                    data: topProducts.map(([,stats]) => stats.orderCount),
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top Products by Order Frequency'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderProductMatrixChart() {
        if (chartInstances.productMatrixChart) {
            chartInstances.productMatrixChart.destroy();
        }
        
        const topProducts = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders]).slice(0, 10);
        
        const ctx = document.getElementById('productMatrixChart').getContext('2d');
        chartInstances.productMatrixChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: topProducts.map(([name, stats]) => ({
                    label: name,
                    data: [{
                        x: stats.orderCount,
                        y: stats.totalQty,
                        r: Math.min(30, stats.totalQty / 10)
                    }],
                    backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Product Performance Matrix'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} pieces in ${context.parsed.x} orders`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Number of Orders'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Quantity'
                        }
                    }
                }
            }
        });
    }
    
    function renderTopPartiesQtyChart() {
        if (chartInstances.topPartiesQtyChart) {
            chartInstances.topPartiesQtyChart.destroy();
        }
        
        const partyStats = analyzeParties([...allOrders, ...allBillingOrders, ...allSentOrders]);
        const topParties = Object.entries(partyStats)
            .sort(([,a], [,b]) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);
        
        const ctx = document.getElementById('topPartiesQtyChart').getContext('2d');
        chartInstances.topPartiesQtyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topParties.map(([party]) => party),
                datasets: [{
                    label: 'Total Quantity',
                    data: topParties.map(([,stats]) => stats.totalQuantity),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top Parties by Quantity Ordered'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderPartyOrderFreqChart() {
        if (chartInstances.partyOrderFreqChart) {
            chartInstances.partyOrderFreqChart.destroy();
        }
        
        const partyStats = analyzeParties([...allOrders, ...allBillingOrders, ...allSentOrders]);
        const topParties = Object.entries(partyStats)
            .sort(([,a], [,b]) => b.totalOrders - a.totalOrders)
            .slice(0, 10);
        
        const ctx = document.getElementById('partyOrderFreqChart').getContext('2d');
        chartInstances.partyOrderFreqChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topParties.map(([party]) => party),
                datasets: [{
                    label: 'Number of Orders',
                    data: topParties.map(([,stats]) => stats.totalOrders),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Party Order Frequency'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderCustomerSegChart() {
        if (chartInstances.customerSegChart) {
            chartInstances.customerSegChart.destroy();
        }
        
        const partyStats = analyzeParties([...allOrders, ...allBillingOrders, ...allSentOrders]);
        const segments = {
            'High-Volume (>100)': 0,
            'Medium-Volume (20-100)': 0,
            'Low-Volume (<20)': 0
        };
        
        Object.values(partyStats).forEach(stats => {
            const avgOrderSize = stats.totalQuantity / stats.totalOrders;
            if (avgOrderSize > 100) segments['High-Volume (>100)']++;
            else if (avgOrderSize >= 20) segments['Medium-Volume (20-100)']++;
            else segments['Low-Volume (<20)']++;
        });
        
        const ctx = document.getElementById('customerSegChart').getContext('2d');
        chartInstances.customerSegChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(segments),
                datasets: [{
                    data: Object.values(segments),
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Customer Segmentation by Order Size'
                    }
                }
            }
        });
    }
    
    function renderAllSizesChart() {
        if (chartInstances.allSizesChart) {
            chartInstances.allSizesChart.destroy();
        }
        
        const sizeStats = {};
        
        [...allOrders, ...allBillingOrders, ...allSentOrders].forEach(order => {
            order.items?.forEach(item => {
                if (item.colors) {
                    Object.values(item.colors).forEach(sizeQty => {
                        Object.entries(sizeQty).forEach(([size, qty]) => {
                            if (!sizeStats[size]) {
                                sizeStats[size] = 0;
                            }
                            sizeStats[size] += qty;
                        });
                    });
                }
            });
        });
        
        const sortedSizes = Object.entries(sizeStats)
            .sort(([,a], [,b]) => b - a);
        
        const ctx = document.getElementById('allSizesChart').getContext('2d');
        chartInstances.allSizesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedSizes.map(([size]) => size),
                datasets: [{
                    label: 'Quantity Ordered',
                    data: sortedSizes.map(([,qty]) => qty),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Size Distribution Across All Orders'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function renderColorPrefChart() {
        if (chartInstances.colorPrefChart) {
            chartInstances.colorPrefChart.destroy();
        }
        
        const colorStats = {};
        
        [...allOrders, ...allBillingOrders, ...allSentOrders].forEach(order => {
            order.items?.forEach(item => {
                if (item.colors) {
                    Object.keys(item.colors).forEach(color => {
                        if (!colorStats[color]) {
                            colorStats[color] = 0;
                        }
                        // Sum all sizes for this color
                        colorStats[color] += Object.values(item.colors[color]).reduce((sum, qty) => sum + qty, 0);
                    });
                }
            });
        });
        
        const sortedColors = Object.entries(colorStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
        
        const ctx = document.getElementById('colorPrefChart').getContext('2d');
        chartInstances.colorPrefChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: sortedColors.map(([color]) => color),
                datasets: [{
                    data: sortedColors.map(([,qty]) => qty),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(199, 199, 199, 0.6)',
                        'rgba(83, 102, 255, 0.6)',
                        'rgba(40, 159, 64, 0.6)',
                        'rgba(210, 99, 132, 0.6)',
                        'rgba(33, 150, 243, 0.6)',
                        'rgba(244, 67, 54, 0.6)',
                        'rgba(139, 195, 74, 0.6)',
                        'rgba(63, 81, 181, 0.6)',
                        'rgba(233, 30, 99, 0.6)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 15 Color Preferences'
                    }
                }
            }
        });
    }
    
    function renderStockDemandChart() {
        if (chartInstances.stockDemandChart) {
            chartInstances.stockDemandChart.destroy();
        }
        
        // This is a simplified example - you'd need to compare stock with demand
        const topProducts = calculateTopProducts([...allOrders, ...allBillingOrders, ...allSentOrders])
            .slice(0, 5)
            .map(([name]) => name);
        
        // Mock data - replace with actual stock vs demand comparison
        const stockData = topProducts.map(() => Math.floor(Math.random() * 100) + 50);
        const demandData = topProducts.map(() => Math.floor(Math.random() * 100) + 30);
        
        const ctx = document.getElementById('stockDemandChart').getContext('2d');
        chartInstances.stockDemandChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts,
                datasets: [
                    {
                        label: 'Current Stock',
                        data: stockData,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Recent Demand',
                        data: demandData,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Stock vs Demand Comparison'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    function calculateTopProducts(orders) {
        const productTotals = {};
        
        orders.forEach(order => {
            order.items?.forEach(item => {
                const key = item.name;
                if (!productTotals[key]) {
                    productTotals[key] = { 
                        totalQty: 0, 
                        orderCount: 0,
                        colors: new Set()
                    };
                }
                productTotals[key].totalQty += item.totalQuantity || 0;
                productTotals[key].orderCount += 1;
                
                if (item.colors) {
                    Object.keys(item.colors).forEach(color => {
                        productTotals[key].colors.add(color);
                    });
                }
            });
        });
        
        return Object.entries(productTotals)
            .sort(([,a], [,b]) => b.totalQty - a.totalQty);
    }
    
    function analyzeParties(orders) {
        const partyStats = {};
        
        orders.forEach(order => {
            if (!order.partyName) return;
            
            if (!partyStats[order.partyName]) {
                partyStats[order.partyName] = {
                    totalOrders: 0,
                    totalQuantity: 0,
                    uniqueProducts: new Set(),
                    firstOrder: order.dateTime || order.date || order.billingDate,
                    lastOrder: order.dateTime || order.date || order.billingDate
                };
            }
            
            const party = partyStats[order.partyName];
            party.totalOrders++;
            party.totalQuantity += order.totalQuantity || 0;
            
            order.items?.forEach(item => {
                party.uniqueProducts.add(item.name);
            });
            
            const orderDate = new Date(order.dateTime || order.date || order.billingDate);
            const lastOrderDate = new Date(party.lastOrder);
            if (orderDate > lastOrderDate) {
                party.lastOrder = order.dateTime || order.date || order.billingDate;
            }
            
            const firstOrderDate = new Date(party.firstOrder);
            if (orderDate < firstOrderDate) {
                party.firstOrder = order.dateTime || order.date || order.billingDate;
            }
        });
        
        return partyStats;
    }
    
    function setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            loadAllData().then(() => {
                renderDashboard();
                showToast('Data refreshed successfully');
            });
        });
        
        // Tab navigation
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                showTab(tabId);
            });
        });
    }
    
    function showTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Deactivate all tabs
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show the selected tab content
        document.getElementById(tabId).style.display = 'block';
        
        // Activate the clicked tab
        document.querySelector(`.analytics-tab[data-tab="${tabId}"]`).classList.add('active');
        
        // Render charts for the selected tab
        switch(tabId) {
            case 'dashboard-tab':
                renderDashboard();
                break;
            case 'orders-tab':
                renderOrdersByStatusChart();
                renderProcessingTimeChart();
                renderOrderSizeChart();
                break;
            case 'products-tab':
                renderTopProductsQtyChart();
                renderTopProductsFreqChart();
                renderProductMatrixChart();
                break;
            case 'parties-tab':
                renderTopPartiesQtyChart();
                renderPartyOrderFreqChart();
                renderCustomerSegChart();
                break;
            case 'inventory-tab':
                renderAllSizesChart();
                renderColorPrefChart();
                renderStockDemandChart();
                break;
        }
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
});
