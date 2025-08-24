# backend/app/models.py
from .db import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(16), default="user")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)

class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    in_stock = db.Column(db.Boolean, default=True, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    category = db.relationship("Category")
    # Eski tekli görsel alanı (geriye uyumluluk için)
    image_path = db.Column(db.String(255), nullable=True)

    images = db.relationship(
        "ProductImage",
        backref="product",
        order_by="ProductImage.id.asc()",
        cascade="all, delete-orphan",
        lazy="joined",
    )

    def primary_image_url(self, base="/uploads/"):
        if self.images:
            return base + self.images[0].file_path
        if self.image_path:
            return base + self.image_path
        return None

    def to_list_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": float(self.price),
            "in_stock": self.in_stock,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "primary_image_url": self.primary_image_url(),
        }

    def to_detail_dict(self):
        return {
            **self.to_list_dict(),
            "description": self.description,
            "images": ["/uploads/" + img.file_path for img in self.images]
                      or ([self.primary_image_url()] if self.primary_image_url() else []),
        }

class ProductImage(db.Model):
    __tablename__ = "product_images"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    file_path = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
