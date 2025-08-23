import bcrypt
from werkzeug.security import check_password_hash as wz_check

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    if not hashed:
        return False
    # 1) bcrypt formatı
    if hashed.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(pw.encode(), hashed.encode())
        except Exception:
            return False
    # 2) Werkzeug formatları (pbkdf2:, scrypt:, vb.)
    if ":" in hashed:  # pbkdf2:, scrypt: gibi
        try:
            return wz_check(hashed, pw)   # werkzeug tüm bu formatları çözer
        except Exception:
            return False
    return False
