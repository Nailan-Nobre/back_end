const { supabase } = require('../config/db');

async function getAnalyticsData(periodo = 'hoje') {
  // Verificar se o período é uma string
  if (typeof periodo !== 'string') {
    periodo = 'hoje'; // Valor padrão se não for string
  }

  // Normalização segura do parâmetro
  let periodoNormalizado = String(periodo)
    .toLowerCase()
    .trim()
    .replace(/[éêè]/g, 'e')
    .replace(/[áãâà]/g, 'a')
    .replace(/[íîì]/g, 'i')
    .replace(/[óõôò]/g, 'o')
    .replace(/[úûù]/g, 'u')
    .replace(/ç/g, 'c');

  // Mapeamento de períodos válidos
  const periodosValidos = {
    'hoje': 'hoje',
    'today': 'hoje',
    'semana': 'semana',
    'week': 'semana',
    'mes': 'mes',
    'month': 'mes'
  };

  // Obter o período normalizado ou usar 'hoje' como padrão
  const periodoFinal = periodosValidos[periodoNormalizado] || 'hoje';

  // Definir intervalos de tempo
  const dataFim = new Date();
  let dataInicio = new Date();

  switch(periodoFinal) {
    case 'hoje':
      dataInicio.setHours(0, 0, 0, 0);
      break;
    case 'semana':
      dataInicio.setDate(dataInicio.getDate() - 7);
      break;
    case 'mes':
      dataInicio.setMonth(dataInicio.getMonth() - 1);
      break;
  }

  try {
    // Consulta única otimizada para todas as métricas
    const { data, error } = await supabase
      .rpc('get_analytics_data', {
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString()
      })
      .single();

    if (error) throw error;

    // Retornar dados formatados
    return {
      login: data.total_logins || 0,
      agendamentos: data.total_agendamentos || 0,
      concluidos: data.agendamentos_concluidos || 0,
      cancelados: data.agendamentos_cancelados || 0,
      recusados: data.agendamentos_recusados || 0,
      pendentes: data.agendamentos_pendentes || 0
    };
    
  } catch (error) {
    console.error('Erro ao buscar dados:', error.message);
    throw new Error(`Falha ao obter dados analíticos: ${error.message}`);
  }
}

module.exports = {
  getAnalyticsData
};