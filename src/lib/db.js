import Dexie from 'dexie'

export const db = new Dexie('ChecklistCorridaDB')

db.version(2).stores({
  usuarios: 'id, usuario',
  etapa_ativa: 'id',
  carros: 'id',
  checklist_respostas: 'id, item_id, carro_id, etapa_id', // <- NOVA
  fila_sincronizacao: '++id, tabela, tipo, dados, criado_em'
})