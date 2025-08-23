# Product Catalog

Flask + MySQL tabanlı, **tek sayfa** (SPA benzeri) bir ürün katalog uygulaması.  
Sitede **alışveriş yapılmaz**; ürünlerin **fiyatı, görseli, açıklaması ve stok durumu** listelenir.  
**Admin** kullanıcı, arayüzden **dosya yükleyerek** ürün ekleyebilir. Diğer kullanıcılar yalnızca görüntüler ve arama/filtre yapar.

## Özellikler
- Kullanıcı **kayıt & giriş** (Flask-Login).  
- **Rol**: `admin` (ürün ekleme yetkisi) / `user`.  
- Kategoriler (örn. *mutfak gereçleri, temizlik eşyaları, diğer*).  
- **Dosya olarak** ürün görseli yükleme (URL değil).  
- Arama + kategori & stok filtreleri.  
- Docker Compose ile kolay kurulum.

## Teknolojiler
- **Backend**: Python 3.11, Flask, Flask-SQLAlchemy, Flask-Login, Gunicorn  
- **DB**: MySQL 8  
- **Frontend**: Bootstrap 5, vanilla JS  
- **Docker**: `docker-compose`

## Kurulum (Docker)
Ön koşul: Docker & Docker Compose.

## .en.example örneği

# Flask
FLASK_SECRET=change-me-please

# Admin (ilk açılışta seed)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe123!

# MySQL
MYSQL_HOST=db
MYSQL_DB=product_catalog
MYSQL_USER=cataloguser
MYSQL_PASSWORD=strong-db-pass
MYSQL_ROOT_PASSWORD=strong-root-pass

# Uygulama
UPLOAD_FOLDER=/app/uploads
SEED_CATEGORIES=mutfak gereçleri,temizlik eşyaları,diğer


```bash
git clone https://github.com/OmerTuregun/product_catalog.git
cd product_catalog
cp .env.example .env
# .env'i aç, değerleri düzenle (özellikle ADMIN_* ve MySQL şifreleri)
docker compose up -d --build
