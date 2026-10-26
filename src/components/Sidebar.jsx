import { useAuth } from '../contexts/AuthContext'

export default function Sidebar({ aberta, onFechar, onNavegar }) {
  const { user, logout } = useAuth()

  function navegar(tela) {
    if (onNavegar) onNavegar(tela)
    if (onFechar) onFechar()
  }

  return (
    <>
      {aberta && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onFechar}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-black text-white flex flex-col min-h-screen
          transform transition-transform duration-300
          ${aberta ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Topo */}
        <div className="p-6 border-b border-neutral-800 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Checklist de Corrida</h2>
            <p className="text-xs text-neutral-400 mt-1">
              {user.apelido || user.nome}
            </p>
            <p className="text-xs text-neutral-500">
              {user.funcao_descricao}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="md:hidden text-neutral-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => navegar('home')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
          >
            🏠 Início
          </button>

          <button
            onClick={() => navegar('cadastrar_carro')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
          >
            🚗 Cadastrar Carro
          </button>

          <button
            onClick={() => navegar('cadastrar_checklist')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
          >
           📋 Cadastrar Checklist
            </button>

<button
  onClick={() => navegar('minhas_anotacoes')}
  className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
>
  📝 Minhas Anotações
</button>

          {user.is_admin && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider px-4">
                  Admin
                </p>
              </div>
              
              <button
                onClick={() => navegar('gerenciar_etapas')}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
              >
                🏁 Gerenciar Etapas
              </button>

<button
  onClick={() => navegar('gerenciar_categorias')}
  className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
>
  🏷️ Categorias
</button>

        <button
         onClick={() => navegar('gerenciar_usuarios')}
        className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-900 transition-colors text-sm text-white"
        >
         👥 Usuários
      </button>
            </>
          )}
        </nav>

        {/* Sair */}
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-950 transition-colors text-sm text-red-400"
          >
            🚪 Sair
          </button>
        </div>
      </aside>
    </>
  )
}