// script.js (module)
import { db } from "./firebase.js";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const inventoryRef = collection(db, "inventory");
const salesRef = collection(db, "sales");

let cart = [];
let invoiceNo = 1001;

// Show Sections
function showSection(id) {
  ["billing", "reports", "inventory"].forEach(s => {
    document.getElementById(s + "_section").classList.add("hidden");
  });
  document.getElementById(id + "_section").classList.remove("hidden");
}
window.showSection = showSection;

// ---------------------- Inventory -----------------------

async function addInventory() {
  const name = document.getElementById("inv-name").value.trim();
  const price = parseFloat(document.getElementById("inv-price").value);
  const qty = parseInt(document.getElementById("inv-qty").value);

  if (!name || !price || !qty) return alert("Fill all fields");

  const docRef = doc(inventoryRef, name);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const existing = docSnap.data();
    await updateDoc(docRef, {
      price: price,
      stock: existing.stock + qty
    });
  } else {
    await setDoc(docRef, { price: price, stock: qty });
  }

  document.getElementById("inv-name").value = "";
  document.getElementById("inv-price").value = "";
  document.getElementById("inv-qty").value = "";
  document.getElementById("inv-msg").textContent = "Inventory updated!";
  setTimeout(() => (document.getElementById("inv-msg").textContent = ""), 2000);
}
window.addInventory = addInventory;

function loadInventory() {
  onSnapshot(inventoryRef, (snapshot) => {
    const tbody = document.querySelector("#inv-table tbody");
    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const { price, stock } = doc.data();
      const name = doc.id;
      const tr = document.createElement("tr");
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
    });
  });
}

window.editInventory = async function(name) {
  const docSnap = await getDoc(doc(inventoryRef, name));
  if (docSnap.exists()) {
    const item = docSnap.data();
    document.getElementById("inv-name").value = name;
    document.getElementById("inv-price").value = item.price;
    document.getElementById("inv-qty").value = 0;
  }
};

window.deleteInventory = async function(name) {
  if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
    await deleteDoc(doc(inventoryRef, name));
  }
};

// ---------------------- Billing ------------------------

window.lookupProduct = async function(val) {
  const docSnap = await getDoc(doc(inventoryRef, val));
  if (docSnap.exists()) {
    document.getElementById("prod-name").value = val;
    document.getElementById("prod-price").value = docSnap.data().price;
  } else {
    document.getElementById("prod-name").value = "";
    document.getElementById("prod-price").value = "";
  }
};

window.addToCart = async function () {
  const name = document.getElementById("prod-name").value.trim();
  const price = parseFloat(document.getElementById("prod-price").value);
  const qty = parseInt(document.getElementById("prod-qty").value);

  if (!name || !price || !qty) return alert("Complete billing item");

  const docRef = doc(inventoryRef, name);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return alert("Item not found in inventory");
  const item = docSnap.data();
  if (item.stock < qty) return alert("Not enough stock");

  cart.push({ name, price, qty, date: new Date() });

  await updateDoc(docRef, { stock: item.stock - qty });
  renderCart();

  document.getElementById("prod-code").value = "";
  document.getElementById("prod-name").value = "";
  document.getElementById("prod-price").value = "";
  document.getElementById("prod-qty").value = "";
};

function renderCart() {
  const tbody = document.getElementById("cart").querySelector("tbody");
  tbody.innerHTML = "";
  cart.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td><td>₹${item.price}</td><td>${item.qty}</td>
      <td>₹${(item.qty * item.price).toFixed(2)}</td>
      <td><button onclick="removeCart(${i})">X</button></td>
    `;
    tbody.appendChild(tr);
  });
}
window.removeCart = async function(i) {
  const item = cart.splice(i, 1)[0];
  const docRef = doc(inventoryRef, item.name);
  const snap = await getDoc(docRef);
  const data = snap.data();
  await updateDoc(docRef, { stock: data.stock + item.qty });
  renderCart();
};

window.generateBill = async function () {
  if (!cart.length) return alert("Cart is empty");
  const cn = document.getElementById("cust-name").value.trim();
  const cp = document.getElementById("cust-phone").value.trim();
  if (!cn || !cp) return alert("Enter customer info");

  const now = new Date();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt" });
  const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString();
  const dateFile = now.toISOString().split("T")[0];
  const inv = invoiceNo++;

  // PDF Header
  doc.setFontSize(18).text("GS Shoe Mart", 40, 40);
  doc.setFontSize(10)
    .text("GSTIN: 29ABCDE1234Z5", 40, 60)
    .text("12, Main Road, Coimbatore, 641001", 40, 75)
    .text("Phone: +91 98765 43210  Email: gsmart@gmail.com", 40, 90);
  doc.line(40, 100, 555, 100);
  doc.setFontSize(12)
    .text(`Invoice #: ${inv}`, 400, 60)
    .text(`Date: ${dateStr}`, 400, 75)
    .text(`Customer: ${cn}`, 40, 120)
    .text(`Mobile: ${cp}`, 40, 135);

  // Table
  const headers = [["S.No", "Item Name", "Price", "Qty", "Total"]];
  const rows = cart.map((it, i) => [
    (i + 1).toString(),
    it.name,
    it.price.toFixed(2),
    it.qty.toString(),
    (it.price * it.qty).toFixed(2),
  ]);
  const totalSum = rows.reduce((sum, r) => sum + parseFloat(r[4]), 0);

  doc.autoTable({
    startY: 160,
    head: headers,
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [33, 150, 243], textColor: 255 },
  });

  const endY = doc.autoTable.previous.finalY + 20;
  doc.setFontSize(14)
    .text("Grand Total:", 350, endY)
    .text(`₹${totalSum.toFixed(2)}`, 500, endY, { align: "right" });

  const filename = `${cn.replace(/\s+/g, "_")}-${dateFile}.pdf`;
  doc.save(filename);

  for (let item of cart) {
    await addDoc(salesRef, {
      ...item,
      customer: cn,
      phone: cp,
      date: now
    });
  }

  cart = [];
  renderCart();
  document.getElementById("cust-name").value = "";
  document.getElementById("cust-phone").value = "";
  calcReport("daily");
};

// ------------------ Reports -------------------

let salesChart = null;

async function calcReport(period) {
  document.querySelectorAll(".report-period button").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.report-period button[onclick*="${period}"]`)?.classList.add("active");

  const now = new Date();
  let from;
  if (period === "daily") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "monthly") from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "yearly") from = new Date(now.getFullYear(), 0, 1);

  const q = query(salesRef, orderBy("date"));
  const snapshot = await getDocs(q);
  const filtered = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
    if (date >= from) filtered.push({ ...data, date });
  });

  const total = filtered.reduce((sum, it) => sum + it.price * it.qty, 0);
  const unitsSold = filtered.reduce((sum, it) => sum + it.qty, 0);
  const tally = {};
  filtered.forEach(it => {
    tally[it.name] = (tally[it.name] || 0) + it.qty;
  });

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const topItem = sorted[0] || ["N/A", 0];

  document.getElementById("total-sales").textContent = `₹${total.toFixed(2)}`;
  document.getElementById("top-seller").textContent = `Top Seller: ${topItem[0]} (${topItem[1]} units)`;
  document.getElementById("total-units").textContent = `Total Units Sold: ${unitsSold}`;

  if (salesChart) salesChart.destroy();

  const ctx = document.getElementById("salesChart").getContext("2d");
  salesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(([name]) => name),
      datasets: [{
        label: "Units Sold",
        data: sorted.map(([, qty]) => qty),
        backgroundColor: "#ff7e5f",
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
        y: { beginAtZero: true, ticks: { color: "#fff" } },
        x: { ticks: { color: "#fff" } }
      }
    }
  });
}

window.calcReport = calcReport;

// ------------------- Init -----------------------

let dynamicChart;

window.updateDynamicChart = async function () {
  const type = document.getElementById('chartTypeSelector').value;
  if (dynamicChart) dynamicChart.destroy();

  const ctx = document.getElementById('dynamicChart').getContext('2d');

  const snapshot = await getDocs(query(salesRef, orderBy("date")));
  const salesLog = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
    salesLog.push({ ...data, date });
  });

  const now = new Date();
  const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthlyStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearlyStart = new Date(now.getFullYear(), 0, 1);
  const filteredSales = salesLog.filter(it => it.date >= yearlyStart);

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

    dynamicChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(timeLabels),
        datasets: [{
          label: 'Sales (₹)',
          data: Object.values(timeLabels),
          borderColor: '#ff7e5f',
          backgroundColor: 'rgba(255,126,95,0.2)',
          fill: true,
          tension: 0.3
        }]
      },
      options: chartOptions('₹ Revenue')
    });

  } else if (type === 'stockMovement') {
    const sold = {};
    for (let s of filteredSales) {
      sold[s.name] = (sold[s.name] || 0) + s.qty;
    }

    const inventorySnapshot = await getDocs(inventoryRef);
    const names = [];
    const openingStock = [];
    const soldStock = [];

    inventorySnapshot.forEach(doc => {
      const name = doc.id;
      const data = doc.data();
      names.push(name);
      openingStock.push(data.stock + (sold[name] || 0));
      soldStock.push(sold[name] || 0);
    });

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
      const key = `${it.date.getFullYear()}-${it.date.getMonth() + 1}`;
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
          fill: false,
          tension: 0.4
        }]
      },
      options: chartOptions('Qty')
    });

  } else if (type === 'cumulativeSales') {
    const salesSorted = [...filteredSales].sort((a, b) => new Date(a.date) - new Date(b.date));
    let total = 0;
    const cumulative = salesSorted.map(s => {
      total += s.qty * s.price;
      return total;
    });
    const labels = salesSorted.map(s => `${s.date.getFullYear()}-${s.date.getMonth() + 1}-${s.date.getDate()}`);

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
};

function chartOptions(label) {
  return {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#ffffff'
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

import { deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

window.clearSalesLog = async function () {
  if (confirm("Are you sure you want to clear all sales history? This cannot be undone.")) {
    const snapshot = await getDocs(salesRef);
    const batch = [];

    // Collect all delete promises
    snapshot.forEach(doc => {
      batch.push(deleteDoc(doc.ref));
    });

    // Wait for all deletes to complete
    await Promise.all(batch);

    alert("Sales history cleared.");
    calcReport("daily");
    updateDynamicChart();
  }
};



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

