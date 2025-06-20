const express = require('express')
const router = express.Router()
const supabase = require('../config/db') // Ajuste o caminho conforme sua estrutura

router.post('/test-insert', async (req, res) => {
  try {
    // 1. Verifique o nome da tabela
    const tableName = 'teste_api' // Confira no Table Editor do Supabase
    
    // 2. Dados de exemplo (ajuste para sua tabela)
    const testData = {
      nome: "Teste Supabase",
      descricao: "Dado de teste",
      // Inclua todos campos obrigatórios aqui
      criado_em: new Date().toISOString()
    }

    // 3. Insert com tratamento de erro detalhado
    const { data, error } = await supabase
      .from(tableName)
      .insert([testData])
      .select()

    if (error) {
      console.error("Erro Supabase:", {
        message: error.message,
        code: error.code,
        details: error.details
      })
      throw error
    }

    res.json({
      success: true,
      message: "Dado inserido com sucesso!",
      data: data
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Falha ao inserir dado",
      error: error.message,
      details: error.details || null,
      hint: "Verifique: 1) Nome da tabela, 2) RLS, 3) Campos obrigatórios"
    })
  }
})

module.exports = router