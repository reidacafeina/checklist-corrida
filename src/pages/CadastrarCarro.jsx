import { comprimirImagem } from '../lib/comprimirImagem'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function CadastrarCarro({ onVoltar, carroEditando, onNavegar }) {
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Campos do formulário
  const [foto, setFoto] = useState(null) // arquivo
  const [fotoPreview, setFotoPreview] = useState('') // url pra visualizar
  const [categoriaId, setCategoriaId] = useState('')
  const [placa, setPlaca] = useState('')
  const [piloto, setPiloto] = useState('')
  const [navegador, setNavegador] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    carregarCategorias()
    if (carroEditando) {
      preencherFormulario()
    }
  }, [])

  async function carregarCategorias() {
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .order('nome', { ascending: true })

    setCategorias(data || [])
    setCarregando(false)
  }

  function preencherFormulario() {
    setCategoriaId(carroEditando.categoria_id || '')
    setPlaca(carroEditando.placa || '')
    setPiloto(carroEditando.piloto || '')
    setNavegador(carroEditando.navegador || '')
    setObservacoes(carroEditando.observacoes || '')
    setFotoPreview(carroEditando.foto_url || '')
  }

  async function handleFotoChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem.')
      return
    }

    // Mostra preview rápido
    setFotoPreview(URL.createObjectURL(file))

    // Comprime
    const fileComprimido = await comprimirImagem(file)
    setFoto(fileComprimido)
    setFotoPreview(URL.createObjectURL(fileComprimido))
  }
  async function uploadFoto() {
    if (!foto) return fotoPreview // Se não tem foto nova, mantém a antiga

    // Gera nome único pra evitar conflito
    const extensao = foto.name.split('.').pop()
    const nomeArquivo = `${Date.now()}.${extensao}`

    const { error } = await supabase.storage
      .from('checklist-fotos')
      .upload(nomeArquivo, foto)

    if (error) throw new Error('Erro ao subir foto: ' + error.message)

    const { data } = supabase.storage
      .from('checklist-fotos')
      .getPublicUrl(nomeArquivo)

    return data.publicUrl
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (salvando) return

    // Validações
    if (!carroEditando && !foto) {
      alert('A foto é obrigatória.')
      return
    }
    if (!placa.trim()) {
      alert('A placa é obrigatória.')
      return
    }
    if (!piloto.trim()) {
      alert('O piloto é obrigatório.')
      return
    }

    setSalvando(true)

    try {
      // Upload da foto
      const fotoUrl = await uploadFoto()

      const dadosCarro = {
        foto_url: fotoUrl,
        categoria_id: categoriaId || null,
        placa: placa.trim(),
        piloto: piloto.trim(),
        navegador: navegador.trim() || null,
        observacoes: observacoes.trim() || null,
      }

      if (carroEditando) {
        // Editar carro existente
        const { error } = await supabase
          .from('carros')
          .update(dadosCarro)
          .eq('id', carroEditando.id)

        if (error) throw new Error('Erro ao atualizar: ' + error.message)
      } else {
        // Criar carro novo
        const { error } = await supabase
          .from('carros')
          .insert(dadosCarro)

        if (error) throw new Error('Erro ao criar: ' + error.message)
      }

      alert(carroEditando ? 'Carro atualizado!' : 'Carro cadastrado!')
      if (onVoltar) onVoltar()

    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
<Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} onNavegar={onNavegar} />

      <main className="flex-1 min-w-0">
        <div className="md:hidden bg-black text-white p-4 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarAberta(true)} className="text-2xl">☰</button>
          <span className="font-semibold">
            {carroEditando ? 'Editar Carro' : 'Cadastrar Carro'}
          </span>
        </div>

        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={onVoltar}
              className="text-slate-500 hover:text-slate-900 text-2xl"
            >
              ←
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {carroEditando ? 'Editar Carro' : 'Cadastrar Carro'}
            </h1>
          </div>

          {carregando ? (
            <div className="text-slate-400">Carregando...</div>
          ) : (
            <form onSubmit={handleSalvar} className="space-y-5 bg-white rounded-xl shadow p-6">
              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Foto do carro {!carroEditando && <span className="text-red-500">*</span>}
                </label>
                {fotoPreview && (
                  <img
                    src={fotoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg mb-3 bg-slate-100"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFotoChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#0066B1] file:text-white file:font-semibold file:cursor-pointer hover:file:bg-[#005090]"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categoria
                </label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                >
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Placa */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Placa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value)}
                  placeholder="ABC-1234"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              {/* Piloto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Piloto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={piloto}
                  onChange={(e) => setPiloto(e.target.value)}
                  placeholder="Nome do piloto"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              {/* Navegador */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Navegador
                </label>
                <input
                  type="text"
                  value={navegador}
                  onChange={(e) => setNavegador(e.target.value)}
                  placeholder="Nome do navegador"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações gerais sobre o carro"
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066B1] text-slate-900 resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onVoltar}
                  disabled={salvando}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-[#0066B1] hover:bg-[#005090] text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : (carroEditando ? 'Salvar alterações' : 'Cadastrar carro')}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}