const supabase = require('../config/db')

const User = {
  async getAll() {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    return data
  },

  async create({ name, email }) {
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email }])
      .select()
    if (error) throw error
    return data[0]
  }
}

module.exports = User