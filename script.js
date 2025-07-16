const adminUser = 'admin', adminPass = 'password';
let inventory = JSON.parse(localStorage.getItem('inventory')) || {};
let cart = [];
let salesLog = JSON.parse(localStorage.getItem('salesLog')) || [];


// Save Data
function saveData() {
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('salesLog', JSON.stringify(salesLog));
}

// Sections
function showSection(id) {
  ['billing','reports','inventory'].forEach(s => {
    document.getElementById(s + '_section').classList.add('hidden');
  });
  document.getElementById(id + '_section').classList.remove('hidden');
}

// Inventory
function addInventory() {
  const n = document.getElementById('inv-name').value.trim();
  const p = parseFloat(document.getElementById('inv-price').value);
  const q = parseInt(document.getElementById('inv-qty').value);

  if (!n || !p || !q) return alert('Fill all fields');

  if (inventory[n]) {
    inventory[n].price = p;
    inventory[n].stock += q;
  } else {
    inventory[n] = { price: p, stock: q };
  }

  saveData();
  loadInventory();
  document.getElementById('inv-msg').textContent = 'Inventory updated!';

  // ✅ Clear fields after save
  document.getElementById('inv-name').value = '';
  document.getElementById('inv-price').value = '';
  document.getElementById('inv-qty').value = '';
  setTimeout(() => document.getElementById('inv-msg').textContent = '', 2000);
}

function loadInventory() {
  if (!inventory || typeof inventory !== 'object') return;

  const tbody = document.querySelector('#inv-table tbody');
  tbody.innerHTML = '';

  for (let name in inventory) {
    const { price, stock } = inventory[name];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td>₹${price}</td>
      <td>${stock}</td>
     <td>
  <button class="action-btn edit-btn" onclick="editInventory('${name}')">✏️ Edit</button>
  <button class="action-btn delete-btn" onclick="deleteInventory('${name}')">🗑️ Delete</button>
</td>

    `;
    tbody.appendChild(tr);
    if (stock < 10) alert(`Low stock: "${name}" only ${stock} left.`);
  }
}

function editInventory(name) {
  const item = inventory[name];
  document.getElementById('inv-name').value = name;
  document.getElementById('inv-price').value = item.price;
  document.getElementById('inv-qty').value = 0; // Let admin decide quantity to add
}

function deleteInventory(name) {
  if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
    delete inventory[name];
    saveData();
    loadInventory();
  }
}

// Billing
function lookupProduct(val) {
  if (inventory[val]) {
    document.getElementById('prod-name').value = val;
    document.getElementById('prod-price').value = inventory[val].price;
  } else {
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-price').value = '';
  }
}
function addToCart() {
  const name = document.getElementById('prod-name').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const qty = parseInt(document.getElementById('prod-qty').value);

  if (!name || !price || !qty) return alert('Complete billing item');
  if (inventory[name].stock < qty) return alert('Not enough stock');

  cart.push({ name, price, qty, date: new Date() });
  inventory[name].stock -= qty;
  saveData();
  loadInventory();
  renderCart();

  // ✅ Clear fields after add
  document.getElementById('prod-code').value = '';
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-qty').value = '';
}

function renderCart() {
  const tbody = document.getElementById('cart').querySelector('tbody');
  tbody.innerHTML = '';
  cart.forEach((item,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td><td>₹${item.price}</td><td>${item.qty}</td>
      <td>₹${(item.qty*item.price).toFixed(2)}</td>
      <td><button onclick="removeCart(${i})">X</button></td>
    `;
    tbody.appendChild(tr);
  });
}
function removeCart(i) {
  const item = cart.splice(i,1)[0];
  inventory[item.name].stock += item.qty;
  saveData();
  loadInventory();
  renderCart();
}

let chartInstance = null;
let currentChartType = 'bar';

let invoiceNo = parseInt(localStorage.getItem('invoiceNo')) || 1001;

function generateBill() {
  if (!cart.length) return alert('Cart is empty');
  
  const cn = document.getElementById('cust-name').value.trim();
  const cp = document.getElementById('cust-phone').value.trim();
  if (!cn || !cp) return alert('Enter customer info');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt' });
  const now = new Date();
  const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  const dateFile = now.toISOString().split('T')[0];
  const inv = invoiceNo++;

  localStorage.setItem('invoiceNo', invoiceNo);

  // HEADER
  doc.setFontSize(18).text('GS Shoe Mart', 40, 40);
  doc.setFontSize(10)
     .text('GSTIN: 29ABCDE1234Z5', 40, 60)
     .text('12, Main Road, Coimbatore, 641001', 40, 75)
     .text('Phone: +91 98765 43210  Email: gsmart@gmail.com', 40, 90);
  doc.line(40, 100, 555, 100);

  // Invoice & Customer Info
  doc.setFontSize(12)
     .text(`Invoice #: ${inv}`, 400, 60)
     .text(`Date: ${dateStr}`, 400, 75)
     .text(`Customer: ${cn}`, 40, 120)
     .text(`Mobile: ${cp}`, 40, 135);

  // ITEM TABLE
  const headers = [['S.No', 'Item Name', 'Price', 'Qty', 'Total']];
  const rows = cart.map((it, i) => [
    (i+1).toString(),
    it.name,
    it.price.toFixed(2),
    it.qty.toString(),
    (it.price * it.qty).toFixed(2)
  ]);
  const totalSum = rows.reduce((sum, r) => sum + parseFloat(r[4]), 0);

  doc.autoTable({
    startY: 160,
    head: headers,
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [33, 150, 243], textColor: 255 }
  });

  // GRAND TOTAL
  const endY = doc.autoTable.previous.finalY + 20;
  doc.setFontSize(14)
     .text('Grand Total:', 350, endY)
     .text(`₹${totalSum.toFixed(2)}`, 500, endY, { align: 'right' });

  // SAVE & CLEANUP
  const filename = `${cn.replace(/\s+/g, '_')}-${dateFile}.pdf`;
  doc.save(filename);

  salesLog.push(...cart.map(it => ({...it, date: now})));
  cart = [];
  saveData(); renderCart();

  document.getElementById('cust-name').value = '';
  document.getElementById('cust-phone').value = '';
    calcReport('daily');
    updateDynamicChart();

}


// ✅ Proper Date revival for localStorage-loaded logs
salesLog = salesLog.map(it => ({ ...it, date: new Date(it.date) }));

let salesChart;

function calcReport(period) {
  document.querySelectorAll('.report-period button')
    .forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.report-period button[onclick*="${period}"]`)
    ?.classList.add('active');

  const now = new Date();
  let from;
  if (period === 'daily')   from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'monthly') from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'yearly')  from = new Date(now.getFullYear(), 0, 1);

  const filtered = salesLog.filter(it => it.date >= from);
  const total = filtered.reduce((sum, it) => sum + it.price * it.qty, 0);
  const unitsSold = filtered.reduce((sum, it) => sum + it.qty, 0);

  const tally = {};
  filtered.forEach(it => {
    tally[it.name] = (tally[it.name] || 0) + it.qty;
  });

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const topItem = sorted[0] || ['N/A', 0];

  // Update cards
  document.getElementById('total-sales').textContent = `₹${total.toFixed(2)}`;
  document.getElementById('top-seller').textContent = `Top Seller: ${topItem[0]} (${topItem[1]} units)`;
  document.getElementById('total-units').textContent = `Total Units Sold: ${unitsSold}`;

  // Destroy previous chart if exists
  if (salesChart) salesChart.destroy();

  const ctx = document.getElementById('salesChart').getContext('2d');
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([name]) => name),
      datasets: [{
        label: 'Units Sold',
        data: sorted.map(([, qty]) => qty),
        backgroundColor: '#ff7e5f',
        borderRadius: 8
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.parsed.y} units`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' }
        },
        x: {
          ticks: { color: '#fff' }
        }
      }
    }
  });
}

let dynamicChart;

function updateDynamicChart() {
  const type = document.getElementById('chartTypeSelector').value;
  if (dynamicChart) dynamicChart.destroy();

  const ctx = document.getElementById('dynamicChart').getContext('2d');
  const now = new Date();
  const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearlyStart = new Date(now.getFullYear(), 0, 1);

  const filteredSales = salesLog.filter(it => it.date >= yearlyStart); // default for yearly

  if (type === 'totalSalesProduct') {
    const revenueMap = {};
    filteredSales.forEach(it => {
      revenueMap[it.name] = (revenueMap[it.name] || 0) + it.price * it.qty;
    });

    dynamicChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(revenueMap),
        datasets: [{
          label: 'Revenue (₹)',
          data: Object.values(revenueMap),
          backgroundColor: '#ff7e5f',
          borderRadius: 8
        }]
      },
      options: chartOptions('Revenue (₹)')
    });

  } else if (type === 'salesOverTime') {
    const timeLabels = {};
    filteredSales.forEach(it => {
      const label = `${it.date.getFullYear()}-${it.date.getMonth()+1}-${it.date.getDate()}`;
      timeLabels[label] = (timeLabels[label] || 0) + it.price * it.qty;
    });

    const labels = Object.keys(timeLabels);
    const data = Object.values(timeLabels);

    dynamicChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales (₹)',
          data: data,
          backgroundColor: 'rgba(255,126,95,0.2)',
          borderColor: '#ff7e5f',
          fill: true,
          tension: 0.3
        }]
      },
      options: chartOptions('₹ Revenue')
    });

  } else if (type === 'stockMovement') {
    const sold = {};
    for (let s of salesLog) {
      sold[s.name] = (sold[s.name] || 0) + s.qty;
    }

    const names = Object.keys(inventory);
    const openingStock = names.map(n => inventory[n].stock + (sold[n] || 0));
    const soldStock = names.map(n => sold[n] || 0);

    dynamicChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          {
            label: 'Opening Stock',
            data: openingStock,
            backgroundColor: '#4CAF50'
          },
          {
            label: 'Sold Stock',
            data: soldStock,
            backgroundColor: '#ff7e5f'
          }
        ]
      },
      options: chartOptions('Units')
    });

  } else if (type === 'topSellersOverTime') {
    const sellerMap = {};
    filteredSales.forEach(it => {
      const key = `${it.date.getFullYear()}-${it.date.getMonth()+1}`;
      sellerMap[key] = (sellerMap[key] || 0) + it.qty;
    });

    dynamicChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(sellerMap),
        datasets: [{
          label: 'Top Sellers Quantity',
          data: Object.values(sellerMap),
          borderColor: '#ff7e5f',
          tension: 0.4,
          fill: false
        }]
      },
      options: chartOptions('Qty')
    });

  } else if (type === 'cumulativeSales') {
    const salesSorted = [...salesLog].sort((a, b) => new Date(a.date) - new Date(b.date));
    let total = 0;
    const cumulative = salesSorted.map(s => {
      total += s.qty * s.price;
      return total;
    });
    const labels = salesSorted.map(s => `${s.date.getFullYear()}-${s.date.getMonth()+1}-${s.date.getDate()}`);

    dynamicChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cumulative Revenue',
          data: cumulative,
          borderColor: '#ff7e5f',
          fill: false,
          tension: 0.3
        }]
      },
      options: chartOptions('₹ Revenue')
    });
  }
}

function chartOptions(label) {
  return {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#ffffff' // ✅ legend text color
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} ${label}`
        }
      }
    },
    scales: {
      x: { ticks: { color: '#fff' } },
      y: {
        beginAtZero: true,
        ticks: { color: '#fff' },
        title: { display: true, text: label, color: '#fff' }
      }
    }
  };
}



// ✅ Initialize inventory and section after page load
window.onload = function () {
   loadInventory();
   showSection('reports');
   calcReport('daily');
};

function clearSalesLog() {
  if (confirm("Are you sure you want to clear all sales history? This cannot be undone.")) {
    salesLog = [];
    saveData();
    calcReport('daily');
    alert('Sales history cleared.');
  }
}


// ✅ Enable "Enter" to submit billing or inventory
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const active = document.activeElement;

    if (document.getElementById('billing_section') && !billing_section.classList.contains('hidden')) {
      if (active.id === 'prod-code' || active.id === 'prod-qty') {
        e.preventDefault();
        addToCart();
      }
    }

    if (document.getElementById('inventory_section') && !inventory_section.classList.contains('hidden')) {
      if (active.id === 'inv-name' || active.id === 'inv-qty') {
        e.preventDefault();
        addInventory();
      }
    }
  }
});


