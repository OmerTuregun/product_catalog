// backend/app/static/app.js
let userRole = null;
let username = null;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json()).error || "error");
  return res.json();
}

async function apiForm(path, formData, method = "POST") {
  const res = await fetch(path, {
    method,
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).error || "error");
  return res.json();
}

function setAuthUI() {
  const adminBtn = document.getElementById("adminAddBtn");
  const welcome = document.getElementById("welcomeUser");
  adminBtn.classList.toggle("d-none", userRole !== "admin");

  if (username) {
    welcome.textContent = `Hoşgeldin, ${username}`;
    welcome.classList.remove("d-none");
  } else {
    welcome.classList.add("d-none");
  }
}

async function loadMe() {
  try {
    const me = await api("/api/auth/me");
    userRole = me.role;
    username = me.username;
    setAuthUI();
  } catch (e) {
    window.location.href = "/api/auth/page";
  }
}

async function loadCategories() {
  const cats = await api("/api/categories");
  const cf = document.getElementById("categoryFilter");
  const pc = document.getElementById("pCategory");
  cf.innerHTML = '<option value="">Tüm Kategoriler</option>';
  pc.innerHTML = "";
  cats.forEach((c) => {
    cf.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
    pc.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
  });
}

async function loadProducts() {
  const q = document.getElementById("searchInput").value.trim();
  const cat = document.getElementById("categoryFilter").value;
  const stock = document.getElementById("stockFilter").value;
  const params = new URLSearchParams();
  if (q) params.set("query", q);
  if (cat) params.set("category_id", cat);
  if (stock) params.set("in_stock", stock);

  const items = await api("/api/products?" + params.toString());
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  items.forEach((p) => {
    const imgSrc = p.primary_image_url || "https://via.placeholder.com/800x600?text=No+Image";
    grid.insertAdjacentHTML(
      "beforeend",
      `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="product-media">
            <img src="${imgSrc}" alt="${p.name || "Ürün görseli"}" loading="lazy"
                 onerror="this.src='https://via.placeholder.com/800x600?text=No+Image'">
          </div>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.name}</h5>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <span class="fw-semibold">${p.price} ₺</span>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" data-action="details" data-id="${p.id}">
                  Detaylar
                </button>
                <span class="badge ${p.in_stock ? "bg-success" : "bg-secondary"}">
                  ${p.in_stock ? "Stokta" : "Yok"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>`
    );
  });
}

// Detaylar butonu -> modal
document.getElementById("productsGrid").addEventListener("click", async (e) => {
  const btn = e.target.closest('button[data-action="details"]');
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  try {
    const p = await api(`/api/products/${id}`);
    // Başlık & meta
    document.getElementById("detailName").textContent = p.name;
    document.getElementById("detailPrice").textContent = `${p.price} ₺`;
    const stockEl = document.getElementById("detailStock");
    stockEl.textContent = p.in_stock ? "Stokta" : "Yok";
    stockEl.className = "badge " + (p.in_stock ? "bg-success" : "bg-secondary");
    document.getElementById("detailCategory").textContent = p.category_name || "";
    document.getElementById("detailDesc").textContent = p.description || "";

    // Carousel
    const images = (p.images && p.images.length) ? p.images : [p.primary_image_url];
    const cid = "carousel-" + p.id;
    const slides = images
      .map(
        (src, idx) => `
        <div class="carousel-item ${idx === 0 ? "active" : ""}">
          <div class="detail-media"><img src="${src}" alt=""></div>
        </div>`
      )
      .join("");

    const carousel = `
      <div id="${cid}" class="carousel slide" data-bs-ride="carousel">
        <div class="carousel-inner">${slides}</div>
        ${
          images.length > 1
            ? `
          <button class="carousel-control-prev" type="button" data-bs-target="#${cid}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Önceki</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#${cid}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Sonraki</span>
          </button>`
            : ``
        }
      </div>`;
    document.getElementById("detailCarouselWrapper").innerHTML = carousel;

    // Modal aç
    const m = new bootstrap.Modal(document.getElementById("detailModal"));
    m.show();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  loadProducts();
});
document.getElementById("categoryFilter").addEventListener("change", loadProducts);
document.getElementById("stockFilter").addEventListener("change", loadProducts);

document.getElementById("logoutBtn").onclick = async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (e) {}
  window.location.href = "/api/auth/page";
};

// Ürün kaydet (çoklu görsel)
document.getElementById("productSave").onclick = async () => {
  try {
    const fd = new FormData();
    fd.append("name", document.getElementById("pName").value);
    fd.append("description", document.getElementById("pDesc").value);
    fd.append("price", document.getElementById("pPrice").value);
    fd.append("category_id", document.getElementById("pCategory").value);
    fd.append("in_stock", document.getElementById("pStock").checked ? "true" : "false");

    const fileInput = document.getElementById("pImageFile");
    if (!fileInput.files.length) {
      alert("Lütfen en az bir görsel seçin.");
      return;
    }
    for (const f of fileInput.files) fd.append("images", f);

    await apiForm("/api/products", fd, "POST");
    await loadProducts();
    bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();

    // form temizle
    document.getElementById("pName").value = "";
    document.getElementById("pDesc").value = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pImageFile").value = "";
    document.getElementById("pStock").checked = true;
  } catch (e) {
    alert(e.message);
  }
};

// Init
(async function init() {
  await loadMe();
  await loadCategories();
  await loadProducts();
})();
