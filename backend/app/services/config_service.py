from sqlalchemy.orm import Session
from app.models.domain import ConfiguracaoMensagem

TEMPLATE_PADRAO = (
    "Olá, {nome}! Notamos que você possui {faltas} falta(s) registrada(s). "
    "Lembrando que esta é a última semana para realizar a reposição do mês! "
    "Por favor, responda a esta mensagem para agendarmos o seu horário."
)

PLACEHOLDERS_SUPORTADOS = ["nome", "faltas"]


def obter_configuracao(db: Session) -> ConfiguracaoMensagem:
    config = db.query(ConfiguracaoMensagem).first()
    if not config:
        config = ConfiguracaoMensagem(template=TEMPLATE_PADRAO)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def obter_template_mensagem(db: Session) -> str:
    return obter_configuracao(db).template


def atualizar_template_mensagem(db: Session, novo_template: str) -> ConfiguracaoMensagem:
    config = obter_configuracao(db)
    config.template = novo_template
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