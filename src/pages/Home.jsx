import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/db'
import Sidebar from '../components/Sidebar'
import CarCard from '../components/CarCard'

export default function Home({ onNavegar }) {
  const { user, offlineMode } = useAuth()
  const [carros, setCarros] = useState([])
  const [etapaAtiva, setEtapaAtiva] = useState(null)
  const [requerimentosAbertos, setRequerimentosAbertos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [sidebarAberta, setSidebarAberta] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    if (navigator.onLine) {
      // ========== MODO ONLINE ==========
      const { data: etapa } = await supabase
        .from('etapas')
        .select('*')
        .eq('ativa', true)
        .maybeSingle()
      
      setEtapaAtiva(etapa)
      
      // Salva a etapa no Dexie
      if (etapa) {
        await db.etapa_ativa.clear()
        await db.etapa_ativa.put(etapa)
      }

      const { data: carrosData } = await supabase
        .from('carros')
        .select('*')
        .order('criado_em', { ascending: true })

      // Salva os carros no Dexie
      if (carrosData) {
        await db.carros.clear()
        for (const c of carrosData) {
          await db.carros.put(c)
        }
      }

      let pendenciasPorCarro = {}
      let requerimentosPorCarro = {}

      if (etapa) {
        const { data: pendencias } = await supabase
          .from('checklist_respostas')
          .select('carro_id, item_id, descricao, checklist_itens(nome)')
          .eq('etapa_id', etapa.id)
          .eq('status', 'pendente')

        pendencias?.forEach((p) => {
          if (!pendenciasPorCarro[p.carro_id]) {
            pendenciasPorCarro[p.carro_id] = []
          }
          pendenciasPorCarro[p.carro_id].push({
            nome: p.checklist_itens?.nome || 'Item',
            descricao: p.descricao,
          })
        })
      }

      const { data: requerimentos } = await supabase
        .from('requerimentos')
        .select('carro_id')
        .eq('status', 'aberto')

      requerimentos?.forEach((r) => {
        requerimentosPorCarro[r.carro_id] = true
      })

      const carrosCompletos = (carrosData || []).map((c) => ({
        ...c,
        pendencias: pendenciasPorCarro[c.id] || [],
        temRequerimento: !!requerimentosPorCarro[c.id],
      }))

      carrosCompletos.sort((a, b) => {
        const prioridade = (c) => {
          if (c.pendencias.length > 0) return 1
          if (c.temRequerimento) return 2
          return 3
        }
        return prioridade(a) - prioridade(b)
      })

      setCarros(carrosCompletos)

      const { data: reqAbertos } = await supabase
        .from('requerimentos')
        .select(`
          *,
          carros (piloto, placa)
        `)
        .eq('status', 'aberto')
        .order('criado_em', { ascending: false })

      setRequerimentosAbertos(reqAbertos || [])

    } else {
      // ========== MODO OFFLINE ==========
      console.log('Buscando dados do Dexie...')
      
      const etapa = await db.etapa_ativa.toCollection().first()
      setEtapaAtiva(etapa || null)

      const carrosLocal = await db.carros.toArray()
      
      const carrosCompletos = carrosLocal.map((c) => ({
        ...c,
        pendencias: [],
        temRequerimento: false,
      }))

      setCarros(carrosCompletos)
      setRequerimentosAbertos([])
    }

    setCarregando(false)
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />

      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">
            ☰
          </button>
          <span className="font-semibold">Checklist de Corrida</span>
        </div>

        <div className="p-4 md:p-8">
          
          {offlineMode && (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm font-semibold">
              ⚠️ Você está offline. Suas alterações serão salvas localmente e sincronizadas quando a internet voltar.
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Meus Carros
              </h1>
              {etapaAtiva && (
                <p className="text-sm text-slate-500 mt-1">
                  🏁 {etapaAtiva.nome}
                </p>
              )}
            </div>
            <button
              onClick={() => onNavegar && onNavegar('cadastrar_carro')}
              className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              + Novo Carro
            </button>
          </div>

          {requerimentosAbertos.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-3">
                🚨 Requerimentos Abertos ({requerimentosAbertos.length})
              </h2>
              <div className="space-y-2">
                {requerimentosAbertos.map(req => (
                  <div key={req.id} className="bg-white rounded-lg p-3 flex items-start gap-3">
                    {req.foto_url && (
                      <img src={req.foto_url} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{req.titulo}</p>
                      {req.carros && (
                        <p className="text-xs text-slate-500">
                          🏎️ {req.carros.piloto} · {req.carros.placa}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : carros.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400">
              Nenhum carro cadastrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {carros.map((carro) => (
                <CarCard 
                  key={carro.id} 
                  carro={carro} 
                  onClick={() => onNavegar('perfil_carro', { carroId: carro.id })}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}