// src/controllers/uploadController.js
const supabase = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Função para extrair tipo e conteúdo da base64
function parseBase64Image(base64String) {
  const matches = base64String.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }

  return {
    contentType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
    extension: matches[1].split('/')[1]
  };
}

// AQUI ESTÁ A FUNÇÃO EXPORTADA DIRETAMENTE
exports.uploadImagem = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user.id;

    if (!image) {
      return res.status(400).json({ error: 'Imagem não fornecida' });
    }

    const parsed = parseBase64Image(image);
    if (!parsed) {
      return res.status(400).json({ error: 'Formato da imagem inválido' });
    }

    const fileName = `${userId}/${uuidv4()}.${parsed.extension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, parsed.buffer, {
        contentType: parsed.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload do Supabase:', uploadError.message);
      return res.status(500).json({ error: 'Erro ao fazer upload para o Supabase' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return res.status(500).json({ error: 'Erro ao obter URL da imagem' });
    }

    return res.status(200).json({ url: publicUrlData.publicUrl });

  } catch (error) {
    console.error('Erro ao enviar imagem:', error);
    res.status(500).json({ error: 'Erro ao enviar imagem' });
  }
};
