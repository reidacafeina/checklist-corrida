import { db } from './db'
import { supabase } from './supabase'

export async function sincronizarFila() {
  if (!navigator.onLine) return

  try {
    const itensPendentes = await db.fila_sincronizacao.toArray()
    
    if (itensPendentes.length === 0) return

    console.log(`Sincronizando ${itensPendentes.length} itens...`)

    for (const item of itensPendentes) {
      let erro = null

      if (item.tabela === 'checklist_respostas') {
        // Como o checklist_respostas tem uma PK (id), a gente pode usar upsert
        // Se o id já existir no banco, ele atualiza; se não, ele insere.
        const { error } = await supabase.from('checklist_respostas').upsert(item.dados)
        erro = error
      }

      if (!erro) {
        await db.fila_sincronizacao.delete(item.id)
      } else {
        console.error('Erro ao sincronizar item:', erro)
      }
    }

    console.log('Sincronização concluída!')
  } catch (err) {
    console.error('Erro geral na sincronização:', err)
  }
}

// Sincroniza quando a internet voltar
window.addEventListener('online', () => {
  console.log('Internet voltou! Sincronizando...')
  sincronizarFila()
})

// Sincroniza a cada 30 segundos se tiver internet e tiver fila
setInterval(() => {
  if (navigator.onLine) {
    sincronizarFila()
  }
}, 30000)