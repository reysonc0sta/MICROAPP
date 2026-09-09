import React, { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import {
  BookMarked,
  CheckCircle,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  Plus,
} from 'lucide-react';

export function CadastroMateria() {
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregar = async () => {
    setCarregandoLista(true);
    setErro('');
    try {
      const { data } = await api.get('/materias/');
      setMaterias(Array.isArray(data) ? data : []);
    } catch (err) {
      setErro(apiErrorMessage(err, 'Erro ao carregar matérias.'));
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const cancelar = () => {
    setEditandoId(null);
    setNome('');
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);
    try {
      if (editandoId) {
        await api.patch(`/materias/${editandoId}`, { nome });
        setSucesso('Matéria atualizada.');
      } else {
        await api.post('/materias/', { nome });
        setSucesso('Matéria cadastrada.');
      }
      setNome('');
      setEditandoId(null);
      await carregar();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível salvar a matéria.'));
    } finally {
      setCarregando(false);
    }
  };

  const excluir = async (materia) => {
    if (!window.confirm(`Excluir a matéria "${materia.nome}"?`)) return;
    setErro('');
    setSucesso('');
    try {
      await api.delete(`/materias/${materia.id}`);
      setSucesso('Matéria excluída.');
      await carregar();
    } catch (err) {
      setErro(apiErrorMessage(err, 'Não foi possível excluir a matéria.'));
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="page-title flex items-center gap-2">
          <BookMarked size={22} className="text-navy-600 dark:text-navy-300" />
          Matérias
        </h2>
        <p className="page-subtitle mt-1">Cadastre o catálogo de disciplinas da instituição.</p>
      </div>

      {sucesso ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          {sucesso}
        </div>
      ) : null}

      {erro ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-4">
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {editandoId ? 'Editar matéria' : 'Nova matéria'}
            </h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                className="field"
                placeholder="Ex: Matemática"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={carregando} className="btn-primary">
                {carregando ? <Loader2 size={16} className="animate-spin" /> : editandoId ? <Save size={16} /> : <Plus size={16} />}
                {editandoId ? 'Salvar' : 'Cadastrar'}
              </button>
              {editandoId ? (
                <button type="button" onClick={cancelar} className="btn-secondary">
                  <X size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
            {carregandoLista ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Carregando...
              </div>
            ) : materias.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Nenhuma matéria cadastrada.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-6">Nome</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {materias.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-slate-100">{m.nome}</td>
                      <td className="px-4 py-3 sm:px-6">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => {
                              setEditandoId(m.id);
                              setNome(m.nome);
                              setSucesso('');
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Excluir"
                            onClick={() => excluir(m)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 dark:border-red-900/60 dark:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
