import imageCompression from 'browser-image-compression'

export async function comprimirImagem(file) {
  try {
    const options = {
      maxSizeMB: 0.5,          // Reduz pra no máximo 500KB
      maxWidthOrHeight: 1280,  // Reduz a resolução máxima
      useWebWorker: true,      // Usa processamento em segundo plano (não trava a tela)
    }

    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Erro ao comprimir:', error)
    return file // Se falhar, retorna a original
  }
}