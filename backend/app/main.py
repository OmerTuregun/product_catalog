import os
from flask import Flask, render_template, send_from_directory
from .db import db, init_db
from .auth import auth_bp, login_manager
from .products import prod_bp
from .seed import initial_seed
from flask_login import login_required

def create_app():
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", "dev")
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}"
        f"@{os.getenv('MYSQL_HOST','db')}/{os.getenv('MYSQL_DB')}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Uploads
    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "/app/uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB sınır (isteğe bağlı)

    init_db(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login_page"
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(prod_bp, url_prefix="/api")

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename, as_attachment=False)

    with app.app_context():
        db.create_all()
        initial_seed()

    return app
