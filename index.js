const app = require('./src/app')
const { ensureAvatarBucket } = require('./src/services/storageService')

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    await ensureAvatarBucket()
    console.log('Bucket de avatars verificado/criado com sucesso.')
  } catch (error) {
    console.error('Falha ao garantir o bucket de avatars:', error)
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })
}

startServer()