from unittest.mock import patch

import pandas as pd

from app.services.lembrete_service import processar_lembretes_excel


def _planilha_lembrete(tmp_path):
    caminho = tmp_path / "lembretes.xlsx"
    pd.DataFrame(
        {
            "Nome Aluno": ["Ana Silva", "Bruno Costa"],
            "Turno": ["Manhã", "Tarde"],
            "Status Contrato": ["Ativo", "Ativo"],
            "Telefone Aluno": ["11987654321", "11911112222"],
            "Telefone Responsável": [None, None],
        }
    ).to_excel(caminho, index=False)
    return str(caminho)


def test_processar_lembretes_com_imagem_usa_enviar_lembrete(tmp_path, db_mock):
    planilha = _planilha_lembrete(tmp_path)
    imagem = tmp_path / "aviso.jpg"
    imagem.write_bytes(b"fake-jpeg-bytes")

    with (
        patch(
            "app.services.lembrete_service.obter_template_lembrete",
            return_value="Olá, {nome}! Sem aula no turno da {turno}.",
        ),
        patch("app.services.lembrete_service.enviar_lembrete", return_value=True) as enviar,
        patch("app.services.lembrete_service.registrar_envio_whatsapp") as registrar,
    ):
        resultado = processar_lembretes_excel(
            planilha,
            db_mock,
            turno="MANHA",
            instance_name="user_1",
            caminho_imagem=str(imagem),
            imagem_mimetype="image/jpeg",
            imagem_nome="aviso.jpg",
        )

    assert resultado["total_sucesso"] == 1
    assert resultado["com_imagem"] is True
    enviar.assert_called()
    kwargs = enviar.call_args.kwargs
    assert kwargs["caminho_imagem"] == str(imagem)
    assert kwargs["mimetype"] == "image/jpeg"
    assert kwargs["file_name"] == "aviso.jpg"
    assert registrar.call_args.kwargs["texto"].startswith("[imagem]")


def test_processar_lembretes_sem_imagem_ainda_envia_texto(tmp_path, db_mock):
    planilha = _planilha_lembrete(tmp_path)

    with (
        patch(
            "app.services.lembrete_service.obter_template_lembrete",
            return_value="Olá, {nome}! Sem aula no turno da {turno}.",
        ),
        patch("app.services.lembrete_service.enviar_lembrete", return_value=True) as enviar,
        patch("app.services.lembrete_service.registrar_envio_whatsapp"),
    ):
        resultado = processar_lembretes_excel(
            planilha,
            db_mock,
            turno="TODOS",
            instance_name="user_1",
        )

    assert resultado["total_sucesso"] == 2
    assert resultado["com_imagem"] is False
    assert enviar.call_args.kwargs.get("caminho_imagem") is None
