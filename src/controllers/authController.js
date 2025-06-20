const supabase = require('../config/db')
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// Cadastro direto na tabela usuarios
exports.signUp = async (req, res) => {
  const { email, password, nome, tipo, telefone, estado, cidade } = req.body

  try {
    // 1. Validação básica do e-mail
    if (!email || !email.includes('@')) {
      throw new Error('E-mail inválido')
    }

    // 2. Gera hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Cria usuário no sistema de autenticação (sem verificação de e-mail)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { // Metadados adicionais
          nome,
          tipo
        }
      }
    })

    if (authError) throw authError

    // 4. Cria registro na tabela usuarios imediatamente
    const { data: userData, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nome,
        tipo,
        senha: hashedPassword,
        telefone: telefone || null,
        estado: estado || null,
        cidade: cidade || null
      })
      .select()

    if (insertError) throw insertError

    // 5. Atualiza o usuário no auth para marcar como "verificado"
    await supabase.auth.admin.updateUserById(authData.user.id, {
      email_confirmed_at: new Date().toISOString()
    })

    res.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: userData[0]
    })

  } catch (error) {
    console.error("Erro no cadastro:", error)

    // Tenta limpar o usuário criado no auth se falhar na tabela usuarios
    if (email) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const userToDelete = users.find(u => u.email === email)

      if (userToDelete) {
        await supabase.auth.admin.deleteUser(userToDelete.id)
          .catch(e => console.error("Falha ao limpar usuário:", e))
      }
    }

    res.status(400).json({
      success: false,
      error: error.message,
      details: error.details || "Erro ao processar cadastro"
    })
  }
}

// Login simplificado
exports.login = async (req, res) => {
  const { email, password } = req.body

  try {
    // 1. Autenticação via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // 2. Busca dados adicionais na tabela usuarios
    const { data: userData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) throw profileError

    // 3. Verifica a senha (opcional - redundante com auth do Supabase)
    const isPasswordValid = await bcrypt.compare(password, userData.senha)
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas')
    }

    res.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        ...data.user,
        ...userData
      }
    })

  } catch (error) {
    console.error("Erro no login:", error)
    res.status(401).json({
      success: false,
      error: 'Credenciais inválidas',
      details: error.message
    })
  }
}

// Obter perfil do usuário
exports.getUserProfile = async (req, res) => {
  try {
    // Busca informações na tabela usuarios
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) throw error

    res.json({
      success: true,
      user: userData
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erro ao carregar perfil",
      details: error.message
    })
  }
}

//Buscar usuário por ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nome, foto, tipo')
      .eq('id', id)
      .single();

    if (error || !user) throw error || new Error('Usuário não encontrado');

    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
}

// Atualizar perfil
exports.updateProfile = async (req, res) => {
  const updates = req.body

  try {
    // Atualiza na tabela usuarios
    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', req.user.id)
      .select()

    if (error) throw error

    res.json({
      success: true,
      user: data[0]
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Erro ao atualizar perfil",
      details: error.message
    })
  }
}

// Busca todas as manicures (dados públicos)
exports.getManicures = async (req, res) => {
  try {
    const { data: manicures, error } = await supabase
      .from('usuarios')
      .select('id, nome, foto, telefone, estado, cidade, rua, email')
      .eq('tipo', 'MANICURE');

    if (error) throw error;

    // Retorna exatamente como vem do banco (Supabase já retorna null para campos não preenchidos)
    res.json({
      success: true,
      manicures: manicures || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erro ao buscar profissionais",
      details: error.message
    });
  }
}

// Buscar manicure por ID
exports.getManicureById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifica se o ID é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { data: manicure, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .eq('tipo', 'MANICURE')
      .single();

    // Remove o campo senha antes de retornar
    if (manicure && manicure.senha) {
      delete manicure.senha;
    }

    if (error) throw error;
    if (!manicure) return res.status(404).json({ error: 'Manicure não encontrada' });

    res.json(manicure);
  } catch (error) {
    console.error('Erro ao buscar manicure:', error);
    res.status(500).json({ error: 'Erro interno ao buscar manicure' });
  }
}