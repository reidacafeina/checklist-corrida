import { comprimirImagem } from '../lib/comprimirImagem'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Requerimentos({ carroId, etapaAtiva }) {
  const { user } = useAuth()
  const [requerimentos, setRequerimentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  
  // Modal Novo/Editar
  const [modalAberto, setModalAberto] = useState(false)
  const [reqEditando, setReqEditando] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal Reabrir (Admin)
  const [modalReabrir, setModalReabrir] = useState(null)
  const [motivoReabrir, setMotivoReabrir] = useState('')
  const [salvandoReabrir, setSalvandoReabrir] = useState(false)

  useEffect(() => {
    if (carroId) {
      carregarRequerimentos()
    }
  }, [carroId])

  async function carregarRequerimentos() {
    setCarregando(true)
    
    // 1) Busca SÓ os requerimentos (sem cruzar tabelas)
    const { data: reqs, error } = await supabase
      .from('requerimentos')
      .select('*')
      .eq('carro_id', carroId)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar requerimentos:', error)
      setCarregando(false)
      return
    }

    if (!reqs || reqs.length === 0) {
      setRequerimentos([])
      setCarregando(false)
      return
    }

    // 2) Busca os usuários e etapas separadamente e junta na mão
    const reqsCompletos = await Promise.all(reqs.map(async (req) => {
      let usuario = null
      let etapa = null

      if (req.usuario_id) {
        const { data: u } = await supabase.from('usuarios').select('apelido, nome').eq('id', req.usuario_id).single()
        usuario = u
      }

      if (req.etapa_id) {
        const { data: e } = await supabase.from('etapas').select('nome, campeonato').eq('id', req.etapa_id).single()
        etapa = e
      }

      return {
        ...req,
        usuarios: usuario,
        etapas: etapa
      }
    }))

    setRequerimentos(reqsCompletos)
    setCarregando(false)
  }

  function abrirNovo() {
    setReqEditando(null)
    setTitulo('')
    setDescricao('')
    setFoto(null)
    setFotoPreview('')
    setModalAberto(true)
  }

  function abrirEditar(req) {
    if (req.status === 'finalizado') return
    setReqEditando(req)
    setTitulo(req.titulo)
    setDescricao(req.descricao || '')
    setFoto(null)
    setFotoPreview(req.foto_url || '')
    setModalAberto(true)
  }

  async function handleFotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Selecione uma imagem.')
      return
    }

    setFotoPreview(URL.createObjectURL(file))

    const fileComprimido = await comprimirImagem(file)
    setFoto(fileComprimido)
    setFotoPreview(URL.createObjectURL(fileComprimido))
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      alert('O título é obrigatório.')
      return
    }

    setSalvando(true)
    try {
      let fotoUrl = fotoPreview

      if (foto) {
        const extensao = foto.name.split('.').pop()
        const nomeArquivo = `req-${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`
        const { error: errUp } = await supabase.storage.from('requerimento-fotos').upload(nomeArquivo, foto)
        if (errUp) throw new Error('Erro ao subir foto: ' + errUp.message)
        const { data } = supabase.storage.from('requerimento-fotos').getPublicUrl(nomeArquivo)
        fotoUrl = data.publicUrl
      }

      const dados = {
        carro_id: carroId,
        etapa_id: etapaAtiva?.id || null,
        usuario_id: user.id,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        foto_url: fotoUrl || null,
        status: 'aberto'
      }

      if (reqEditando) {
        const { error } = await supabase.from('requerimentos').update(dados).eq('id', reqEditando.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('requerimentos').insert(dados)
        if (error) throw new Error(error.message)
      }

      setModalAberto(false)
      carregarRequerimentos()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function handleFinalizar(id) {
    if (!confirm('Finalizar este requerimento? Ele sairá da lista de abertos.')) return

    const { error } = await supabase
      .from('requerimentos')
      .update({
        status: 'finalizado',
        finalizado_em: new Date().toISOString(),
        finalizado_por: user.id
      })
      .eq('id', id)

    if (error) {
      alert('Erro ao finalizar: ' + error.message)
      return
    }
    carregarRequerimentos()
  }

  async function handleReabrir() {
    if (!modalReabrir) return
    setSalvandoReabrir(true)

    const { error } = await supabase
      .from('requerimentos')
      .update({
        status: 'aberto',
        finalizado_em: null,
        finalizado_por: null,
        reaberto_em: new Date().toISOString(),
        reaberto_por: user.id,
        motivo_reabertura: motivoReabrir.trim() || null
      })
      .eq('id', modalReabrir.id)

    if (error) {
      alert('Erro ao reabrir: ' + error.message)
    } else {
      setModalReabrir(null)
      setMotivoReabrir('')
      carregarRequerimentos()
    }
    setSalvandoReabrir(false)
  }

  if (carregando) {
    return <div className="p-6 text-center text-slate-400">Carregando...</div>
  }

  const abertos = requerimentos.filter(r => r.status === 'aberto')
  const finalizados = requerimentos.filter(r => r.status === 'finalizado')

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNovo}
          className="bg-[#0066B1] hover:bg-[#005090] text-white font-semibold px-4 py-2 rounded-lg text-sm"
        >
          + Novo Requerimento
        </button>
      </div>

      {requerimentos.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Nenhum requerimento registrado.</p>
      ) : (
        <div className="space-y-6">
          {/* ABERTOS */}
          {abertos.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                Em Aberto ({abertos.length})
              </h4>
              <div className="space-y-3">
                {abertos.map(req => (
                  <RequerimentoCard 
                    key={req.id} 
                    req={req} 
                    onEditar={abrirEditar}
                    onFinalizar={handleFinalizar}
                  />
                ))}
              </div>
            </div>
          )}

          {/* FINALIZADOS */}
          {finalizados.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Finalizados ({finalizados.length})
              </h4>
              <div className="space-y-3">
                {finalizados.map(req => (
                  <RequerimentoCard 
                    key={req.id} 
                    req={req} 
                    finalizado
                    onReabrir={() => setModalReabrir(req)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvando && setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {reqEditando ? 'Editar Requerimento' : 'Novo Requerimento'}
            </h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Pneu careca"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descrição <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes do problema..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                {fotoPreview && (
                  <img src={fotoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2 bg-slate-100" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0066B1] file:text-white file:font-semibold file:cursor-pointer hover:file:bg-[#005090]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalAberto(false)} disabled={salvando} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando || !titulo.trim()} className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REABRIR */}
      {modalReabrir && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !salvandoReabrir && setModalReabrir(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Reabrir Requerimento?</h3>
            <p className="text-sm text-slate-600 mb-4">
              O requerimento "<strong>{modalReabrir.titulo}</strong>" vai voltar pra lista de abertos.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Motivo <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea
                value={motivoReabrir}
                onChange={e => setMotivoReabrir(e.target.value)}
                placeholder="Ex: Problema voltou"
                rows={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalReabrir(null)} disabled={salvandoReabrir} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg">Cancelar</button>
              <button onClick={handleReabrir} disabled={salvandoReabrir} className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50">
                {salvandoReabrir ? 'Salvando...' : 'Reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente do Card com MAIS DETALHES
function RequerimentoCard({ req, finalizado, onEditar, onFinalizar, onReabrir }) {
  return (
    <div className={`rounded-xl border-2 ${finalizado ? 'bg-slate-50 border-slate-200' : 'bg-white border-red-500'} shadow-sm overflow-hidden`}>
      {/* Topo do card */}
      <div className={`p-3 border-b ${finalizado ? 'border-slate-200 bg-slate-100' : 'border-red-100 bg-red-50'} flex justify-between items-center`}>
        <span className={`text-xs font-bold uppercase tracking-wider ${finalizado ? 'text-slate-500' : 'text-red-600'}`}>
          {finalizado ? '✅ Finalizado' : '🚨 Em Aberto'}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">
          {new Date(req.criado_em).toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="p-4 flex flex-col md:flex-row gap-4">
        {/* Foto */}
        {req.foto_url ? (
          <img src={req.foto_url} alt="Foto do problema" className="w-full md:w-32 h-32 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
        ) : (
          <div className="w-full md:w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
            Sem foto
          </div>
        )}

        {/* Detalhes */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{req.titulo}</h3>
          
          {req.descricao && (
            <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{req.descricao}</p>
          )}

          <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500 space-y-1">
            <p>👤 Aberto por: <strong className="text-slate-700">{req.usuarios?.apelido || req.usuarios?.nome || 'Desconhecido'}</strong></p>
            {req.etapas && (
              <p>🏁 Etapa: <strong className="text-slate-700">{req.etapas.nome} {req.etapas.campeonato ? `(${req.etapas.campeonato})` : ''}</strong></p>
            )}
            
            {finalizado && req.finalizado_em && (
              <p className="text-emerald-600 mt-1">
                ✓ Finalizado em: <strong>{new Date(req.finalizado_em).toLocaleString('pt-BR')}</strong>
              </p>
            )}
            {finalizado && req.motivo_reabertura && (
              <p className="text-blue-600 mt-1">
                ↺ Reaberto: <strong>{req.motivo_reabertura}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex md:flex-col gap-2 flex-shrink-0 mt-4 md:mt-0">
          {!finalizado && onFinalizar && (
            <button
              onClick={() => onFinalizar(req.id)}
              className="flex-1 md:flex-none text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg whitespace-nowrap shadow-sm"
            >
              Finalizar
            </button>
          )}
          {!finalizado && onEditar && (
            <button
              onClick={() => onEditar(req)}
              className="flex-1 md:flex-none text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg shadow-sm"
            >
              Editar
            </button>
          )}
          {finalizado && onReabrir && (
            <button
              onClick={onReabrir}
              className="flex-1 md:flex-none text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg shadow-sm"
            >
              Reabrir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}