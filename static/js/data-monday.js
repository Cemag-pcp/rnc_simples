// Configuração da API - Agora usa o backend
const apiUrl = "/api/monday/query";

// Variável global para armazenar o cursor da paginação
let nextCursor = null;

// Função para buscar relatórios com filtros dinâmicos
export async function fetchReports(filters = {}, useCursor = false) {
  const reportsPerPage = 10;
  const { id, status, person, name, sector } = filters;
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
    
    if (status) filterRules.push(`{ column_id: "status", compare_value: "${status}", operator: contains_terms }`);
    if (person) filterRules.push(`{ column_id: "person", compare_value: ["${person}"], operator: contains_terms }`);
    if (name) filterRules.push(`{ column_id: "name", compare_value: "${name}", operator: contains }`);
    if (sector) filterRules.push(`{ column_id: "setor5", compare_value: "${sector}", operator: contains_terms }`);

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

  