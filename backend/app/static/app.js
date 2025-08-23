let userRole = null;
let username = null;

async function api(path, opts={}) {
  const res = await fetch(path, {headers:{'Content-Type':'application/json'}, credentials:'include', ...opts});
  if (!res.ok) throw new Error((await res.json()).error || 'error');
  return res.json();
}

async function apiForm(path, formData, method='POST') {
  const res = await fetch(path, { method, body: formData, credentials: 'include' });
  if (!res.ok) throw new Error((await res.json()).error || 'error');
  return res.json();
}

function setAuthUI() {
  // sadece logout ve (adminse) ürün ekle görünecek
  const adminBtn = document.getElementById('adminAddBtn');
  const welcome = document.getElementById('welcomeUser');

  adminBtn.classList.toggle('d-none', userRole !== 'admin');

  if (username) {
    welcome.textContent = `Hoşgeldin, ${username}`;
    welcome.classList.remove('d-none');
  } else {
    welcome.classList.add('d-none');
  }
}

async function loadMe() {
  // oturum yoksa backend /api/auth/page'e yönlendirir; burada hata alırsan auth sayfasına git
  try {
    const me = await api('/api/auth/me');
    userRole = me.role;
    username = me.username;
    setAuthUI();
  } catch (e) {
    // emniyet: auth sayfasına gönder
    window.location.href = '/api/auth/page';
  }
}

async function loadCategories() {
  const cats = await api('/api/categories');
  const cf = document.getElementById('categoryFilter');
  const pc = document.getElementById('pCategory');
  cf.innerHTML = '<option value="">Tüm Kategoriler</option>';
  pc.innerHTML = '';
  cats.forEach(c=>{
    cf.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
    pc.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  });
}

async function loadProducts() {
  const q = document.getElementById('searchInput').value.trim();
  const cat = document.getElementById('categoryFilter').value;
  const stock = document.getElementById('stockFilter').value;
  const params = new URLSearchParams();
  if (q) params.set('query', q);
  if (cat) params.set('category_id', cat);
  if (stock) params.set('in_stock', stock);

  const items = await api('/api/products?' + params.toString());
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';

  items.forEach(p => {
    const imgSrc = p.image_url || 'https://via.placeholder.com/800x600?text=No+Image';
    grid.insertAdjacentHTML('beforeend', `
      <div class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="product-media">
            <img src="${imgSrc}" alt="${p.name || 'Ürün görseli'}" loading="lazy"
                onerror="this.src='https://via.placeholder.com/800x600?text=No+Image'">
          </div>
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.name}</h5>
            <p class="card-text text-muted small">${p.description || ''}</p>
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <span class="fw-semibold">${p.price} ₺</span>
              <span class="badge ${p.in_stock ? 'bg-success' : 'bg-secondary'}">
                ${p.in_stock ? 'Stokta' : 'Yok'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `);
  });
}

document.getElementById('searchForm').addEventListener('submit', (e)=>{ e.preventDefault(); loadProducts(); });
document.getElementById('categoryFilter').addEventListener('change', loadProducts);
document.getElementById('stockFilter').addEventListener('change', loadProducts);

document.getElementById('logoutBtn').onclick = async ()=>{
  try {
    await api('/api/auth/logout', {method:'POST'});
  } catch (e) {
    // ignore
  }
  window.location.href = '/api/auth/page'; // çıkıştan sonra auth sayfası
};

document.getElementById('productSave').onclick = async ()=>{
  try{
    const fd = new FormData();
    fd.append('name', document.getElementById('pName').value);
    fd.append('description', document.getElementById('pDesc').value);
    fd.append('price', document.getElementById('pPrice').value);
    fd.append('category_id', document.getElementById('pCategory').value);
    fd.append('in_stock', document.getElementById('pStock').checked ? 'true' : 'false');
    const fileInput = document.getElementById('pImageFile');
    if (!fileInput.files.length) { alert('Lütfen bir görsel seçin.'); return; }
    fd.append('image', fileInput.files[0]);

    await apiForm('/api/products', fd, 'POST');
    await loadProducts();
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();

    // formu temizle
    document.getElementById('pName').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pImageFile').value = '';
    document.getElementById('pStock').checked = true;
  }catch(e){ alert(e.message); }
};

// Sayfa açılışı sırası: me -> kategoriler -> ürünler
(async function init(){
  await loadMe();
  await loadCategories();
  await loadProducts();
})();
