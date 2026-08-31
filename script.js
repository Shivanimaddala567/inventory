// Application State
let products = JSON.parse(localStorage.getItem("inventory")) || [];

// DOM Element References
const productForm = document.getElementById("productForm");
const nameInput = document.getElementById("name");
const categoryInput = document.getElementById("category");
const qtyInput = document.getElementById("qty");
const priceInput = document.getElementById("price");
const editIdInput = document.getElementById("editId");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const searchInput = document.getElementById("search");
const filterCategory = document.getElementById("filterCategory");
const productTable = document.getElementById("productTable");

const totalProductsEl = document.getElementById("totalProducts");
const totalQtyEl = document.getElementById("totalQty");
const totalValueEl = document.getElementById("totalValue");
const lowStockEl = document.getElementById("lowStock");

// Persistence
function saveData() {
    localStorage.setItem("inventory", JSON.stringify(products));
}

// Helper: Determine stock badge
function getStatusBadge(qty) {
    const numericQty = Number(qty);
    if (numericQty > 20) {
        return '<span class="badge bg-success">In Stock</span>';
    } else if (numericQty > 5) {
        return '<span class="badge bg-warning text-dark">Limited</span>';
    }
    return '<span class="badge bg-danger">Low Stock</span>';
}

// Update Dashboard Statistics
function updateDashboard() {
    const totalProducts = products.length;
    const totalQty = products.reduce((sum, p) => sum + Number(p.qty), 0);
    const totalValue = products.reduce((sum, p) => sum + (Number(p.qty) * Number(p.price)), 0);
    const lowStock = products.filter(p => Number(p.qty) <= 5).length;

    if (totalProductsEl) totalProductsEl.innerText = totalProducts;
    if (totalQtyEl) totalQtyEl.innerText = totalQty;
    if (totalValueEl) totalValueEl.innerText = "₹" + totalValue.toLocaleString('en-IN');
    if (lowStockEl) lowStockEl.innerText = lowStock;
}

// Render Products Table
function displayProducts() {
    if (!productTable) return;
    productTable.innerHTML = "";

    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const categoryVal = filterCategory ? filterCategory.value : "All";

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchVal) || 
                              product.category.toLowerCase().includes(searchVal);
        const matchesCategory = categoryVal === "All" || product.category === categoryVal;
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        productTable.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No products found.</td></tr>`;
        updateDashboard();
        return;
    }

    filteredProducts.forEach((product, index) => {
        const isLowStock = Number(product.qty) <= 5;
        const row = document.createElement("tr");
        if (isLowStock) row.classList.add("table-warning-custom");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${product.qty}</td>
            <td>₹${Number(product.price).toFixed(2)}</td>
            <td>${getStatusBadge(product.qty)}</td>
            <td>${product.date}</td>
            <td>
                <button class="btn btn-warning btn-sm me-1" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
        `;
        productTable.appendChild(row);
    });

    updateDashboard();
}

// Sanitize inputs for XSS protection
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, match => {
        const chars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return chars[match];
    });
}

// Handle Add / Edit Submission
if (productForm) {
    productForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const category = categoryInput.value;
        const qty = Number(qtyInput.value);
        const price = Number(priceInput.value);
        const currentId = editIdInput.value;
        const today = new Date().toLocaleDateString();

        if (currentId) {
            const targetIndex = products.findIndex(p => p.id === currentId);
            if (targetIndex !== -1) {
                products[targetIndex] = { ...products[targetIndex], name, category, qty, price, date: today };
            }
        } else {
            const newProduct = {
                id: Date.now().toString(),
                name,
                category,
                qty,
                price,
                date: today
            };
            products.push(newProduct);
        }

        saveData();
        displayProducts();
        resetForm();
    });
}

// Edit Trigger
window.editProduct = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    editIdInput.value = product.id;
    nameInput.value = product.name;
    categoryInput.value = product.category;
    qtyInput.value = product.qty;
    priceInput.value = product.price;

    formTitle.innerText = "Edit Product";
    saveBtn.innerText = "Update Product";
    cancelBtn.classList.remove("d-none");
};

// Delete Trigger
window.deleteProduct = function(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        products = products.filter(p => p.id !== id);
        saveData();
        displayProducts();
        if (editIdInput.value === id) {
            resetForm();
        }
    }
};

// Form Reset Flow
function resetForm() {
    if (productForm) productForm.reset();
    if (editIdInput) editIdInput.value = "";
    if (formTitle) formTitle.innerText = "Add Product";
    if (saveBtn) saveBtn.innerText = "Save Product";
    if (cancelBtn) cancelBtn.classList.add("d-none");
}

if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

// Search & Filter Listeners
if (searchInput) searchInput.addEventListener("input", displayProducts);
if (filterCategory) filterCategory.addEventListener("change", displayProducts);

// Export CSV
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
    exportBtn.addEventListener("click", () => {
        if (products.length === 0) {
            alert("No inventory data available to export.");
            return;
        }

        let csvContent = "ID,Name,Category,Qty,Price,Date\n";
        products.forEach(p => {
            csvContent += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category}",${p.qty},${p.price},"${p.date}"\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// Print
const printBtn = document.getElementById("printBtn");
if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
}

// Dark Mode Toggle
const darkBtn = document.getElementById("darkBtn");
if (darkBtn) {
    darkBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
    });
}

// Initial Run
displayProducts();
