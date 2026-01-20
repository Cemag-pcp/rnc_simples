// Configuração da API - Agora usa o backend
const apiUrl = "/api/monday/query";

// Variável global para armazenar o cursor da paginação
let nextCursor = null;

// Função para buscar relatórios com filtros dinâmicos
export async function fetchReports(filters = {}, useCursor = false) {
  const reportsPerPage = 10;
  const { id, status, person, name, sector, garantia, subitemResponsavel, subitemStatus, subitemPrevisaoInicio, subitemPrevisaoFim } = filters;
  let query = '';

  // Se não for para usar o cursor, reseta ele para a primeira página
  if (!useCursor) {
    nextCursor = null;
  }

  // Se tiver ID, fazemos uma busca direta pelo item
  if (id) {
    query = `
      query {
        items(ids: [${id}]) {
          id
          name
          board {
            id
          }
          column_values {
            id
            text
            value
          }
          subitems {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    `;
  } else if (useCursor && nextCursor) {
    // CASO 2: Paginação com cursor (sem query_params)
    query = `
      query {
        boards(ids: 5743962278) {
          items_page(
            limit: ${reportsPerPage},
            cursor: "${nextCursor}"
          ) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
              subitems {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
            cursor
          }
        }
      }
    `;
  } else {
    // CASO 1: Primeira página com query_params (sem cursor)
    // Filtro por outras colunas
    const filterRules = [];
    
    if (status) filterRules.push(`{ column_id: "status8", compare_value: "${status}", operator: contains_terms }`);
    if (person) filterRules.push(`{ column_id: "person", compare_value: ["${person}"], operator: contains_terms }`);
    if (name) filterRules.push(`{ column_id: "name", compare_value: "${name}", operator: contains }`);
    if (sector) filterRules.push(`{ column_id: "setor5", compare_value: "${sector}", operator: contains_terms }`);
    if (garantia) filterRules.push(`{ column_id: "status3", compare_value: "${garantia}", operator: contains_terms }`);

    // Montagem dos parâmetros da query
    const orderPart = `order_by: [{ column_id: "__creation_log__", direction: desc }]`;
    const rulesPart = filterRules.length > 0 ? `rules: [${filterRules.join(',')}]` : '';
    const queryParams = [orderPart, rulesPart].filter(Boolean).join(', '); // junta só os que existem
    
    query = `
      query {
        boards(ids: 5743962278) {
          items_page(
            limit: ${reportsPerPage},
            query_params: { ${queryParams} }
          ) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
              subitems {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
            cursor
          }
        }
      }
    `;
  }

  console.log('Query GraphQL:', query);
  console.log('Usando cursor:', useCursor ? nextCursor : null);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
  
    const result = await response.json();
    
    // Verificar se há erro na resposta
    if (result.errors) {
      console.error('Erro na resposta GraphQL:', result.errors);
      return null;
    }

    // Processamento do resultado
    let items = [];
    let newCursor = null;

    if (result.data?.boards?.[0]?.items_page) {
      // Busca paginada
      const data = result.data.boards[0];
      items = data.items_page.items || [];
      newCursor = data.items_page.cursor || null;
    } else if (result.data?.items) {
      // Busca por ID direto
      items = result.data.items;
    }

    // Atualiza o cursor para a próxima chamada
    nextCursor = newCursor;
    console.log('Novo cursor obtido:', nextCursor);

    // Filtrar por responsável nos subitens (lado do cliente)
    if (subitemResponsavel) {
      items = items.filter(item => {
        if (!item.subitems || item.subitems.length === 0) return false;
        
        return item.subitems.some(subitem => {
          const responsavelColumn = subitem.column_values.find(col => col.id === 'respons_vel');
          if (!responsavelColumn) return false;
          
          const responsavelText = responsavelColumn.text || responsavelColumn.value || '';
          return responsavelText.toLowerCase().includes(subitemResponsavel.toLowerCase());
        });
      });
    }

    // Filtrar por status nos subitens (lado do cliente)
    if (subitemStatus) {
      items = items.filter(item => {
        if (!item.subitems || item.subitems.length === 0) return false;
        
        return item.subitems.some(subitem => {
          const statusColumn = subitem.column_values.find(col => col.id === 'status');
          if (!statusColumn) return false;
          
          const statusText = statusColumn.text || '';
          return statusText === subitemStatus;
        });
      });
    }

    // Filtrar por previsão nos subitens (lado do cliente)
    if (subitemPrevisaoInicio || subitemPrevisaoFim) {
      items = items.filter(item => {
        if (!item.subitems || item.subitems.length === 0) return false;
        
        return item.subitems.some(subitem => {
          const previsaoColumn = subitem.column_values.find(col => col.id === 'previs_o');
          if (!previsaoColumn || !previsaoColumn.value) return false;
          
          try {
            const previsaoData = JSON.parse(previsaoColumn.value);
            
            // Data de início do filtro (se fornecida)
            const filtroInicio = subitemPrevisaoInicio ? new Date(subitemPrevisaoInicio) : null;
            // Data de fim do filtro (se fornecida)
            const filtroFim = subitemPrevisaoFim ? new Date(subitemPrevisaoFim) : null;
            
            // Data "from" da previsão
            const previsaoFrom = previsaoData.from ? new Date(previsaoData.from) : null;
            // Data "to" da previsão
            const previsaoTo = previsaoData.to ? new Date(previsaoData.to) : null;
            
            // Se não tiver nenhuma data na previsão, retorna false
            if (!previsaoFrom && !previsaoTo) return false;
            
            // Lógica: verifica se há sobreposição entre os períodos
            // Período do filtro: [filtroInicio, filtroFim]
            // Período da previsão: [previsaoFrom, previsaoTo]
            
            if (filtroInicio && filtroFim) {
              // Ambos os campos preenchidos: verifica sobreposição de períodos
              const inicio = previsaoFrom || previsaoTo;
              const fim = previsaoTo || previsaoFrom;
              
              // Há sobreposição se: início da previsão <= fim do filtro E fim da previsão >= início do filtro
              return inicio <= filtroFim && fim >= filtroInicio;
            } else if (filtroInicio) {
              // Apenas data inicial: busca previsões que terminam após ou na data inicial
              const fim = previsaoTo || previsaoFrom;
              return fim >= filtroInicio;
            } else if (filtroFim) {
              // Apenas data final: busca previsões que começam antes ou na data final
              const inicio = previsaoFrom || previsaoTo;
              return inicio <= filtroFim;
            }
            
            return false;
          } catch {
            return false;
          }
        });
      });
    }

    return items;
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error);
    return null;
  }
}

export function hasNextPage() {
  return nextCursor !== null;
}

export function resetCursor() {
  nextCursor = null;
}
  
export async function carregarSetores() {
  const query = `
    query {
      boards(ids: 5743962278) {
        columns(ids: ["setor5"]) {
          id
          title
          settings_str
        }
      }
    }
  `;

  const response = await fetch('/api/monday/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  const settingsStr = result.data.boards[0].columns[0].settings_str;
  const settings = JSON.parse(settingsStr);
  const setores = settings.labels;

  const select = document.getElementById('sectorFilter');
  select.innerHTML = `<option value="">Todos os setores</option>`; // reinicia

  setores.forEach(setor => {
    const option = document.createElement('option');
    option.value = setor.name;
    option.textContent = setor.name;
    select.appendChild(option);
  });
}

export async function carregarStatus() {
  const query = `
    query {
      boards(ids: 5743962278) {
        columns(ids: ["status"]) {
          id
          title
          settings_str
        }
      }
    }
  `;

  const response = await fetch('/api/monday/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  const settingsStr = result.data.boards[0].columns[0].settings_str;
  const settings = JSON.parse(settingsStr);
  const items = settings.labels;

  const select = document.getElementById('statusFilter');
  select.innerHTML = `<option value="">Todos os status</option>`;

  Object.entries(items).forEach(([index, name]) => {
    const option = document.createElement('option');
    option.value = name;         // envia o índice (0, 1, 2...) como valor
    option.textContent = name;    // exibe o nome do status
    select.appendChild(option);
  });
}

export async function carregarOrigem() {
  const query = `
    query {
      boards(ids: 5743962278) {
        columns(ids: ["status3"]) {
          id
          title
          settings_str
        }
      }
    }
  `;

  const response = await fetch('/api/monday/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  const settingsStr = result.data.boards[0].columns[0].settings_str;
  const settings = JSON.parse(settingsStr);
  const items = settings.labels;

  const select = document.getElementById('garantiaFilter');
  select.innerHTML = `<option value="">Todas as origens</option>`;

  // Verificar se labels é um array de objetos ou um objeto simples
  if (Array.isArray(items)) {
    items.forEach(label => {
      const option = document.createElement('option');
      const labelText = typeof label === 'object' ? (label.name || label.text || label.label || JSON.stringify(label)) : String(label);
      option.value = labelText;
      option.textContent = labelText;
      select.appendChild(option);
    });
  } else if (typeof items === 'object') {
    Object.entries(items).forEach(([index, label]) => {
      const option = document.createElement('option');
      const labelText = typeof label === 'object' ? (label.name || label.text || label.label || String(index)) : String(label);
      option.value = labelText;
      option.textContent = labelText;
      select.appendChild(option);
    });
  }
}

export async function carregarSubitemStatus() {
  const query = `
    query {
      boards(ids: 5743962278) {
        columns(ids: ["status"]) {
          id
          title
          settings_str
        }
      }
    }
  `;

  const response = await fetch('/api/monday/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  const settingsStr = result.data.boards[0].columns[0].settings_str;
  const settings = JSON.parse(settingsStr);
  const items = settings.labels;

  const select = document.getElementById('subitemStatusFilter');
  select.innerHTML = `<option value="">Todos os status</option>`;

  Object.entries(items).forEach(([index, name]) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

  