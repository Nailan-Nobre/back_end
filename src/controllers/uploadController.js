const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function parseBase64Image(dataString) {
  const matches = dataString.match(/^data:(.*);base64,(.*)$/);
  if (!matches || matches.length !== 3) return null;

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  if (!allowedTypes.includes(matches[1].toLowerCase())) return null;

  return {
    contentType: matches[1],
    extension: matches[1].split('/')[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
}

exports.uploadImagem = async (req, res) => {
  try {
    const { image, fotoAntiga } = req.body;
    const userId = req.user.id; // ID do usuário autenticado

    if (!image) return res.status(400).json({ error: 'Imagem não fornecida.' });

    const parsed = parseBase64Image(image);
    if (!parsed) return res.status(400).json({ error: 'Formato da imagem inválido.' });

    // 1. Deletar foto antiga se existir
    if (fotoAntiga && !fotoAntiga.includes('imagens/user.png')) {
      const path = fotoAntiga.split('/storage/v1/object/public/avatars/')[1]; // Excluindo o caminho correto
      const { error } = await supabase
        .storage
        .from('avatars')
        .remove([path]);  // Deletar o arquivo antigo

      if (error) {
        console.error('Erro ao deletar imagem antiga:', error);
        return res.status(500).json({ error: 'Erro ao deletar imagem antiga.' });
      }
    }

    // 2. Upload da nova imagem
    const fileName = `${userId}/${uuidv4()}.${parsed.extension}`;
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileName, parsed.buffer, {
        contentType: parsed.contentType,
        upsert: false,  // Use `upsert: false` para garantir que a imagem não seja substituída sem controle
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }

    // 3. Obter URL pública da nova imagem
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    return res.status(200).json({ url: publicUrl });

  } catch (error) {
    console.error('Erro no uploadController:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};