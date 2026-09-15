from app.services.provas_parser import parse_provas


def _prova(materia, nota, nota_exibicao):
    return {"materia": materia, "nota": nota, "nota_exibicao": nota_exibicao}


def test_modulo_power_bi_prova_10():
    descricao = "Módulo: Power BiProva: 10,0Aluno realizou a prova corretamente. Parabéns!"
    assert parse_provas(descricao) == [_prova("Power Bi", 10.0, "10,0")]


def test_modulo_excel_avancado_ii_prova_10_com_livro():
    descricao = (
        "Módulo: Excel Avançado IIProva: 10                       "
        "Livro: PendenteA aluna conseguiu..."
    )
    assert parse_provas(descricao) == [_prova("Excel Avançado II", 10.0, "10")]


def test_duas_provas_na_mesma_descricao():
    descricao = (
        "Módulo: Excel avançado IProva:7,0Módulo: Excel Avançado IIProva: 7,5"
        "Aluna teve dificuldades..."
    )
    assert parse_provas(descricao) == [
        _prova("Excel avançado I", 7.0, "7,0"),
        _prova("Excel Avançado II", 7.5, "7,5"),
    ]


def test_prova_realizada_modulo_nota_em_vez_de_prova():
    descricao = (
        "Prova Realizada!Módulo:Windows 11Nota: 8,0Livro: Pendente"
        "O aluno foi bem na prova..."
    )
    assert parse_provas(descricao) == [_prova("Windows 11", 8.0, "8,0")]


def test_sem_rotulo_modulo_materia_antes_de_nota():
    descricao = (
        "Excel Avançado Inota: 8,5book: 10,0média:9,2APROVADOobs: Aluno e excelente..."
    )
    resultado = parse_provas(descricao)
    assert resultado == [_prova("Excel Avançado I", 8.5, "8,5")]
    assert resultado[0]["nota"] != 10.0
    assert resultado[0]["nota"] != 9.2


def test_windows_11_nota_sem_modulo():
    descricao = "Windows 11nota: 9,0book: pendenteAPROVADO"
    assert parse_provas(descricao) == [_prova("Windows 11", 9.0, "9,0")]


def test_google_ads_nota_sem_modulo():
    descricao = "Google ADSNota: 10,0APROVADAobs: Exímia de aluna, fez uma prova perfeita!"
    assert parse_provas(descricao) == [_prova("Google ADS", 10.0, "10,0")]


def test_descricao_vazia_ou_nula_nao_quebra():
    assert parse_provas(None) == []
    assert parse_provas("") == []
    assert parse_provas("   ") == []


def test_modulo_sem_nota_nao_descarta():
    resultado = parse_provas("Módulo: Power BiLivro: PendenteAluno fez a prova")
    assert resultado == [_prova("Power Bi", None, None)]


def test_nota_sem_materia_nao_descarta():
    resultado = parse_provas("nota: 7,0")
    assert resultado == [_prova(None, 7.0, "7,0")]
