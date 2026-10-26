import { comprimirImagem } from '../lib/comprimirImagem'
import { db } from '../lib/db'
import Requerimentos from '../components/Requerimentos'
import ChecklistDurante from '../components/ChecklistDurante'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

export default function PerfilCarro({ carroId, onVoltar, onEditarCarro, onNavegar }) {
  const { user } = useAuth()
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [carro, setCarro] = useState(null)
  const [categoria, setCategoria] = useState(null)
  const [etapaAtiva, setEtapaAtiva] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Checklist
  const [itensDoCarro, setItensDoCarro] = useState([])
  const [respostas, setRespostas] = useState({})
  const [catalogoCompleto, setCatalogoCompleto] = useState([])
  
  // Modal Configurar
  const [modalConfigurar, setModalConfigurar] = useState(false)
  const [itensSelecionados, setItensSelecionados] = useState([])
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  // Modal Resposta
  const [modalResposta, setModalResposta] = useState(null)
  const [respostaStatus, setRespostaStatus] = useState('ok')
  const [respostaDescricao, setRespostaDescricao] = useState('')
  const [respostaFoto, setRespostaFoto] = useState(null)
  const [respostaFotoPreview, setRespostaFotoPreview] = useState('')
  const [salvandoResposta, setSalvandoResposta] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [carroId])

   async function carregarDados() {
    setCarregando(true)

    // Busca as coisas base (carro, categoria, etapa, itens do carro, catálogo)
    // independente de estar online ou não, pois o Dexie não guarda essas infos ainda.
    // O foco do offline agora são as RESPOSTAS do checklist.

    const { data: carroData } = await supabase.from('carros').select('*').eq('id', carroId).single()
    setCarro(carroData)

    if (carroData?.categoria_id) {
      const { data: catData } = await supabase.from('categorias').select('*').eq('id', carroData.categoria_id).single()
      setCategoria(catData)
    }

    const { data: etapa } = await supabase.from('etapas').select('*').eq('ativa', true).maybeSingle()
    setEtapaAtiva(etapa)

    const { data: itensCarro } = await supabase
      .from('carro_checklist_itens')
      .select('item_id, ordem, checklist_itens(*)')
      .eq('carro_id', carroId)
      .order('ordem', { ascending: true })
    setItensDoCarro(itensCarro || [])
    setItensSelecionados((itensCarro || []).map(i => i.item_id))

    // === PARTE OFFLINE: Busca respostas do Dexie ou Supabase ===
    if (etapa) {
      if (navigator.onLine) {
        // Se tá online, busca do Supabase e atualiza o Dexie
        const { data: respostasData } = await supabase
          .from('checklist_respostas')
          .select('*')
          .eq('carro_id', carroId)
          .eq('etapa_id', etapa.id)
        
        const respostasMap = {}
        respostasData?.forEach(r => { respostasMap[r.item_id] = r })
        
        // Limpa o Dexie e salva as versões novas
        await db.checklist_respostas.where({ carro_id: carroId, etapa_id: etapa.id }).delete()
        for (const r of respostasData || []) {
          await db.checklist_respostas.put(r)
        }
        
        setRespostas(respostasMap)
      } else {
        // Se tá offline, busca do Dexie
        const respostasLocal = await db.checklist_respostas.where({ carro_id: carroId, etapa_id: etapa.id }).toArray()
        const respostasMap = {}
        respostasLocal.forEach(r => { respostasMap[r.item_id] = r })
        setRespostas(respostasMap)
      }
    }

    const { data: catalogo } = await supabase
      .from('checklist_itens')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })
    setCatalogoCompleto(catalogo || [])

    setCarregando(false)
  }

  async function handleSalvarConfiguracao() {
    setSalvandoConfig(true)
    try {
      await supabase.from('carro_checklist_itens').delete().eq('carro_id', carroId)
      if (itensSelecionados.length > 0) {
        const novosItens = itensSelecionados.map((itemId, index) => ({
          carro_id: carroId, item_id: itemId, ordem: index + 1,
        }))
        const { error } = await supabase.from('carro_checklist_itens').insert(novosItens)
        if (error) throw new Error(error.message)
      }
      setModalConfigurar(false)
      carregarDados()
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvandoConfig(false)
    }
  }

  function toggleItem(itemId) {
    setItensSelecionados(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  function abrirResposta(item, statusInicial) {
    const respostaExistente = respostas[item.id]
    setModalResposta({ item })
    setRespostaStatus(respostaExistente?.status || statusInicial)
    setRespostaDescricao(respostaExistente?.descricao || '')
    setRespostaFoto(null)
    setRespostaFotoPreview(respostaExistente?.foto_url || '')
  }

   async function handleFotoResposta(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem.')
      return
    }

    // Mostra preview rápido enquanto comprime
    setRespostaFotoPreview(URL.createObjectURL(file))

    // Comprime a imagem (crucial pra não travar no celular)
    const fileComprimido = await comprimirImagem(file)
    setRespostaFoto(fileComprimido)
    
    // Atualiza o preview com a versão comprimida
    setRespostaFotoPreview(URL.createObjectURL(fileComprimido))
  }

  async function handleSalvarResposta() {
    if (!etapaAtiva) {
      alert('Não há etapa ativa.')
      return
    }

    // Validação: Foto obrigatória APENAS se estiver online
    if (!respostaFoto && !respostaFotoPreview && navigator.onLine) {
      alert('A foto é obrigatória.')
      return
    }

    if (respostaStatus === 'pendente' && !respostaDescricao.trim()) {
      alert('A descrição é obrigatória quando o item está pendente.')
      return
    }

    setSalvandoResposta(true)

    try {
      let fotoUrl = respostaFotoPreview
      const respostaExistente = respostas[modalResposta.item.id]
      const idResposta = respostaExistente?.id || crypto.randomUUID()

      // Só tenta subir foto se tiver internet
      if (respostaFoto && navigator.onLine) {
        const extensao = respostaFoto.name.split('.').pop()
        const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`
        const { error: errUpload } = await supabase.storage.from('checklist-fotos').upload(nomeArquivo, respostaFoto)
        if (errUpload) throw new Error('Erro ao subir foto: ' + errUpload.message)
        const { data } = supabase.storage.from('checklist-fotos').getPublicUrl(nomeArquivo)
        fotoUrl = data.publicUrl
      }

      const dadosResposta = {
        id: idResposta,
        carro_id: carroId,
        etapa_id: etapaAtiva.id,
        item_id: modalResposta.item.id,
        usuario_id: user.id,
        status: respostaStatus,
        descricao: respostaDescricao.trim() || null,
        foto_url: fotoUrl || null,
        respondido_em: new Date().toISOString()
      }

      if (navigator.onLine) {
        // ===== MODO ONLINE =====
        if (respostaExistente) {
          const { error } = await supabase.from('checklist_respostas').update(dadosResposta).eq('id', respostaExistente.id)
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase.from('checklist_respostas').insert(dadosResposta)
          if (error) throw new Error(error.message)
        }
        
        // Salva no Dexie também (pro modo offline ter o dado atualizado)
        await db.checklist_respostas.put(dadosResposta)
        
      } else {
        // ===== MODO OFFLINE =====
        // 1. Salva no banco local
        await db.checklist_respostas.put(dadosResposta)
        
        // 2. Adiciona na fila de sincronização
        await db.fila_sincronizacao.add({
          tabela: 'checklist_respostas',
          dados: dadosResposta,
          criado_em: new Date().toISOString()
        })
        
        alert('✅ Salvo no celular! Vai ser enviado quando a internet voltar.')
      }

      setModalResposta(null)
      carregarDados()
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvandoResposta(false)
    }
  }
  if (carregando) {
    return (
      <div className="flex min-h-screen bg-slate-100 items-center justify-center">
        <div className="text-slate-400">Carregando...</div>
      </div>
    )
  }

  if (!carro) {
    return (
      <div className="flex min-h-screen bg-slate-100 items-center justify-center">
        <div className="text-slate-400">Carro não encontrado.</div>
      </div>
    )
  }

  const itensPre = itensDoCarro.filter(i => i.checklist_itens?.tipo === 'pre' || i.checklist_itens?.tipo === 'ambos')
  const itensDurante = itensDoCarro.filter(i => i.checklist_itens?.tipo === 'durante' || i.checklist_itens?.tipo === 'ambos')

  const prePendentes = itensPre.filter(i => respostas[i.item_id]?.status === 'pendente').length
  const preVerificados = itensPre.filter(i => respostas[i.item_id]).length
  const preTotal = itensPre.length

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />
      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">☰</button>
          <span className="font-semibold truncate">Perfil do Carro</span>
        </div>

        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onVoltar} className="text-slate-500 hover:text-slate-900 text-2xl">←</button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Perfil do Carro</h1>
          </div>

          {/* FOTO + DADOS */}
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
            <div className="md:flex">
              <div className="md:w-1/2 aspect-video bg-slate-200">
                {carro.foto_url ? (
                  <img src={carro.foto_url} alt={`Carro de ${carro.piloto}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem foto</div>
                )}
              </div>
              <div className="md:w-1/2 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">🏎️ {carro.piloto}</h2>
                    <p className="text-sm text-slate-500">🧭 {carro.navegador || 'Sem navegador'}</p>
                  </div>
                  <button onClick={() => onEditarCarro(carro)} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg">
                    Editar
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-slate-700">Placa:</span> <span className="text-slate-600">{carro.placa}</span></p>
                  {categoria && <p><span className="font-medium text-slate-700">Categoria:</span> <span className="text-slate-600">{categoria.nome}</span></p>}
                  {carro.observacoes && <p><span className="font-medium text-slate-700">Obs:</span> <span className="text-slate-600">{carro.observacoes}</span></p>}
                </div>
              </div>
            </div>
          </div>

          {/* CHECKLIST PRÉ-CORRIDA */}
          <div className="bg-white rounded-xl shadow mb-6">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Checklist Pré-Corrida</h3>
                <p className="text-xs text-slate-500">
                  {etapaAtiva ? `Etapa: ${etapaAtiva.nome}` : 'Sem etapa ativa'}
                </p>
                {itensPre.length > 0 && (
                  <p className="text-xs mt-1">
                    <span className="text-slate-500">{preVerificados} de {preTotal} verificados</span>
                    {prePendentes > 0 && (
                      <span className="ml-2 text-red-600 font-semibold">
                        ⚠️ {prePendentes} pendência{prePendentes > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button onClick={() => setModalConfigurar(true)} className="text-sm bg-[#0066B1] hover:bg-[#005090] text-white px-4 py-2 rounded-lg">
                Configurar
              </button>
            </div>

            <div className="p-4 md:p-6">
              {itensPre.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Nenhum item configurado. Clique em "Configurar".</p>
              ) : (
                <div className="space-y-3">
                  {itensPre.map(({ item_id, checklist_itens }) => {
                    const resposta = respostas[item_id]
                    return (
                      <div key={item_id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="mb-3">
                          <p className="font-semibold text-slate-900 text-sm">{checklist_itens.nome}</p>
                          {checklist_itens.descricao && <p className="text-xs text-slate-500 mt-0.5">{checklist_itens.descricao}</p>}
                        </div>

                        {resposta ? (
                          <div className="flex items-start gap-3">
                            {resposta.foto_url && (
                              <img src={resposta.foto_url} alt="Foto" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                            )}
                            <div className="flex-1">
                              {resposta.status === 'ok' ? (
                                <span className="inline-block bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">🟢 OK</span>
                              ) : (
                                <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">🟡 Pendente</span>
                              )}
                              {resposta.descricao && <p className="text-xs text-slate-600 mt-1">{resposta.descricao}</p>}
                            </div>
                            <button onClick={() => abrirResposta(checklist_itens, resposta.status)} className="text-xs text-slate-500 hover:text-slate-900 px-2 py-1">
                              Editar
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => abrirResposta(checklist_itens, 'ok')} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg text-sm">
                              🟢 OK
                            </button>
                            <button onClick={() => abrirResposta(checklist_itens, 'pendente')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-lg text-sm">
                              🟡 Pendente
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

{/* CHECKLIST DURANTE */}
<div className="bg-white rounded-xl shadow">
  <div className="p-4 md:p-6 border-b border-slate-100">
    <h3 className="text-lg font-bold text-slate-900">Checklist Durante a Corrida</h3>
    <p className="text-xs text-slate-500">Marcação rápida de OK (treinos e baterias)</p>
  </div>
  <div className="p-4 md:p-6">
    {itensDurante.length === 0 ? (
      <p className="text-slate-400 text-sm text-center py-6">Nenhum item configurado.</p>
    ) : (
      <ChecklistDurante 
        carroId={carroId} 
        etapaAtiva={etapaAtiva} 
        itensDurante={itensDurante} 
      />
    )}
  </div>
</div>
          {/* REQUERIMENTOS */}
          <div className="bg-white rounded-xl shadow mt-6">
            <div className="p-4 md:p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Requerimentos</h3>
              <p className="text-xs text-slate-500">
                Problemas e ocorrências do carro
              </p>
            </div>
            <div className="p-4 md:p-6">
              <Requerimentos carroId={carroId} etapaAtiva={etapaAtiva} />
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: CONFIGURAR CHECKLIST */}
      {modalConfigurar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvandoConfig && setModalConfigurar(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Configurar Checklist</h3>
            <p className="text-sm text-slate-500 mb-4">Selecione os itens do catálogo que este carro vai usar.</p>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 border-y border-slate-100 py-4">
              {catalogoCompleto.length === 0 ? (
                <p className="text-slate-400 text-sm text-center">Nenhum item no catálogo.</p>
              ) : (
                catalogoCompleto.map(item => (
                  <label key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={itensSelecionados.includes(item.id)} onChange={() => toggleItem(item.id)} className="mt-1 w-5 h-5 accent-[#0066B1]" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{item.nome}</p>
                      {item.descricao && <p className="text-xs text-slate-500">{item.descricao}</p>}
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                        {item.tipo === 'pre' && 'Pré-Corrida'}
                        {item.tipo === 'durante' && 'Durante a Corrida'}
                        {item.tipo === 'ambos' && 'Ambos'}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalConfigurar(false)} disabled={salvandoConfig} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50">Cancelar</button>
              <button onClick={handleSalvarConfiguracao} disabled={salvandoConfig} className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {salvandoConfig ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPONDER ITEM */}
      {modalResposta && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvandoResposta && setModalResposta(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">{modalResposta.item.nome}</h3>
            {modalResposta.item.descricao && <p className="text-sm text-slate-500 mb-4">{modalResposta.item.descricao}</p>}

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Status do item</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRespostaStatus('ok')}
                  className={`py-3 rounded-lg font-bold text-sm transition-colors ${respostaStatus === 'ok' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  🟢 OK
                </button>
                <button
                  type="button"
                  onClick={() => setRespostaStatus('pendente')}
                  className={`py-3 rounded-lg font-bold text-sm transition-colors ${respostaStatus === 'pendente' ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  🟡 Pendente
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Foto <span className="text-red-500">*</span>
              </label>
              {respostaFotoPreview && <img src={respostaFotoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2 bg-slate-100" />}
              <input type="file" accept="image/*" capture="environment" onChange={handleFotoResposta} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0066B1] file:text-white file:font-semibold file:cursor-pointer hover:file:bg-[#005090]" />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrição {respostaStatus === 'pendente' && <span className="text-red-500">*</span>}
                {respostaStatus === 'ok' && <span className="text-slate-400 font-normal"> (opcional)</span>}
              </label>
              <textarea
                value={respostaDescricao}
                onChange={e => setRespostaDescricao(e.target.value)}
                placeholder={respostaStatus === 'pendente' ? "Ex: Cinto com etiquetas cortadas" : "Ex: Verificado, mas desgastado"}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalResposta(null)} disabled={salvandoResposta} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50">Cancelar</button>
              <button 
                onClick={handleSalvarResposta} 
                disabled={salvandoResposta} 
                className={`flex-1 text-white font-semibold py-3 rounded-lg disabled:opacity-50 ${respostaStatus === 'ok' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
              >
                {salvandoResposta ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}