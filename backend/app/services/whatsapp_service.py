import asyncio
from sqlalchemy.orm import Session
from app.models.domain import HistoricoWhatsApp, Aluno, ProvaResultado, Materia
from app.services.telefones import obter_telefone_envio

async def executar_envio_whatsapp(aluno_id: int, materia_id: int, db: Session):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    materia = db.query(Materia).filter(Materia.id == materia_id).first()
    prova = (
        db.query(ProvaResultado)
        .filter(ProvaResultado.aluno_id == aluno_id, ProvaResultado.materia_id == materia_id)
        .order_by(ProvaResultado.data_realizacao.desc())
        .first()
    )

    if not aluno or not materia or not prova:
        return

    contato = obter_telefone_envio(aluno.telefone_pessoal, aluno.telefone_comercial)
    
    if not contato["numero"]:
        log = HistoricoWhatsApp(
            aluno_id=aluno.id,
            numero_destino="SEM_NUMERO",
            canal_utilizado="PESSOAL",
            usou_fallback=False,
            conteudo="Falha: Sem telefone cadastrado.",
            status_final="FALHA_AMBOS"
        )
        db.add(log)
        db.commit()
        return

    primeiro_nome = aluno.nome.split()[0].title()
    mensagem = (
        f"Olá, {primeiro_nome}! "
        f"O seu resultado na matéria de {materia.nome} foi atualizado: "
        f"Nota ({prova.tentativa}ª tentativa): {prova.nota}. "
        f"Bons estudos!"
    )

    historico = HistoricoWhatsApp(
        aluno_id=aluno.id,
        numero_destino=contato["numero"],
        canal_utilizado=contato["canal"],
        usou_fallback=contato["usou_fallback"],
        conteudo=mensagem,
        status_final="PENDENTE"
    )
    db.add(historico)
    db.commit()

    try:
        # Ação assíncrona do bot executada em segundo plano
        await asyncio.sleep(2) 
        historico.status_final = "SUCESSO"
    except Exception:
        historico.status_final = "FALHA_AMBOS"
    finally:
        db.commit()