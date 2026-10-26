import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function CadastrarChecklist({ onVoltar, onNavegar }) {
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [itens, setItens] = useState([])
  const [carregando, setCarregando] = useState(true)

  // Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [itemEditando, setItemEditando] = useState(null)
  
  // Formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('pre')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarItens()
  }, [])

  async function carregarItens() {
    setCarregando(true)
    const { data } = await supabase
      .from('checklist_itens')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    setItens(data || [])
    setCarregando(false)
  }

  function abrirNovo(tipoInicial) {
    setItemEditando(null)
    setNome('')
    setDescricao('')
    setTipo(tipoInicial)
    setModalAberto(true)
  }

  function abrirEditar(item) {
    setItemEditando(item)
    setNome(item.nome)
    setDescricao(item.descricao || '')
    setTipo(item.tipo)
    setModalAberto(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!nome.trim() || salvando) return

    setSalvando(true)
    const dados = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tipo: tipo
    }

    if (itemEditando) {
      const { error } = await supabase
        .from('checklist_itens')
        .update(dados)
        .eq('id', itemEditando.id)
      
      if (error) alert('Erro ao editar: ' + error.message)
    } else {
      const { error } = await supabase
        .from('checklist_itens')
        .insert(dados)
      
      if (error) alert('Erro ao criar: ' + error.message)
    }

    setSalvando(false)
    setModalAberto(false)
    carregarItens()
  }

  async function handleDesativar(id) {
    if (!confirm('Tem certeza que quer desativar este item? Ele não aparecerá mais nos novos checklists, mas o histórico fica salvo.')) return

    const { error } = await supabase
      .from('checklist_itens')
      .update({ ativo: false })
      .eq('id', id)
    
    if (error) alert('Erro ao desativar: ' + error.message)
    carregarItens()
  }

  // Separação dos itens
  const itensPre = itens.filter(i => i.tipo === 'pre' || i.tipo === 'ambos')
  const itensDurante = itens.filter(i => i.tipo === 'durante' || i.tipo === 'ambos')

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />

      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">☰</button>
          <span className="font-semibold">Catálogo de Checklists</span>
        </div>

        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={onVoltar} className="text-slate-500 hover:text-slate-900 text-2xl">←</button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Catálogo de Itens
            </h1>
          </div>

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* PAINEL PRÉ-CORRIDA */}
              <div className="bg-white rounded-2xl shadow-lg border-t-4 border-[#0066B1] overflow-hidden flex flex-col h-[70vh]">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Checklist Pré-Corrida</h2>
                    <p className="text-xs text-slate-500 mt-1">Vistoria completa com fotos (antes da etapa)</p>
                  </div>
                  <button 
                    onClick={() => abrirNovo('pre')}
                    className="bg-[#0066B1] hover:bg-[#005090] text-white p-2 rounded-lg"
                    title="Adicionar item"
                  >
                    + Novo
                  </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                  {itensPre.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">Nenhum item cadastrado.</p>
                  ) : (
                    itensPre.map(item => (
                      <ItemLinha key={item.id} item={item} onEditar={abrirEditar} onDesativar={handleDesativar} />
                    ))
                  )}
                </div>
              </div>

              {/* PAINEL DURANTE A CORRIDA */}
              <div className="bg-white rounded-2xl shadow-lg border-t-4 border-[#E10600] overflow-hidden flex flex-col h-[70vh]">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Checklist Durante</h2>
                    <p className="text-xs text-slate-500 mt-1">Marcação rápida de OK (treinos e baterias)</p>
                  </div>
                  <button 
                    onClick={() => abrirNovo('durante')}
                    className="bg-[#E10600] hover:bg-[#c00500] text-white p-2 rounded-lg"
                    title="Adicionar item"
                  >
                    + Novo
                  </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                  {itensDurante.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">Nenhum item cadastrado.</p>
                  ) : (
                    itensDurante.map(item => (
                      <ItemLinha key={item.id} item={item} onEditar={abrirEditar} onDesativar={handleDesativar} />
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {itemEditando ? 'Editar Item' : 'Novo Item'}
            </h3>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Item</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Cinto de segurança"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Verificar etiquetas"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Onde este item será usado?</label>
                <select
                  value={tipo}
                  onChange={e => setTipo(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                >
                  <option value="pre">Apenas Pré-Corrida</option>
                  <option value="durante">Apenas Durante a Corrida</option>
                  <option value="ambos">Ambos os checklists</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || !nome.trim()}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente isolado para a linha do item
function ItemLinha({ item, onEditar, onDesativar }) {
  return (
    <div className="flex items-start justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg group transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-semibold text-slate-900 text-sm truncate">{item.nome}</p>
        {item.descricao && (
          <p className="text-xs text-slate-500 truncate">{item.descricao}</p>
        )}
        {item.tipo === 'ambos' && (
          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-2 py-0.5 rounded-sm">
            Ambos
          </span>
        )}
      </div>
      
      <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onEditar(item)}
          className="p-1.5 text-slate-400 hover:text-[#0066B1] bg-white rounded shadow-sm"
          title="Editar"
        >
          ✏️
        </button>
        <button 
          onClick={() => onDesativar(item.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded shadow-sm"
          title="Desativar"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}