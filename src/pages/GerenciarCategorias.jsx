import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

export default function GerenciarCategorias({ onVoltar, onNavegar }) {
  const { user } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  const [novaCategoria, setNovaCategoria] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarCategorias()
  }, [])

  async function carregarCategorias() {
    setCarregando(true)
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('nome', { ascending: true })
    
    setCategorias(data || [])
    setCarregando(false)
  }

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!novaCategoria.trim() || salvando) return

    setSalvando(true)
    const { error } = await supabase
      .from('categorias')
      .insert({ nome: novaCategoria.trim() })

    if (error) {
      if (error.code === '23505') {
        alert('Essa categoria já existe.')
      } else {
        alert('Erro ao criar: ' + error.message)
      }
    } else {
      setNovaCategoria('')
      carregarCategorias()
    }
    setSalvando(false)
  }

  async function handleDeletar(id, nome) {
    // Verifica se tem carro usando essa categoria
    const { data: carros } = await supabase
      .from('carros')
      .select('id')
      .eq('categoria_id', id)
      .limit(1)

    if (carros && carros.length > 0) {
      alert('Não é possível deletar: existem carros cadastrados com essa categoria.')
      return
    }

    if (!confirm(`Tem certeza que quer deletar "${nome}"?`)) return

    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) {
      alert('Erro ao deletar: ' + error.message)
      return
    }
    carregarCategorias()
  }

  if (!user.is_admin) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} />
        <main className="flex-1 p-8">
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-500">
            Apenas administradores podem acessar esta página.
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
     <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />

      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">☰</button>
          <span className="font-semibold">Categorias</span>
        </div>

        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onVoltar} className="text-slate-500 hover:text-slate-900 text-2xl">←</button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Categorias</h1>
          </div>

          {/* Formulário de adicionar */}
          <form onSubmit={handleAdicionar} className="bg-white rounded-xl shadow p-4 mb-6 flex gap-2">
            <input
              type="text"
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              placeholder="Nome da nova categoria (ex: Sport ER)"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
            />
            <button
              type="submit"
              disabled={!novaCategoria.trim() || salvando}
              className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {salvando ? '...' : '+ Adicionar'}
            </button>
          </form>

          {/* Lista */}
          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {categorias.length === 0 ? (
                <p className="p-6 text-slate-400 text-center">Nenhuma categoria cadastrada.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {categorias.map(cat => (
                    <div key={cat.id} className="p-4 flex items-center justify-between">
                      <p className="font-semibold text-slate-900">{cat.nome}</p>
                      <button
                        onClick={() => handleDeletar(cat.id, cat.nome)}
                        className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        Deletar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}