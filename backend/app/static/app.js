let userRole = null;
let username = null;
let editingId = null; // ← düzenleme modunda hangi ürün

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
  const res = await fetch(path, { method, body: formData, credentials: "include" });
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
  } catch {
    window.location.href = "/api/auth/page";
  }
}

async function loadCategories() {
  const cats = await api("/api/categories");
  const cf = document.getElementById("categoryFilter");
  const pc = document.getElementById("pCategory");
  cf.innerHTML = '<option value="">Tüm Kategoriler</option>';
  pc.innerHTML = '<option value="" disabled selected hidden>Kategori Seçin &rarr;</option>';
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

  items.forEach(p => {
    const imgSrc = p.primary_image_url || 'https://via.placeholder.com/800x600?text=No+Image';
    const adminTools = (userRole === "admin")
      ? `
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${p.id}" title="Sil">
          <i class="bi bi-trash"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${p.id}" title="Düzenle">
          <i class="bi bi-pencil"></i>
        </button>
      `
      : "";

    grid.insertAdjacentHTML('beforeend', `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card product-card h-100">
          <div class="product-media">
            <img src="${imgSrc}" alt="${p.name || 'Ürün görseli'}" loading="lazy"
                onerror="this.src='https://via.placeholder.com/800x600?text=No+Image'">
          </div>
          <div class="card-body d-flex flex-column gap-2">
            <!-- 1) Ürün adı -->
            <h6 class="card-title mb-1">${p.name}</h6>
            <!-- 2) Fiyat -->
            <div class="price mb-1">${p.price} ₺</div>
            <!-- 3) Aksiyonlar (Detaylar, Stok, Sil, Düzenle) -->
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button class="btn btn-sm btn-primary-soft" data-action="details" data-id="${p.id}">
                Detaylar
              </button>
              <span class="status-pill ${p.in_stock ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                ${p.in_stock ? 'Stokta' : 'Yok'}
              </span>
              ${adminTools}
            </div>
          </div>
        </div>
      </div>
    `);
});

}

// Kart üzerindeki butonlar (detay/edit/delete)
document.getElementById("productsGrid").addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");

  // Detay
  if (action === "details") {
    try {
      const p = await api(`/api/products/${id}`);
      document.getElementById("detailName").textContent = p.name;
      document.getElementById("detailPrice").textContent = `${p.price} ₺`;
      const stockEl = document.getElementById("detailStock");
      stockEl.textContent = p.in_stock ? "Stokta" : "Yok";
      stockEl.className = "badge " + (p.in_stock ? "bg-success" : "bg-secondary");
      document.getElementById("detailCategory").textContent = p.category_name || "";
      document.getElementById("detailDesc").textContent = p.description || "";

      const images = p.images && p.images.length ? p.images : [p.primary_image_url];
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

      new bootstrap.Modal(document.getElementById("detailModal")).show();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  // Düzenle (admin)
  if (action === "edit" && userRole === "admin") {
    try {
      const p = await api(`/api/products/${id}`);
      editingId = p.id;
      document.getElementById("productModalTitle").textContent = "Ürün Düzenle";
      document.getElementById("productSave").textContent = "Güncelle";

      document.getElementById("pName").value = p.name || "";
      document.getElementById("pDesc").value = p.description || "";
      document.getElementById("pPrice").value = p.price || "";
      document.getElementById("pCategory").value = p.category_id || "";
      document.getElementById("pStock").checked = !!p.in_stock;
      document.getElementById("pImageFiles").value = ""; // yeni eklenirse append edilecek

      new bootstrap.Modal(document.getElementById("productModal")).show();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  // Sil (admin)
  if (action === "delete" && userRole === "admin") {
    const ok = confirm("Bu ürünü silmek istediğinize emin misiniz?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "error");
      await loadProducts();
    } catch (err) {
      alert(err.message);
    }
    return;
  }
});

// Admin “Ürün Ekle” butonuna basılınca formu sıfırla (yeni kayıt modu)
document.getElementById("adminAddBtn").addEventListener("click", () => {
  editingId = null;
  document.getElementById("productModalTitle").textContent = "Yeni Ürün";
  document.getElementById("productSave").textContent = "Kaydet";
  document.getElementById("pName").value = "";
  document.getElementById("pDesc").value = "";
  document.getElementById("pPrice").value = "";
  document.getElementById("pCategory").value = "";
  document.getElementById("pStock").checked = true;
  document.getElementById("pImageFiles").value = "";
});

// Kayıt/Güncelle
document.getElementById("productSave").onclick = async () => {
  try {
    const fd = new FormData();
    fd.append("name", document.getElementById("pName").value);
    fd.append("description", document.getElementById("pDesc").value);
    fd.append("price", document.getElementById("pPrice").value);
    fd.append("category_id", document.getElementById("pCategory").value);
    fd.append("in_stock", document.getElementById("pStock").checked ? "true" : "false");

    const files = document.getElementById("pImageFiles").files;
    if (!editingId && !files.length) {
      alert("Lütfen en az bir görsel seçin.");
      return;
    }
    for (const f of files) fd.append("images", f);

    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PUT" : "POST";

    await apiForm(url, fd, method);
    await loadProducts();
    bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();

    // form reset ve mod kapanışı sonrası varsayılan moda dön
    editingId = null;
    document.getElementById("productModalTitle").textContent = "Yeni Ürün";
    document.getElementById("productSave").textContent = "Kaydet";
    document.getElementById("pName").value = "";
    document.getElementById("pDesc").value = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pImageFiles").value = "";
    document.getElementById("pStock").checked = true;
  } catch (e) {
    alert(e.message);
  }
};

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  loadProducts();
});
document.getElementById("categoryFilter").addEventListener("change", loadProducts);
document.getElementById("stockFilter").addEventListener("change", loadProducts);

document.getElementById("logoutBtn").onclick = async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  window.location.href = "/api/auth/page";
};

// init
(async function init() {
  await loadMe();
  await loadCategories();
  await loadProducts();
})();
