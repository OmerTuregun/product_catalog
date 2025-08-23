import os
from .db import db
from .models import User, Category
from .utils import hash_password
from werkzeug.security import generate_password_hash

def initial_seed():
    # Admin
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    if not User.query.filter_by(username=admin_username).first():
        db.session.add(User(
            username=admin_username,
            password_hash=hash_password(admin_password),  # bcrypt ile
            role="admin"
        ))


    # Kategoriler
    cats = (os.getenv("SEED_CATEGORIES", "") or "").split(",")
    for name in [c.strip() for c in cats if c.strip()]:
        if not Category.query.filter_by(name=name).first():
            db.session.add(Category(name=name))

    db.session.commit()
