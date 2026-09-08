from sqlalchemy.orm import Session

from app.models.domain import HistoricoWhatsApp


def registrar_envio_whatsapp(
    db: Session,
    *,
    numero: str,
    canal: str,
    usou_fallback: bool,
    texto: str,
    status_final: str,
    nome_destino: str | None = None,
    aluno_id: int | None = None,
) -> HistoricoWhatsApp:
    """Persiste tentativa de envio alinhada ao enum status_final_enum."""
    registro = HistoricoWhatsApp(
        aluno_id=aluno_id,
        nome_destino=nome_destino,
        numero_destino=numero,
        canal_utilizado=canal,
        usou_fallback=usou_fallback,
        conteudo=texto,
        status_final=status_final,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro
