import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import GerenciarEtapas from './pages/GerenciarEtapas'
import CadastrarCarro from './pages/CadastrarCarro'
import CadastrarChecklist from './pages/CadastrarChecklist'
import PerfilCarro from './pages/PerfilCarro'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import GerenciarCategorias from './pages/GerenciarCategorias'
import MinhasAnotacoes from './pages/MinhasAnotacoes'

function App() {
  const { user, loading } = useAuth()
  const [tela, setTela] = useState('home')
  const [parametros, setParametros] = useState({})
  const [carroEditando, setCarroEditando] = useState(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  function navegar(telaDestino, params = {}) {
    setTela(telaDestino)
    setParametros(params)
  }

  function irParaHome() {
    setTela('home')
    setParametros({})
    setCarroEditando(null)
  }

  if (tela === 'gerenciar_etapas') {
    return <GerenciarEtapas onVoltar={irParaHome} onNavegar={navegar} />
  }

  if (tela === 'cadastrar_carro') {
    return (
      <CadastrarCarro 
        onVoltar={irParaHome}
        carroEditando={carroEditando}
        onNavegar={navegar}
      />
    )
  }

  if (tela === 'cadastrar_checklist') {
    return <CadastrarChecklist onVoltar={irParaHome} onNavegar={navegar} />
  }

  if (tela === 'gerenciar_usuarios') {
    return <GerenciarUsuarios onVoltar={irParaHome} onNavegar={navegar} />
  }

  if (tela === 'gerenciar_categorias') {
    return <GerenciarCategorias onVoltar={irParaHome} onNavegar={navegar} />
  }

  if (tela === 'minhas_anotacoes') {
    return <MinhasAnotacoes onVoltar={irParaHome} onNavegar={navegar} />
  }

  if (tela === 'perfil_carro') {
    return (
      <PerfilCarro 
        carroId={parametros.carroId}
        onVoltar={irParaHome}
        onNavegar={navegar}
        onEditarCarro={(carro) => {
          setCarroEditando(carro)
          navegar('cadastrar_carro')
        }}
      />
    )
  }

  return <Home onNavegar={navegar} />
}

export default App