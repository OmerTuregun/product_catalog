import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from werkzeug.utils import secure_filename
from .db import db
from .models import Product, Category
from .auth import require_admin

ALLOWED_EXT = {"jpg", "jpeg", "png", "webp", "gif"}

prod_bp = Blueprint("products", __name__)

def _allowed_file(filename: str) -> bool:
    ext = (filename.rsplit(".", 1)[-1] or "").lower()
    return ext in ALLOWED_EXT

@prod_bp.get("/categories")
@login_required
def categories_list():
    items = Category.query.order_by(Category.name).all()
    return jsonify([{"id":c.id,"name":c.name} for c in items])

@prod_bp.post("/categories")
@login_required
def categories_create():
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    name = (request.get_json() or {}).get("name","").strip()
    if not name: return jsonify({"error":"name required"}), 400
    if Category.query.filter_by(name=name).first():
        return jsonify({"error":"exists"}), 409
    c = Category(name=name)
    db.session.add(c); db.session.commit()
    return jsonify({"id":c.id,"name":c.name}), 201

@prod_bp.put("/categories/<int:cid>")
@login_required
def categories_update(cid):
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    c = Category.query.get_or_404(cid)
    name = (request.get_json() or {}).get("name","").strip()
    if not name: return jsonify({"error":"name required"}), 400
    c.name = name; db.session.commit()
    return jsonify({"id":c.id,"name":c.name})

@prod_bp.delete("/categories/<int:cid>")
@login_required
def categories_delete(cid):
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    c = Category.query.get_or_404(cid)
    db.session.delete(c); db.session.commit()
    return jsonify({"message":"deleted"})

@prod_bp.get("/products")
@login_required
def products_list():
    q = request.args.get("query","").strip()
    category_id = request.args.get("category_id", type=int)
    in_stock = request.args.get("in_stock")

    qry = Product.query
    if q:
        like = f"%{q}%"
        from sqlalchemy import or_
        from .models import Product as P
        qry = qry.filter(or_(P.name.ilike(like), P.description.ilike(like)))
    if category_id:
        qry = qry.filter(Product.category_id == category_id)
    if in_stock in ("true","false"):
        qry = qry.filter(Product.in_stock == (in_stock == "true"))

    items = qry.order_by(Product.created_at.desc()).all()
    return jsonify([{
        "id":p.id, "name":p.name, "description":p.description,
        "price":str(p.price),
        "image_url": f"/uploads/{p.image_path}" if p.image_path else "",
        "in_stock":p.in_stock, "category_id":p.category_id
    } for p in items])

@prod_bp.get("/products/<int:pid>")
@login_required
def product_detail(pid):
    p = Product.query.get_or_404(pid)
    return jsonify({
        "id":p.id,"name":p.name,"description":p.description,
        "price":str(p.price),
        "image_url": f"/uploads/{p.image_path}" if p.image_path else "",
        "in_stock":p.in_stock,"category_id":p.category_id
    })

@prod_bp.post("/products")
@login_required
def product_create():
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    # multipart/form-data beklenir
    form = request.form
    file = request.files.get("image")  # ⬅️ dosya alanı

    name = (form.get("name") or "").strip()
    description = form.get("description") or ""
    price = form.get("price") or "0"
    in_stock = (form.get("in_stock","true").lower() == "true")
    category_id = form.get("category_id")

    if not name:
        return jsonify({"error":"name required"}), 400
    if not file or file.filename == "":
        return jsonify({"error":"image required"}), 400
    if not _allowed_file(file.filename):
        return jsonify({"error":"invalid image type"}), 400

    # güvenli dosya adı + uuid
    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[-1].lower()
    unique = f"{uuid.uuid4().hex}.{ext}"
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique)
    file.save(upload_path)

    p = Product(
        name=name,
        description=description,
        price=price,
        image_path=unique,     # ⬅️ sadece dosya adı saklıyoruz
        in_stock=in_stock,
        category_id=int(category_id) if category_id else None
    )
    db.session.add(p); db.session.commit()
    return jsonify({"id":p.id}), 201

@prod_bp.put("/products/<int:pid>")
@login_required
def product_update(pid):
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    p = Product.query.get_or_404(pid)

    # Hem JSON hem multipart destekleyelim; dosya varsa multipart gelir
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("image")
        if "name" in form: p.name = (form.get("name") or "").strip()
        if "description" in form: p.description = form.get("description") or ""
        if "price" in form: p.price = form.get("price") or p.price
        if "in_stock" in form: p.in_stock = (form.get("in_stock","true").lower() == "true")
        if "category_id" in form: p.category_id = int(form.get("category_id")) if form.get("category_id") else None

        if file and file.filename:
            if not _allowed_file(file.filename):
                return jsonify({"error":"invalid image type"}), 400
            filename = secure_filename(file.filename)
            ext = filename.rsplit(".", 1)[-1].lower()
            unique = f"{uuid.uuid4().hex}.{ext}"
            upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique)
            file.save(upload_path)
            p.image_path = unique
    else:
        d = request.get_json() or {}
        for k in ("name","description"):
            if k in d: setattr(p,k,d[k])
        if "price" in d: p.price = d["price"]
        if "in_stock" in d: p.in_stock = bool(d["in_stock"])
        if "category_id" in d: p.category_id = d["category_id"]

    db.session.commit()
    return jsonify({"message":"updated"})

@prod_bp.delete("/products/<int:pid>")
@login_required
def product_delete(pid):
    if not require_admin(): return jsonify({"error":"forbidden"}), 403
    p = Product.query.get_or_404(pid)
    db.session.delete(p); db.session.commit()
    return jsonify({"message":"deleted"})
