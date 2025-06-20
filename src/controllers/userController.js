// Exemplo de controller para usuários
exports.getAllUsers = async (req, res) => {
  try {
    // Lógica para buscar usuários
    const users = await User.find() // Exemplo fictício
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuários" })
  }
}

exports.createUser = async (req, res) => {
  const { name, email } = req.body
  try {
    // Lógica para criar usuário
    const newUser = await User.create({ name, email }) // Exemplo fictício
    res.status(201).json(newUser)
  } catch (error) {
    res.status(400).json({ error: "Erro ao criar usuário" })
  }
}