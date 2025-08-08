const supabase = require('../config/db')

// Cadastro direto na tabela usuarios
exports.signUp = async (req, res) => {
  const { email, password, nome, tipo, telefone, estado, cidade } = req.body

  console.log('Dados recebidos no cadastro:', { email, nome, tipo, telefone, estado, cidade })

  try {
    // Validações básicas
    if (!email || !email.includes('@')) {
      throw new Error('E-mail inválido')
    }

    if (!password || password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres')
    }

    if (!nome || nome.trim().length === 0) {
      throw new Error('Nome é obrigatório')
    }

    if (!tipo || (tipo !== 'MANICURE' && tipo !== 'CLIENTE')) {
      throw new Error('Tipo de usuário inválido')
    }

    if (!telefone || telefone.trim().length === 0) {
      throw new Error('Telefone é obrigatório')
    }

    if (!estado || estado.trim().length === 0) {
      throw new Error('Estado é obrigatório')
    }

    if (!cidade || cidade.trim().length === 0) {
      throw new Error('Cidade é obrigatória')
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, tipo }
      }
    })

    if (authError) throw authError

    const { data: userData, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        id: authData.user.id,
        email,
        nome: nome.trim(),
        tipo,
        telefone: telefone.trim(),
        estado: estado.trim(),
        cidade: cidade.trim()
      })
      .select()

    if (insertError) throw insertError

    res.json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      user: userData[0]
    })

  } catch (error) {
    console.error("Erro no cadastro:", error)

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

// Reenviar e-mail de verificação
exports.resendConfirmation = async (req, res) => {
  const { email } = req.body

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    })

    if (error) throw error

    res.json({ success: true, message: 'E-mail de confirmação reenviado.' })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Erro ao reenviar e-mail',
      details: error.message
    })
  }
}

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    if (!data.user.email_confirmed_at) {
      throw new Error('E-mail ainda não confirmado. Verifique sua caixa de entrada.')
    }

    const { data: userData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) throw profileError

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
      error: 'Não autorizado',
      details: error.message
    })
  }
}

// Obter perfil
exports.getUserProfile = async (req, res) => {
  try {
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

// Buscar por ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('*')
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

// Buscar todas as manicures
exports.getManicures = async (req, res) => {
  try {
    const { data: manicures, error } = await supabase
      .from('usuarios')
      .select('id, nome, foto, telefone, estado, cidade, rua, email')
      .eq('tipo', 'MANICURE');

    if (error) throw error;

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
    
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { data: manicure, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .eq('tipo', 'MANICURE')
      .single();

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
