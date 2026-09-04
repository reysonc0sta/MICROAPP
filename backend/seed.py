from app.core.database import SessionLocal, engine, Base
from app.models.domain import Usuario
from app.core.security import gerar_hash_senha

# Garante que as tabelas existem
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Verifica se já existe um admin
admin_existente = db.query(Usuario).filter(Usuario.email == "admin@escola.com").first()

if not admin_existente:
    admin = Usuario(
        nome="Administrador Master",
        email="admin@escola.com",
        senha_hash=gerar_hash_senha("admin123"),
        cargo="ADM"
    )
    db.add(admin)
    db.commit()
    print("✅ Usuário Admin criado com sucesso!")
    print("   E-mail: admin@escola.com")
    print("   Senha:  admin123")
else:
    print("ℹ️ O usuário admin@escola.com já existe no banco de dados.")

db.close()