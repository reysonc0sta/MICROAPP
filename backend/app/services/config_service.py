from sqlalchemy.orm import Session
from app.models.domain import ConfiguracaoMensagem

TEMPLATE_PADRAO = (
    "Olá, {nome}! Notamos que você possui {faltas} falta(s) registrada(s). "
    "Lembrando que esta é a última semana para realizar a reposição do mês!"
)

TEMPLATE_LEMBRETE_PADRAO = (
    "Olá, {nome}! Informamos que não haverá aula no turno da {turno} nesta data. "
    "Qualquer dúvida, responda esta mensagem."
)

PLACEHOLDERS_SUPORTADOS = ["nome", "faltas"]
PLACEHOLDERS_LEMBRETE = ["nome", "turno"]


def obter_configuracao(db: Session) -> ConfiguracaoMensagem:
    config = db.query(ConfiguracaoMensagem).first()
    if not config:
        config = ConfiguracaoMensagem(
            template=TEMPLATE_PADRAO,
            template_lembrete=TEMPLATE_LEMBRETE_PADRAO,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    if not getattr(config, "template_lembrete", None):
        config.template_lembrete = TEMPLATE_LEMBRETE_PADRAO
        db.commit()
        db.refresh(config)
    return config


def obter_template_mensagem(db: Session) -> str:
    return obter_configuracao(db).template


def obter_template_lembrete(db: Session) -> str:
    return obter_configuracao(db).template_lembrete or TEMPLATE_LEMBRETE_PADRAO


def atualizar_template_mensagem(db: Session, novo_template: str) -> ConfiguracaoMensagem:
    config = obter_configuracao(db)
    config.template = novo_template
    db.commit()
    db.refresh(config)
    return config


def atualizar_template_lembrete(db: Session, novo_template: str) -> ConfiguracaoMensagem:
    config = obter_configuracao(db)
    config.template_lembrete = novo_template
    db.commit()
    db.refresh(config)
    return config


def renderizar_mensagem(template: str, nome: str, faltas: int) -> str:
    primeiro_nome = nome.split()[0].title()
    try:
        return template.format(nome=primeiro_nome, faltas=faltas)
    except (KeyError, IndexError):
        # Placeholder inválido no template salvo: cai para o padrão em vez de quebrar o disparo.
        return TEMPLATE_PADRAO.format(nome=primeiro_nome, faltas=faltas)


def renderizar_mensagem_lembrete(template: str, nome: str, turno: str) -> str:
    primeiro_nome = nome.split()[0].title()
    try:
        return template.format(nome=primeiro_nome, turno=turno)
    except (KeyError, IndexError):
        return TEMPLATE_LEMBRETE_PADRAO.format(nome=primeiro_nome, turno=turno)