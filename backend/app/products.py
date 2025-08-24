# backend/app/products.py
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from werkzeug.utils import secure_filename
from .db import db
from .models import Product, Category, ProductImage
from .auth import require_admin

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "gif"}

prod_bp = Blueprint("products", __name__)

def _allowed_file(filename: str) -> bool:
    ext = (filename.rsplit(".", 1)[-1] or "").lower()
    return ext in ALLOWED_EXT

# ---------- KATEGORİLER ----------
@prod_bp.get("/categories")
@login_required
def categories_list():
    items = Category.query.order_by(Category.name).all()
    return jsonify([{"id": c.id, "name": c.name} for c in items])

@prod_bp.post("/categories")
@login_required
def categories_create():
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403
    name = (request.get_json() or {}).get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error": "exists"}), 409
    c = Category(name=name)
    db.session.add(c); db.session.commit()
    return jsonify({"id": c.id, "name": c.name}), 201

@prod_bp.put("/categories/<int:cid>")
@login_required
def categories_update(cid):
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403
    c = Category.query.get_or_404(cid)
    name = (request.get_json() or {}).get("name", "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    c.name = name; db.session.commit()
    return jsonify({"id": c.id, "name": c.name})

@prod_bp.delete("/categories/<int:cid>")
@login_required
def categories_delete(cid):
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403
    c = Category.query.get_or_404(cid)
    db.session.delete(c); db.session.commit()
    return jsonify({"message": "deleted"})

# ---------- ÜRÜNLER ----------
@prod_bp.get("/products")
@login_required
def products_list():
    q = request.args.get("query", "").strip()
    category_id = request.args.get("category_id", type=int)
    in_stock = request.args.get("in_stock")

    qry = Product.query
    if q:
        like = f"%{q}%"
        from sqlalchemy import or_
        qry = qry.filter(or_(Product.name.ilike(like), Product.description.ilike(like)))
    if category_id:
        qry = qry.filter(Product.category_id == category_id)
    if in_stock in ("true", "false"):
        qry = qry.filter(Product.in_stock == (in_stock == "true"))

    items = qry.order_by(Product.id.desc()).all()
    return jsonify([p.to_list_dict() for p in items])

@prod_bp.get("/products/<int:pid>")
@login_required
def product_detail(pid):
    p = Product.query.get_or_404(pid)
    return jsonify(p.to_detail_dict())

@prod_bp.post("/products")
@login_required
def product_create():
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403

    form = request.form
    files = request.files.getlist("images")
    if not files:
        f = request.files.get("image")
        if f:
            files = [f]

    name = (form.get("name") or "").strip()
    description = form.get("description") or ""
    price = form.get("price") or "0"
    in_stock = (form.get("in_stock", "true").lower() == "true")
    category_id = form.get("category_id")

    if not name:
        return jsonify({"error": "name required"}), 400
    if not files:
        return jsonify({"error": "at least one image required"}), 400

    saved = []
    for f in files:
        if not f or not f.filename:
            continue
        if not _allowed_file(f.filename):
            return jsonify({"error": "invalid image type"}), 400
        ext = (secure_filename(f.filename).rsplit(".", 1)[-1] or "").lower()
        unique = f"{uuid.uuid4().hex}.{ext}"
        f.save(os.path.join(current_app.config["UPLOAD_FOLDER"], unique))
        saved.append(unique)

    p = Product(
        name=name,
        description=description,
        price=price,
        in_stock=in_stock,
        category_id=int(category_id) if category_id else None,
        # Geriye uyumluluk: ilk görseli eski alanda da saklayalım
        image_path=(saved[0] if saved else None),
    )
    db.session.add(p)
    db.session.flush()  # p.id için

    for fn in saved:
        db.session.add(ProductImage(product_id=p.id, file_path=fn))

    db.session.commit()
    return jsonify({"id": p.id}), 201

@prod_bp.put("/products/<int:pid>")
@login_required
def product_update(pid):
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403
    p = Product.query.get_or_404(pid)

    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        files = request.files.getlist("images")
        if "name" in form:
            p.name = (form.get("name") or "").strip()
        if "description" in form:
            p.description = form.get("description") or ""
        if "price" in form:
            p.price = form.get("price") or p.price
        if "in_stock" in form:
            p.in_stock = (form.get("in_stock", "true").lower() == "true")
        if "category_id" in form:
            p.category_id = int(form.get("category_id")) if form.get("category_id") else None

        for f in files:
            if not f or not f.filename:
                continue
            if not _allowed_file(f.filename):
                return jsonify({"error": "invalid image type"}), 400
            ext = (secure_filename(f.filename).rsplit(".", 1)[-1] or "").lower()
            unique = f"{uuid.uuid4().hex}.{ext}"
            f.save(os.path.join(current_app.config["UPLOAD_FOLDER"], unique))
            db.session.add(ProductImage(product_id=p.id, file_path=unique))
            if not p.image_path:
                p.image_path = unique
    else:
        d = request.get_json() or {}
        for k in ("name", "description"):
            if k in d:
                setattr(p, k, d[k])
        if "price" in d:
            p.price = d["price"]
        if "in_stock" in d:
            p.in_stock = bool(d["in_stock"])
        if "category_id" in d:
            p.category_id = d["category_id"]

    db.session.commit()
    return jsonify({"message": "updated"})

@prod_bp.delete("/products/<int:pid>")
@login_required
def product_delete(pid):
    if not require_admin():
        return jsonify({"error": "forbidden"}), 403
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "deleted"})
