import os
from app.core.database import SessionLocal, engine, Base
from app.models.domain import Usuario
from app.core.security import gerar_hash_senha

Base.metadata.create_all(bind=engine)

db = SessionLocal()

admin_email = os.getenv("ADMIN_EMAIL", "admin@escola.com").lower().strip()
admin_password = os.getenv("ADMIN_PASSWORD", "")

if not admin_password:
    print("⚠️  ADMIN_PASSWORD não definido. Seed de admin ignorado.")
    db.close()
    raise SystemExit(0)

admin_existente = db.query(Usuario).filter(Usuario.email == admin_email).first()

if not admin_existente:
    admin = Usuario(
        nome="Administrador Master",
        email=admin_email,
        senha_hash=gerar_hash_senha(admin_password),
        cargo="ADM",
    )
    db.add(admin)
    db.commit()
    print(f"✅ Usuário Admin criado: {admin_email}")
else:
    print(f"ℹ️  O usuário {admin_email} já existe no banco de dados.")

db.close()
