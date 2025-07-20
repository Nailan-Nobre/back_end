const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/db');

function parseBase64Image(dataString) {
  const matches = dataString.match(/^data:(.*);base64,(.*)$/);
  if (!matches || matches.length !== 3) return null;

  const contentType = matches[1];
  const extension = contentType.split('/')[1];
  const buffer = Buffer.from(matches[2], 'base64');

  return { contentType, extension, buffer };
}

exports.uploadImagem = async (req, res) => {
  try {
    const { image, fotoAntiga } = req.body; // recebe a imagem nova e a URL da antiga
    const userId = req.user.id;

    if (!image) return res.status(400).json({ error: 'Imagem não fornecida.' });

    const parsed = parseBase64Image(image);
    if (!parsed) return res.status(400).json({ error: 'Formato da imagem inválido.' });

    // 1. Se existe foto antiga, deletar do bucket
    if (fotoAntiga) {
      const url = new URL(fotoAntiga);
      const path = decodeURIComponent(url.pathname.split('/storage/v1/object/public/avatars/')[1]);

      const { error: deleteError } = await supabase
        .storage
        .from('avatars')
        .remove([path]);

      if (deleteError) {
        console.error('Erro ao deletar imagem antiga:', deleteError);
        // Você pode escolher se quer prosseguir com upload mesmo assim
      }
    }

    // 2. Enviar nova imagem
    const fileName = `${userId}/${uuidv4()}.${parsed.extension}`;
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileName, parsed.buffer, {
        contentType: parsed.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload do Supabase:', uploadError);
      return res.status(500).json({ error: 'Erro ao fazer upload para o Supabase' });
    }

    // 3. Obter nova URL pública
    const { data: publicUrlData } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      return res.status(500).json({ error: 'Erro ao obter URL da imagem' });
    }

    return res.status(200).json({ url: publicUrlData.publicUrl });

  } catch (error) {
    console.error('Erro ao enviar imagem:', error);
    res.status(500).json({ error: 'Erro ao enviar imagem' });
  }
};
