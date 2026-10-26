import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

export default function MinhasAnotacoes({ onVoltar, onNavegar }) {
  const { user } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [notas, setNotas] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Modal Cadastro/Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [notaEditando, setNotaEditando] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarNotas()
  }, [])

  async function carregarNotas() {
    setCarregando(true)
    const { data } = await supabase
      .from('notas_pessoais')
      .select('*')
      .eq('usuario_id', user.id)
      .order('atualizado_em', { ascending: false })
    
    setNotas(data || [])
    setCarregando(false)
  }

  function abrirNova() {
    setNotaEditando(null)
    setTitulo('')
    setConteudo('')
    setModalAberto(true)
  }

  function abrirEditar(nota) {
    setNotaEditando(nota)
    setTitulo(nota.titulo || '')
    setConteudo(nota.conteudo || '')
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!titulo.trim() && !conteudo.trim()) {
      alert('Preencha pelo menos o título ou o conteúdo.')
      return
    }

    setSalvando(true)
    const dados = {
      usuario_id: user.id,
      titulo: titulo.trim() || null,
      conteudo: conteudo.trim() || null,
      atualizado_em: new Date().toISOString()
    }

    try {
      if (notaEditando) {
        const { error } = await supabase.from('notas_pessoais').update(dados).eq('id', notaEditando.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('notas_pessoais').insert(dados)
        if (error) throw new Error(error.message)
      }

      setModalAberto(false)
      carregarNotas()
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(id) {
    if (!confirm('Deletar esta anotação?')) return
    const { error } = await supabase.from('notas_pessoais').delete().eq('id', id)
    if (error) {
      alert('Erro ao deletar: ' + error.message)
      return
    }
    carregarNotas()
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />

      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">☰</button>
          <span className="font-semibold">Minhas Anotações</span>
        </div>

        <div className="p-4 md:p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={onVoltar} className="text-slate-500 hover:text-slate-900 text-2xl">←</button>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Minhas Anotações</h1>
            </div>
            <button
              onClick={abrirNova}
              className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              + Nova
            </button>
          </div>

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : notas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400">
              Nenhuma anotação ainda. Clique em "+ Nova" pra começar.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notas.map(nota => (
                <div 
                  key={nota.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => abrirEditar(nota)}
                >
                  {nota.titulo && (
                    <p className="font-bold text-slate-900 mb-1">{nota.titulo}</p>
                  )}
                  {nota.conteudo && (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">
                      {nota.conteudo}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-3">
                    {new Date(nota.atualizado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL NOVA/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {notaEditando ? 'Editar Anotação' : 'Nova Anotação'}
            </h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Trocar pneu do carro 2"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Conteúdo <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={conteudo}
                  onChange={e => setConteudo(e.target.value)}
                  placeholder="Anote qualquer coisa aqui..."
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {notaEditando && (
                <button
                  onClick={() => { handleDeletar(notaEditando.id); setModalAberto(false); }}
                  disabled={salvando}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-3 rounded-lg text-sm"
                >
                  Deletar
                </button>
              )}
              <button onClick={() => setModalAberto(false)} disabled={salvando} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando} className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}