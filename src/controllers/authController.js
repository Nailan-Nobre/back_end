const supabase = require('../config/db')

// Cadastro direto na tabela manicures
exports.signUp = async (req, res) => {
  const { email, password, nome, telefone, estado, cidade } = req.body
  let createdUserId = null

  console.log('Dados recebidos no cadastro:', { email, nome, telefone, estado, cidade })

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

    if (!telefone || telefone.trim().length === 0) {
      throw new Error('Telefone é obrigatório')
    }

    if (!estado || estado.trim().length === 0) {
      throw new Error('Estado é obrigatório')
    }

    if (!cidade || cidade.trim().length === 0) {
      throw new Error('Cidade é obrigatória')
    }

    const frontendUrl = getFrontendUrl()
    const redirectTo = `${frontendUrl}/confirmacao.html`
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variáveis do Supabase não configuradas para signup.')
    }

    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        options: {
          data: {
            nome,
            telefone,
            estado,
            cidade,
            tipo: 'MANICURE'
          },
          emailRedirectTo: redirectTo
        }
      })
    })

    const signupText = await signupResponse.text()
    let signupData = null

    if (signupText) {
      try {
        signupData = JSON.parse(signupText)
      } catch (_error) {
        signupData = { message: signupText }
      }
    }

    if (!signupResponse.ok) {
      const signupMessage = String(signupData?.msg || signupData?.error_description || signupData?.message || '').toLowerCase()

      if (signupMessage.includes('already registered') || signupMessage.includes('already exists')) {
        return res.json({
          success: true,
          message: 'Já existe um cadastro com este e-mail. Verifique sua caixa de entrada para continuar.'
        })
      }

      throw new Error(signupData?.msg || signupData?.error_description || signupData?.message || 'Não foi possível criar o cadastro no Supabase.')
    }

    res.json({
      success: true,
      message: 'Cadastro realizado com sucesso. Verifique seu e-mail para confirmar sua conta.'
    })

  } catch (error) {
    console.error("Erro no cadastro:", error)

    if (error.message?.toLowerCase().includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.',
        details: 'Erro ao processar cadastro'
      })
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
      .from('manicures')
      .select('*')
      .eq('id', data.user.id)
      .single()

    let manicureProfile = userData

    if (profileError || !manicureProfile) {
      const metadata = data.user.user_metadata || {}
      const nomeBase = metadata.nome || data.user.email?.split('@')[0] || 'manicure'
      const slug = `${slugify(nomeBase)}-${data.user.id.slice(0, 8)}`

      const { data: createdProfile, error: createProfileError } = await supabase
        .from('manicures')
        .insert({
          id: data.user.id,
          email: data.user.email,
          nome: nomeBase,
          telefone: metadata.telefone || null,
          estado: metadata.estado || null,
          cidade: metadata.cidade || null,
          slug,
          ativa: true,
          bio: ''
        })
        .select()
        .single()

      if (createProfileError) throw createProfileError

      manicureProfile = createdProfile
    }

    res.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        ...data.user,
        ...manicureProfile,
        tipo: 'MANICURE'
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
      .from('manicures')
      .select('*')
      .eq('id', req.user.id)
      .single()

    if (error) throw error

    res.json({
      success: true,
      user: {
        ...userData,
        tipo: 'MANICURE'
      }
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
      .from('manicures')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) throw error || new Error('Usuário não encontrado');

    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'Usuário não encontrado' });
  }
}

// Buscar manicure por slug para a tela pública de agendamento
exports.getManicureBySlug = async (req, res) => {
  try {
    const { slug } = req.params

    const { data: manicure, error } = await supabase
      .from('manicures')
      .select('id, email, nome, foto, telefone, estado, cidade, bio, slug, estrelas, ativa, dias_trabalho, horarios, servicos, regras, created_at, updated_at')
      .eq('slug', slug)
      .single()

    if (error || !manicure) {
      return res.status(404).json({
        success: false,
        error: 'Manicure não encontrada'
      })
    }

    res.json({
      success: true,
      manicure
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar manicure',
      details: error.message
    })
  }
}

// Atualizar perfil
exports.updateProfile = async (req, res) => {
  const updates = req.body

  try {
    const { data, error } = await supabase
      .from('manicures')
      .update(updates)
      .eq('id', req.user.id)
      .select()

    if (error) throw error

    res.json({
      success: true,
      user: {
        ...data[0],
        tipo: 'MANICURE'
      }
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Erro ao atualizar perfil",
      details: error.message
    })
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function gerarSlugUnico(client, base) {
  let slug = base
  let tentativa = 0

  while (true) {
    const { data, error } = await client
      .from('manicures')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw error
    if (!data) return slug

    tentativa += 1
    slug = `${base}-${tentativa}`
  }
}

function getFrontendUrl() {
  return String(process.env.FRONTEND_URL || 'https://pretty-nails-app.vercel.app').replace(/\/$/, '')
}

