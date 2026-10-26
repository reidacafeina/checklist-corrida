export default function CarCard({ carro, onClick }) {
  const temPendencia = carro.pendencias.length > 0
  const temRequerimento = carro.temRequerimento

  // Define as cores do card
  let bordaCor = 'border-neutral-800'
  let sombraCor = ''
  let fundoFoto = 'bg-neutral-900'

  if (temPendencia) {
    // Vermelho BMW prevalece
    bordaCor = 'border-[#E10600]'
    sombraCor = 'shadow-[0_0_20px_rgba(225,6,0,0.3)]'
  } else if (temRequerimento) {
    // Roxo/azul BMW
    bordaCor = 'border-[#1C69D4]'
    sombraCor = 'shadow-[0_0_20px_rgba(28,105,212,0.3)]'
  } else {
    // Verde brilhando (tudo ok)
    bordaCor = 'border-emerald-500'
    sombraCor = 'shadow-[0_0_20px_rgba(16,185,129,0.3)]'
  }

  return (
<div
  onClick={onClick}
  className={`bg-black rounded-xl border-2 ${bordaCor} ${sombraCor} overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform`}
>
      {/* Topo: piloto / navegador */}
      <div className="p-4 border-b border-neutral-800">
        <p className="text-white font-semibold text-sm">
          🏎️ {carro.piloto || 'Sem piloto'}
        </p>
        <p className="text-neutral-400 text-xs mt-0.5">
          🧭 {carro.navegador || 'Sem navegador'}
        </p>
      </div>

      {/* Foto do carro */}
      <div className={`${fundoFoto} aspect-video flex items-center justify-center`}>
        {carro.foto_url ? (
          <img
            src={carro.foto_url}
            alt={`Carro de ${carro.piloto}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-neutral-600 text-sm">Sem foto</p>
        )}
      </div>

      {/* Pendências */}
      <div className="p-4">
        {temPendencia ? (
          <div className="space-y-1">
            {carro.pendencias.length <= 3 ? (
              carro.pendencias.map((p, idx) => (
                <p key={idx} className="text-sm text-red-400 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">●</span>
                  <span>
                    <span className="font-semibold">{p.nome}</span>
                    {p.descricao && (
                      <span className="text-red-300/70"> — {p.descricao}</span>
                    )}
                  </span>
                </p>
              ))
            ) : (
              <p className="text-sm text-red-400 font-semibold">
                ● {carro.pendencias.length} pendências
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-emerald-400 text-center">
            ✨ Tudo em ordem
          </p>
        )}
      </div>
    </div>
  )
}