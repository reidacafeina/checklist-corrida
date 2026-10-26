import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

export default function GerenciarEtapas({onVoltar, onNavegar }) {
  const { user } = useAuth()
  const [etapaAtiva, setEtapaAtiva] = useState(null)
  const [momentos, setMomentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  
  // Controle de clique duplo
  const [salvando, setSalvando] = useState(false)

  // Estados dos modais
  const [modalAtualizar, setModalAtualizar] = useState(false)
  const [modalIniciar, setModalIniciar] = useState(false)
  const [modalFinalizar, setModalFinalizar] = useState(false)
  const [modalAdicionarMomento, setModalAdicionarMomento] = useState(false)

  // Campos dos modais
  const [nomeNovaEtapa, setNomeNovaEtapa] = useState('')
  const [campeonatoNovaEtapa, setCampeonatoNovaEtapa] = useState('')
  const [nomeNovoMomento, setNomeNovoMomento] = useState('')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const { data: etapa } = await supabase
      .from('etapas')
      .select('*')
      .eq('ativa', true)
      .maybeSingle()

    setEtapaAtiva(etapa)

    if (etapa) {
      const { data: momentosData } = await supabase
        .from('etapa_momentos')
        .select('*')
        .eq('etapa_id', etapa.id)
        .order('ordem', { ascending: true })

      setMomentos(momentosData || [])
    } else {
      setMomentos([])
    }

    setCarregando(false)
  }

  async function handleIniciarEtapa() {
    if (!etapaAtiva) return

    const { error } = await supabase
      .from('etapas')
      .update({ status: 'em_andamento' })
      .eq('id', etapaAtiva.id)

    if (error) {
      alert('Erro ao iniciar etapa: ' + error.message)
      return
    }

    setModalIniciar(false)
    carregarDados()
  }

  async function handleFinalizarEtapa() {
    if (!etapaAtiva) return

    const { error } = await supabase
      .from('etapas')
      .update({ 
        status: 'finalizada',
        finalizada_em: new Date().toISOString()
      })
      .eq('id', etapaAtiva.id)

    if (error) {
      alert('Erro ao finalizar etapa: ' + error.message)
      return
    }

    setModalFinalizar(false)
    carregarDados()
  }

  async function handleAtualizarEtapa() {
    if (salvando) return // Evita clique duplo

    if (!nomeNovaEtapa.trim()) {
      alert('Digite o nome da nova etapa.')
      return
    }

    setSalvando(true)

    try {
      // 1) Desativa TODAS as etapas ativas (proteção contra duplicatas)
      const { error: erroDesativar } = await supabase
        .from('etapas')
        .update({ 
          ativa: false, 
          status: 'finalizada', 
          finalizada_em: new Date().toISOString() 
        })
        .eq('ativa', true)

      if (erroDesativar) throw new Error('Erro ao finalizar etapa anterior: ' + erroDesativar.message)

      // 2) Cria a nova etapa ativa
      const { data: novaEtapa, error: erroCriar } = await supabase
        .from('etapas')
        .insert({
          nome: nomeNovaEtapa.trim(),
          campeonato: campeonatoNovaEtapa.trim() || null,
          ativa: true,
          status: 'configurando'
        })
        .select()
        .single()

      if (erroCriar || !novaEtapa) throw new Error('Erro ao criar etapa: ' + (erroCriar?.message || 'Desconhecido'))

      // 3) Cria os momentos padrão
      const { error: erroMomentos } = await supabase.from('etapa_momentos').insert([
        { etapa_id: novaEtapa.id, nome: 'Treino', ordem: 1 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 1', ordem: 2 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 2', ordem: 3 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 3', ordem: 4 },
      ])

      if (erroMomentos) {
        console.error('Erro nos momentos:', erroMomentos)
        alert('Etapa criada, mas os momentos falharam: ' + erroMomentos.message)
      }

      setModalAtualizar(false)
      setNomeNovaEtapa('')
      setCampeonatoNovaEtapa('')
      await carregarDados()

    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleAdicionarMomento() {
    if (!nomeNovoMomento.trim() || !etapaAtiva) return

    const proximaOrdem = momentos.length > 0 
      ? Math.max(...momentos.map(m => m.ordem)) + 1 
      : 1

    const { error } = await supabase
      .from('etapa_momentos')
      .insert({
        etapa_id: etapaAtiva.id,
        nome: nomeNovoMomento.trim(),
        ordem: proximaOrdem
      })

    if (error) {
      alert('Erro ao adicionar momento: ' + error.message)
      return
    }

    setModalAdicionarMomento(false)
    setNomeNovoMomento('')
    carregarDados()
  }

  async function handleRemoverMomento(momentoId) {
    if (!confirm('Tem certeza que quer remover este momento?')) return

    const { error } = await supabase
      .from('etapa_momentos')
      .delete()
      .eq('id', momentoId)

    if (error) {
      alert('Erro ao remover momento: ' + error.message)
      return
    }

    carregarDados()
  }

  // Modal para criar primeira etapa (quando não tem ativa)
  async function handleCriarPrimeiraEtapa() {
    if (salvando) return
    if (!nomeNovaEtapa.trim()) {
      alert('Digite o nome da etapa.')
      return
    }

    setSalvando(true)
    try {
      const { data: novaEtapa, error } = await supabase
        .from('etapas')
        .insert({
          nome: nomeNovaEtapa.trim(),
          campeonato: campeonatoNovaEtapa.trim() || null,
          ativa: true,
          status: 'configurando'
        })
        .select()
        .single()

      if (error || !novaEtapa) throw new Error(error?.message || 'Erro ao criar')

      await supabase.from('etapa_momentos').insert([
        { etapa_id: novaEtapa.id, nome: 'Treino', ordem: 1 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 1', ordem: 2 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 2', ordem: 3 },
        { etapa_id: novaEtapa.id, nome: 'Bateria 3', ordem: 4 },
      ])

      setModalAtualizar(false)
      setNomeNovaEtapa('')
      setCampeonatoNovaEtapa('')
      await carregarDados()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
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
          <span className="font-semibold">Gerenciar Etapas</span>
        </div>

        <div className="p-4 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
            Gerenciar Etapas
          </h1>

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : !etapaAtiva ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <p className="text-slate-500 mb-4">Nenhuma etapa ativa.</p>
              <button 
                onClick={() => setModalAtualizar(true)}
                className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-6 py-3 rounded-lg"
              >
                Criar Etapa Inicial
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Etapa Ativa
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {etapaAtiva.nome}
                    </h2>
                    {etapaAtiva.campeonato && (
                      <p className="text-sm text-slate-500">
                        Campeonato {etapaAtiva.campeonato}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={etapaAtiva.status} />
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  {etapaAtiva.status === 'configurando' && (
                    <button 
                      onClick={() => setModalIniciar(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg"
                    >
                      🟢 Iniciar Etapa
                    </button>
                  )}

                  {etapaAtiva.status === 'em_andamento' && (
                    <button 
                      onClick={() => setModalFinalizar(true)}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg"
                    >
                      🔴 Finalizar Etapa
                    </button>
                  )}

                  <button 
                    onClick={() => setModalAtualizar(true)}
                    className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-6 py-3 rounded-lg"
                  >
                    🏁 Atualizar Etapa
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Momentos</h3>
                  <button 
                    onClick={() => setModalAdicionarMomento(true)}
                    className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg"
                  >
                    + Adicionar Momento
                  </button>
                </div>

                <div className="space-y-2">
                  {momentos.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nenhum momento cadastrado.</p>
                  ) : (
                    momentos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-700 font-medium">{m.ordem}. {m.nome}</span>
                        <button 
                          onClick={() => handleRemoverMomento(m.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: INICIAR ETAPA */}
      {modalIniciar && (
        <Modal onClose={() => setModalIniciar(false)}>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Iniciar Etapa?</h3>
          <p className="text-slate-600 mb-6">
            A etapa <strong>{etapaAtiva?.nome}</strong> vai ser iniciada. Os checklists "Durante a Corrida" ficarão disponíveis.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModalIniciar(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button onClick={handleIniciarEtapa} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-semibold">
              Iniciar
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: FINALIZAR ETAPA */}
      {modalFinalizar && (
        <Modal onClose={() => setModalFinalizar(false)}>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Finalizar Etapa?</h3>
          <p className="text-slate-600 mb-6">
            A etapa <strong>{etapaAtiva?.nome}</strong> vai ser finalizada e todos os checklists serão travados. Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setModalFinalizar(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button onClick={handleFinalizarEtapa} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold">
              Finalizar
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: ATUALIZAR ETAPA (OU CRIAR PRIMEIRA) */}
      {modalAtualizar && (
        <Modal onClose={() => !salvando && setModalAtualizar(false)}>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {etapaAtiva ? 'Atualizar Etapa' : 'Criar Etapa Inicial'}
          </h3>
          <p className="text-slate-600 mb-4">
            {etapaAtiva 
              ? 'A etapa atual vai ser finalizada. Preencha os dados da nova etapa:'
              : 'Preencha os dados da primeira etapa:'
            }
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome da etapa</label>
              <input
                type="text"
                value={nomeNovaEtapa}
                onChange={(e) => setNomeNovaEtapa(e.target.value)}
                placeholder="Ex: Etapa 9 - Limeira"
                disabled={salvando}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Campeonato (opcional)</label>
              <input
                type="text"
                value={campeonatoNovaEtapa}
                onChange={(e) => setCampeonatoNovaEtapa(e.target.value)}
                placeholder="Ex: 2026"
                disabled={salvando}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button 
              onClick={() => setModalAtualizar(false)} 
              disabled={salvando}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              onClick={etapaAtiva ? handleAtualizarEtapa : handleCriarPrimeiraEtapa}
              disabled={salvando}
              className="bg-[#0066B1] hover:bg-[#005090] text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {salvando ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: ADICIONAR MOMENTO */}
      {modalAdicionarMomento && (
        <Modal onClose={() => setModalAdicionarMomento(false)}>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Adicionar Momento</h3>
          <p className="text-slate-600 mb-4">
            Crie um novo momento para esta etapa (ex: "Treino 2", "Bateria 4").
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nome do momento</label>
            <input
              type="text"
              value={nomeNovoMomento}
              onChange={(e) => setNomeNovoMomento(e.target.value)}
              placeholder="Ex: Bateria 4"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setModalAdicionarMomento(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button onClick={handleAdicionarMomento} className="bg-[#0066B1] hover:bg-[#005090] text-white px-6 py-2 rounded-lg font-semibold">
              Adicionar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const cores = {
    configurando: 'bg-yellow-100 text-yellow-800',
    em_andamento: 'bg-emerald-100 text-emerald-800',
    finalizada: 'bg-slate-200 text-slate-600',
  }

  const nomes = {
    configurando: 'Configurando',
    em_andamento: 'Em Andamento',
    finalizada: 'Finalizada',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${cores[status] || cores.configurando}`}>
      {nomes[status] || 'Desconhecido'}
    </span>
  )
}

function Modal({ children, onClose }) {
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}