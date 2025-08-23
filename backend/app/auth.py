from flask import Blueprint, request, jsonify, render_template
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from .db import db
from .models import User
from .utils import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)
login_manager = LoginManager()

class U(UserMixin):
    def __init__(self, user):
        self.id = user.id
        self.username = user.username
        self.role = user.role

@login_manager.user_loader
def load_user(user_id):
    u = User.query.get(int(user_id))
    return U(u) if u else None

def require_admin():
    return (hasattr(current_user, "role") and current_user.role == "admin")

@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error":"username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error":"username taken"}), 409

    u = User(username=username, password_hash=hash_password(password), role="user")
    db.session.add(u)
    db.session.commit()
    return jsonify({"message":"registered"}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    u = User.query.filter_by(username=data.get("username","")).first()
    # 🔴 BURASI DÜZELDİ: check_password -> verify_password
    if not u or not verify_password(data.get("password",""), u.password_hash):
        return jsonify({"error":"invalid credentials"}), 401
    login_user(U(u))
    return jsonify({"message":"logged_in","role":u.role})

@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"message":"logged_out"})

@auth_bp.get("/login-page")
def login_legacy():
    return render_template("auth.html", view="login")

@auth_bp.get("/register-page")
def register_legacy():
    return render_template("auth.html", view="register")

@auth_bp.get("/page")
def login_page():
    view = request.args.get("view", "login")
    return render_template("auth.html", view=view)

@auth_bp.get("/me")
@login_required
def me():
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "role": getattr(current_user, "role", "user")
    })
