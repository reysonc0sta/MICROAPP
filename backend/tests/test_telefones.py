from app.services.telefones import candidatos_envio, limpar_telefone, obter_telefone_envio


def test_limpar_telefone_adiciona_ddi_brasil():
    assert limpar_telefone("11987654321") == "5511987654321"
    assert limpar_telefone("(11) 3333-4444") == "551133334444"


def test_limpar_telefone_ja_com_ddi():
    assert limpar_telefone("5511987654321") == "5511987654321"


def test_limpar_telefone_remove_zero_tronco():
    assert limpar_telefone("011987654321") == "5511987654321"


def test_limpar_telefone_invalido_retorna_none():
    assert limpar_telefone(None) is None
    assert limpar_telefone("") is None
    assert limpar_telefone("123") is None
    assert limpar_telefone(float("nan")) is None


def test_candidatos_envio_pessoal_depois_comercial():
    canais = candidatos_envio("11987654321", "1133334444")
    assert [c["canal"] for c in canais] == ["PESSOAL", "COMERCIAL"]
    assert canais[0]["usou_fallback"] is False
    assert canais[1]["usou_fallback"] is True


def test_candidatos_envio_ignora_duplicado():
    canais = candidatos_envio("11987654321", "11987654321")
    assert len(canais) == 1
    assert canais[0]["canal"] == "PESSOAL"


def test_obter_telefone_envio_primeiro_canal():
    contato = obter_telefone_envio(None, "1133334444")
    assert contato["canal"] == "COMERCIAL"
    assert contato["numero"] == "551133334444"
