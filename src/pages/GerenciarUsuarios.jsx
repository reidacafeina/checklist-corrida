import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

export default function GerenciarUsuarios({ onVoltar, onNavegar }) {
  const { user } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Modal Cadastro
  const [modalAberto, setModalAberto] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [funcao, setFuncao] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    setCarregando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, usuario, nome, apelido, funcao_descricao, is_admin, criado_em')
      .order('nome', { ascending: true })
    
    setUsuarios(data || [])
    setCarregando(false)
  }

  function abrirModal() {
    setUsuario('')
    setSenha('')
    setNome('')
    setApelido('')
    setFuncao('')
    setIsAdmin(false)
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!usuario.trim() || !senha.trim() || !nome.trim()) {
      alert('Usuário, senha e nome são obrigatórios.')
      return
    }

    setSalvando(true)

    try {
      // Chama a função do banco que criamos no passo 1
      const { error } = await supabase.rpc('criar_usuario', {
        p_usuario: usuario.trim().toLowerCase(),
        p_senha: senha,
        p_nome: nome.trim(),
        p_apelido: apelido.trim() || null,
        p_funcao: funcao.trim() || null,
        p_is_admin: isAdmin
      })

      if (error) throw new Error(error.message)

      setModalAberto(false)
      carregarUsuarios()
    } catch (err) {
      alert('Erro ao cadastrar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(userId) {
    if (userId === user.id) {
      alert('Você não pode deletar a si mesmo.')
      return
    }

    if (!confirm('Tem certeza que quer deletar este usuário? Ele não conseguirá mais logar.')) return

    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', userId)

    if (error) {
      alert('Erro ao deletar: ' + error.message)
      return
    }
    carregarUsuarios()
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
          <span className="font-semibold">Usuários</span>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={onVoltar} className="text-slate-500 hover:text-slate-900 text-2xl">←</button>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Usuários</h1>
            </div>
            <button
              onClick={abrirModal}
              className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              + Novo Usuário
            </button>
          </div>

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {usuarios.length === 0 ? (
                <p className="p-6 text-slate-400 text-center">Nenhum usuário cadastrado.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {usuarios.map(u => (
                    <div key={u.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">
                            {u.apelido || u.nome}
                          </p>
                          {u.is_admin && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                          {u.id === user.id && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          @{u.usuario} · {u.nome}
                        </p>
                        {u.funcao_descricao && (
                          <p className="text-xs text-slate-400 mt-0.5">{u.funcao_descricao}</p>
                        )}
                      </div>
                      
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeletar(u.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL NOVO USUÁRIO */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Novo Usuário</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Usuário (login) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  placeholder="ex: joaosilva"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
                <p className="text-xs text-slate-400 mt-1">Sem espaços, sem acentos. Só o que ele vai digitar pra logar.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Senha inicial <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="ex: mudar123"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
                <p className="text-xs text-slate-400 mt-1">Você pode avisar a senha pro usuário por WhatsApp.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="ex: João Silva"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Apelido <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={apelido}
                  onChange={e => setApelido(e.target.value)}
                  placeholder="ex: Joca"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Função na equipe <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={funcao}
                  onChange={e => setFuncao(e.target.value)}
                  placeholder="ex: Mecânico Chefe, Piloto, Publicidade"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={e => setIsAdmin(e.target.checked)}
                  className="w-5 h-5 accent-[#0066B1]"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Administrador</p>
                  <p className="text-xs text-slate-500">Pode gerenciar etapas, usuários e categorias</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalAberto(false)} disabled={salvando} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50">Cancelar</button>
              <button 
                onClick={handleSalvar} 
                disabled={salvando || !usuario.trim() || !senha.trim() || !nome.trim()} 
                className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {salvando ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}