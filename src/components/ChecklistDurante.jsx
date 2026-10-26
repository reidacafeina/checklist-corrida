import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function ChecklistDurante({ carroId, etapaAtiva, itensDurante }) {
  const { user } = useAuth()
  const [momentos, setMomentos] = useState([])
  const [momentoSelecionado, setMomentoSelecionado] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [finalizado, setFinalizado] = useState(false)
  const [carroIncapacitado, setCarroIncapacitado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  
  // Modal de Incapacitado
  const [modalIncapacitado, setModalIncapacitado] = useState(false)
  const [motivoIncapacitado, setMotivoIncapacitado] = useState('')
  const [salvandoIncapacitado, setSalvandoIncapacitado] = useState(false)

  useEffect(() => {
    if (etapaAtiva) {
      carregarMomentosEStatus()
    }
  }, [etapaAtiva])

  useEffect(() => {
    if (momentoSelecionado) {
      carregarDadosMomento()
    }
  }, [momentoSelecionado])

  async function carregarMomentosEStatus() {
    setCarregando(true)
    
    // 1) Busca momentos
    const { data: mData } = await supabase
      .from('etapa_momentos')
      .select('*')
      .eq('etapa_id', etapaAtiva.id)
      .eq('anulado', false)
      .order('ordem', { ascending: true })
    
    setMomentos(mData || [])
    
    // Se ainda não tem momento selecionado, pega o primeiro
    if (!momentoSelecionado && mData && mData.length > 0) {
      setMomentoSelecionado(mData[0])
    }

    // 2) Verifica se o carro está incapacitado nesta etapa
    const { data: statusData } = await supabase
      .from('carro_etapa_status')
      .select('*')
      .eq('carro_id', carroId)
      .eq('etapa_id', etapaAtiva.id)
      .maybeSingle()

    if (statusData?.incapacitado) {
      setCarroIncapacitado(true)
    }
    
    setCarregando(false)
  }

  async function carregarDadosMomento() {
    // 1) Verifica se o momento já foi finalizado
    const { data: momentoStatus } = await supabase
      .from('carro_momento_status')
      .select('*')
      .eq('carro_id', carroId)
      .eq('momento_id', momentoSelecionado.id)
      .maybeSingle()

    setFinalizado(momentoStatus?.finalizado || false)

    // 2) Carrega as marcações
    const { data: respostas } = await supabase
      .from('checklist_durante_respostas')
      .select('item_id, marcado')
      .eq('carro_id', carroId)
      .eq('momento_id', momentoSelecionado.id)

    const mapa = {}
    respostas?.forEach(r => {
      mapa[r.item_id] = r.marcado
    })
    setChecklist(mapa)
  }

  async function handleMudarMomento(novoMomento) {
    if (novoMomento.id === momentoSelecionado?.id) return

    // Se o momento atual está finalizado, pode trocar de boa.
    // Se não está finalizado, mas o cara já marcou alguma coisa, avisa.
    const temItensMarcados = Object.values(checklist).some(v => v === true)
    
    if (!finalizado && temItensMarcados) {
      alert('Você tem itens marcados neste momento que não foram finalizados.\n\nFinalize o checklist ou desmarque tudo antes de trocar de momento.')
      return
    }

    setMomentoSelecionado(novoMomento)
  }

  async function toggleItem(itemId) {
    if (finalizado || carroIncapacitado) return // Bloqueia se já finalizou ou está incapacitado

    const novoValor = !checklist[itemId]
    setChecklist(prev => ({ ...prev, [itemId]: novoValor }))

    // Salva na hora no banco (upsert manual)
    const dados = {
      carro_id: carroId,
      etapa_id: etapaAtiva.id,
      momento_id: momentoSelecionado.id,
      item_id: itemId,
      usuario_id: user.id,
      marcado: novoValor
    }

    const { data: existe } = await supabase
      .from('checklist_durante_respostas')
      .select('id')
      .eq('carro_id', carroId)
      .eq('momento_id', momentoSelecionado.id)
      .eq('item_id', itemId)
      .maybeSingle()

    if (existe) {
      await supabase.from('checklist_durante_respostas').update(dados).eq('id', existe.id)
    } else {
      await supabase.from('checklist_durante_respostas').insert(dados)
    }
  }

  async function handleFinalizar() {
    if (!confirm('Confirmar que o checklist deste momento está finalizado?')) return

    const { error } = await supabase
      .from('carro_momento_status')
      .upsert({
        carro_id: carroId,
        momento_id: momentoSelecionado.id,
        finalizado: true
      }, { onConflict: 'carro_id, momento_id' })

    if (error) {
      alert('Erro ao finalizar: ' + error.message)
      return
    }

    setFinalizado(true)
  }

  async function handleDesfazerFinalizacao() {
    if (!confirm('Desfazer a finalização? O checklist voltará a ficar editável.')) return
    
    await supabase
      .from('carro_momento_status')
      .update({ finalizado: false })
      .eq('carro_id', carroId)
      .eq('momento_id', momentoSelecionado.id)
    
    setFinalizado(false)
  }

  async function handleIncapacitar() {
    setSalvandoIncapacitado(true)
    const { error } = await supabase
      .from('carro_etapa_status')
      .upsert({
        carro_id: carroId,
        etapa_id: etapaAtiva.id,
        incapacitado: true,
        motivo_incapacitado: motivoIncapacitado.trim() || null
      }, { onConflict: 'carro_id, etapa_id' })

    if (error) {
      alert('Erro ao incapacitar: ' + error.message)
    } else {
      setCarroIncapacitado(true)
      setModalIncapacitado(false)
    }
    setSalvandoIncapacitado(false)
  }

  if (!etapaAtiva) {
    return (
      <div className="p-6 text-center text-slate-500">
        Não há etapa ativa.
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="p-6 text-center text-slate-500">
        Carregando momentos...
      </div>
    )
  }

  if (carroIncapacitado) {
    return (
      <div className="p-6 text-center bg-red-50 text-red-600 rounded-lg border border-red-200">
        <p className="text-lg font-bold mb-1">🚫 Carro Incapacitado</p>
        <p className="text-sm">Este carro foi marcado como incapacitado nesta etapa e não pode fazer o checklist durante a corrida.</p>
      </div>
    )
  }

  if (momentos.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        Nenhum momento cadastrado para esta etapa.
      </div>
    )
  }

  // Verifica se tem itens marcados (pra travar o select se necessário)
  const temItensMarcados = Object.values(checklist).some(v => v === true)

  return (
    <div>
      {/* Seletor de Momento */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Momento atual</label>
        <select
          value={momentoSelecionado?.id || ''}
          onChange={(e) => {
            const m = momentos.find(x => x.id === e.target.value)
            if (m) handleMudarMomento(m)
          }}
          disabled={!finalizado && temItensMarcados}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
        >
          {momentos.map(m => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </select>
        
        {finalizado && (
          <div className="mt-2">
            <p className="text-xs text-emerald-600 font-semibold mb-1">
              ✅ Checklist deste momento finalizado.
            </p>
            <button 
              onClick={handleDesfazerFinalizacao}
              className="text-xs text-slate-500 underline hover:text-slate-800"
            >
              Desfazer finalização
            </button>
          </div>
        )}
      </div>

      {/* Lista de Itens */}
      <div className="space-y-2 mb-6">
        {itensDurante.map(({ item_id, checklist_itens }) => {
          const marcado = checklist[item_id] || false
          return (
            <button
              key={item_id}
              onClick={() => toggleItem(item_id)}
              disabled={finalizado}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                marcado 
                  ? 'bg-emerald-50 border-emerald-500' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              } ${finalizado ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`font-semibold text-left ${marcado ? 'text-emerald-900' : 'text-slate-700'}`}>
                {checklist_itens.nome}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ml-4 ${
                marcado 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : 'border-slate-300 text-transparent'
              }`}>
                ✓
              </div>
            </button>
          )
        })}
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col gap-3">
        {!finalizado && (
          <button
            onClick={handleFinalizar}
            className="w-full bg-[#0066B1] hover:bg-[#005090] text-white font-bold py-4 rounded-xl transition-colors"
          >
            Finalizar Checklist ({momentoSelecionado?.nome})
          </button>
        )}
        
        <button
          onClick={() => setModalIncapacitado(true)}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl border border-red-200 transition-colors"
        >
          🚫 Marcar Carro como Incapacitado
        </button>
      </div>

      {/* Modal Incapacitado */}
      {modalIncapacitado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-red-600 mb-2">Incapacitar Carro?</h3>
            <p className="text-sm text-slate-600 mb-4">
              O carro não poderá fazer mais nenhum checklist durante esta etapa. Essa ação é definitiva.
            </p>
            <textarea
              value={motivoIncapacitado}
              onChange={e => setMotivoIncapacitado(e.target.value)}
              placeholder="Motivo (opcional): ex. Motor fundido no treino"
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setModalIncapacitado(false)} disabled={salvandoIncapacitado} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg">Cancelar</button>
              <button onClick={handleIncapacitar} disabled={salvandoIncapacitado} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {salvandoIncapacitado ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}