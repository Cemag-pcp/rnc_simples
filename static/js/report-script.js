import { fetchReports } from './data-monday.js';

// Elementos DOM
const reportViewerElement = document.getElementById('reportViewer');
const loadingElement = document.getElementById('loadingReport');
const backButton = document.getElementById('backButton');
const printButton = document.getElementById('printButton');
const downloadButton = document.getElementById('downloadButton');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Obter ID do relatório da URL
    const urlParams = new URLSearchParams(window.location.search);
    const reportId = urlParams.get('id');
    
    if (reportId) {
        loadReport(reportId);
    } 
    
    // Event listeners
    // backButton.addEventListener('click', goBack);
    // printButton.addEventListener('click', printReport);
    // downloadButton.addEventListener('click', downloadReport);
});

// Funções
async function loadReport(reportId) {
    try {
  
        // Buscar da API usando o ID
        const items = await fetchReports({ id: reportId });

        if (items && items.length > 0) {
            const report = items[0];
            renderReport(report);
        } else {
        }
    } catch (error) {
        console.error('❌ Erro ao buscar relatório:', error);
    }
}

function criarPrimeiraEtapa(report) {
    const table = document.createElement('table');
    table.style.marginTop = '-1px';
  
    // Linha 1 - Título da seção
    table.innerHTML = `
      <tr>
        <td colspan="5" class="section-header">1ª ETAPA - ABERTURA</td>
      </tr>
      <tr>
        <td style="width: 20%;"><strong>Status:</strong></td>
        <td colspan="4">${getFieldValue(report, 'status')}</td>
      </tr>
      <tr>
        <td><strong>RNC Nº: </strong>${report.id}</td>
        <td style="width: 30%;"><strong>Origem: </strong>${getFieldValue(report, 'id')}</td>
        <td colspan="2"><strong>Resp.: </strong>${getFieldValue(report, 'person')}</td>
        <td style="width: 15%;"><strong>Data: </strong>${getFieldValue(report, 'log_de_cria__o')}</td>
      </tr>
      <tr>
        <td><strong>Item Norma:</strong></td>
        <td colspan="4">${getFieldValue(report, 'lista_suspensa7')}</td>
      </tr>
      <tr>
        <td><strong>Descrição do Problema</strong></td>
        <td colspan="4"><strong>Conj./Ativ.: </strong>${getFieldValue(report, 'dropdown')}</td>
      </tr>
      
    `;

    document.getElementById("descProblema").innerHTML = report.name; 

    return table;
}

function criarSegundaEtapa(report) {
    const table = document.createElement('table');
    table.style.marginTop = '-1px';
  
    // Linha 1 - Título da seção
    table.innerHTML = `
        <tr>
            <td colspan="2" class="section-header">2ª ETAPA - AÇÃO IMEDIATA</td>
        </tr>
        <tr>
            <td style="width: 70%;"><strong>Status: </strong>${getFieldValue(report, 'status')}</td>
            <td><strong>Data: </strong>${getFieldValue(report, 'data_13')}</td>
        </tr>
        <tr>
            <td><strong>Resp.: </strong>${getFieldValue(report, 'pessoas_1')}</td>
        </tr>
      
    `;

    document.getElementById("acao-imediata").innerHTML = getFieldValue(report, 'long_text_mkpb8pca'); 

    return table;
}

function criarTerceiraEtapa(report) {
    const table = document.createElement('table');
    table.style.marginTop = '-1px';

    // Linha 1 - Título da seção
    table.innerHTML = `
        <tr>
            <td colspan="2" class="section-header">3ª ETAPA - ANÁLISE DE CAUSA RAIZ</td>
        </tr>
        <tr>
            <td style="width: 85%;"><strong>Resp.: </strong>${getFieldValue(report, 'pessoas1')}</td>
            <td><strong>Data: </strong>${getFieldValue(report, 'data')}</td>
        </tr>
    `;

    // Preencher ação imediata
    document.getElementById("acao-imediata").innerHTML = getFieldValue(report, 'long_text_mkpb8pca'); 

    // Criar conteúdo da análise se houver campos
    if (
        getFieldValue(report, 'texto') !== "N/A" ||
        getFieldValue(report, 'texto_4') !== "N/A" ||
        getFieldValue(report, 'texto_2') !== "N/A" ||
        getFieldValue(report, 'texto_3') !== "N/A" ||
        getFieldValue(report, 'texto_1') !== "N/A" ||
        getFieldValue(report, 'texto1') !== "N/A"
    ) {
        let camposAnalise = '';

        if (getFieldValue(report, 'texto') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Máquina:</strong></td>
                    <td>${getFieldValue(report, 'texto')}</td>
                </tr>
            `;
        }

        if (getFieldValue(report, 'texto_4') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Mão-de-Obra:</strong></td>
                    <td>${getFieldValue(report, 'texto_4')}</td>
                </tr>
            `;
        }

        if (getFieldValue(report, 'texto_2') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Matéria Prima:</strong></td>
                    <td>${getFieldValue(report, 'texto_2')}</td>
                </tr>
            `;
        }

        if (getFieldValue(report, 'texto_3') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Medição:</strong></td>
                    <td>${getFieldValue(report, 'texto_3')}</td>
                </tr>
            `;
        }

        if (getFieldValue(report, 'texto_1') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Método:</strong></td>
                    <td>${getFieldValue(report, 'texto_1')}</td>
                </tr>
            `;
        }

        if (getFieldValue(report, 'texto1') !== "N/A") {
            camposAnalise += `
                <tr>
                    <td class="label-cell"><strong>Meio Ambiente:</strong></td>
                    <td>${getFieldValue(report, 'texto1')}</td>
                </tr>
            `;
        }

        // Linha de pessoas presentes
        camposAnalise += `
            <tr>
                <td class="label-cell"><strong>Presentes:</strong></td>
                <td>${getFieldValue(report, 'texto1')}</td>
            </tr>
        `;

        // Criar nova tabela e adicionar ao DOM
        const tabelaAnalise = document.getElementById("table-analise-causa-raiz");
        tabelaAnalise.innerHTML = camposAnalise;
        tabelaAnalise.style.display = "table"; // ou "block" se for <div>
    } else {
        document.getElementById("table-analise-causa-raiz").style.display = "none";
    }

    return table;
}

function preencherQuartaEtapa(report) {
    const etapa4 = document.querySelector('#etapa-4 table');
  
    if (!report.subitems || report.subitems.length === 0) return;
  
    report.subitems.forEach(sub => {

        const atividade = sub.name;
        const responsavel = sub.column_values.find(col => col.id === 'respons_vel')?.text || '—';
        const executor = sub.column_values.find(col => col.id === 'respons_vel1')?.text || '—';
        const previsao = sub.column_values.find(col => col.id === 'previs_o')?.text || '—';
        const realizado = sub.column_values.find(col => col.id === 'data')?.text || '—';
    
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${atividade}</td>
            <td>${responsavel}</td>
            <td>${executor}</td>
            <td>${previsao}</td>
            <td>${realizado}</td>
        `;
        etapa4.appendChild(row);
    });
}

function criarQuintaEtapa(report) {
    const table = document.createElement('table');
    table.style.marginTop = '-1px';
  
    // Linha 1 - Título da seção
    table.innerHTML = `
        <tr>
            <td colspan="2" class="section-header">5ª ETAPA - EFICÁCIA</td>
        </tr>
        <tr>
            <td style="width: 50%;"><strong>Data:</strong></td>
            <td>${getFieldValue(report, 'data_1')}</td>
        </tr>
        <tr>
            <td><strong>Resp.:</strong></td>
            <td>${getFieldValue(report, 'pessoas')}</td>
        </tr>

        <table style="margin-top: -1px;">
            <tr>
                <td><strong>As ações corretivas foram eficazes? (Caso não, abrir nova RNC): </strong>${getFieldValue(report, 'avalia__o')}★</td>
                <td><strong>Nº da RNC: </strong>${report.id}</td>
            </tr>
        </table>
    `;

    return table;
}
  

function renderReport(report) {

    // 
    const contentPrimeiraEtapa = document.getElementById("etapa-abertura");
    const contentSegundaEtapa = document.getElementById("etapa-2");
    const contentTerceiraEtapa = document.getElementById("etapa-3");
    const contentQuintaEtapa = document.getElementById("etapa-5");

    // 
    const primeiraEtapa = criarPrimeiraEtapa(report);
    const seguntaEtapa = criarSegundaEtapa(report);
    const terceiraEtapa = criarTerceiraEtapa(report);
    const quintaEtapa = criarQuintaEtapa(report);

    // renderizar na div
    contentPrimeiraEtapa.appendChild(primeiraEtapa);
    contentSegundaEtapa.appendChild(seguntaEtapa);
    contentTerceiraEtapa.appendChild(terceiraEtapa);
    contentQuintaEtapa.appendChild(quintaEtapa);

    preencherQuartaEtapa(report);

}

function getFieldValue(report, columnId) {
    if (!report || !report.column_values) return 'N/A';
  
    const col = report.column_values.find(col => col.id === columnId);
    if (!col) return 'N/A';
  
    // 1. Se for campo de data ou log, prioriza o parse da data
    if ((columnId.includes('data') || columnId.includes('log')) && col.value) {
        try {
        const val = JSON.parse(col.value);
        const rawDate = val.date || val.created_at;
        if (rawDate) {
            let date = new Date(rawDate);
            date.setHours(date.getHours() - 3); // Subtrai 3h do UTC
            return isNaN(date) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
        }
        } catch (e) {
        const cleaned = col.value.replace(/"/g, '');
        let date = new Date(cleaned);
        date.setHours(date.getHours() - 3);
        return isNaN(date) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
        }
    }

    // 2. Se tiver text pronto (para outros campos)
    if (col.text && col.text.trim()) {
        return col.text;
    }

    // 3. Se for campo de pessoa
    if ((columnId === 'person' || columnId === 'pessoas1') && col.value) {
      try {
        const obj = JSON.parse(col.value);
        if (obj.personsAndTeams && obj.personsAndTeams.length > 0) {
          return obj.personsAndTeams.map(p => p.text || `ID: ${p.id}`).join(', ');
        }
      } catch {
        return col.value.replace(/"/g, '');
      }
    }
  
    // 4. Se for campo de status (retorna com badge)
    if (columnId === 'status' && col.text) {
      const status = col.text;
      const statusMap = {
        'Feito': 'success',
        'Pendente': 'danger',
        'Em andamento': 'warning text-dark',
        'Em análise': 'info text-dark',
        'Não iniciado': 'secondary',
        'Cancelado': 'dark'
      };
      const badgeClass = statusMap[status] || 'secondary';
      return `<span class="badge bg-${badgeClass}">${status}</span>`;
    }
  
    // 5. Fallback: tentar usar value puro
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value);
        if (parsed.text) return parsed.text;
        if (typeof parsed === 'string') return parsed;
        // Se for um objeto, tentar extrair informações relevantes
        if (typeof parsed === 'object') {
          // Se tiver ids, pode ser um campo de status ou similar
          if (parsed.ids && Array.isArray(parsed.ids)) {
            return col.text || 'N/A';
          }
          // Outros objetos, retornar N/A
          return 'N/A';
        }
        return String(col.value);
      } catch {
        return col.value.replace(/"/g, '');
      }
    }
  
    return 'N/A';
}

function formatDate(dateStr) {
    if (dateStr === "N/A") return dateStr;
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateStr;
    }
}

function formatFieldName(colId) {

    const ignoreList = ['respons_vel1']; // colunas que devem ser ignoradas
    if (ignoreList.includes(colId)) return null;

    const customLabels = {
      'respons_vel': 'Responsável',
      'previs_o': 'Previsão',
      '_ltima_atualiza__o': 'Última Att.'
    };
  
    if (customLabels[colId]) {
      return customLabels[colId];
    }
  
    // Fallback: transforma snake_case ou id padrão em Capitalizado
    return colId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
}

function goBack() {
    window.location.href = 'index.html';
}

function printReport() {
    window.print();
}

function downloadReport() {
    // Em uma aplicação real, isso geraria e baixaria o PDF
    alert("Em uma aplicação real, isso geraria e baixaria o PDF do relatório.");
}