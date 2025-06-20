const { createClient } = require('@supabase/supabase-js')
require('dotenv').config() // Adicione esta linha

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas!')
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase