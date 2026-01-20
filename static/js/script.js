import { fetchReports, hasNextPage, resetCursor, carregarSetores, carregarStatus, carregarOrigem, carregarSubitemStatus } from './data-monday.js';

// Variáveis globais
let currentPage = 1;
const reportsPerPage = 5;
let filteredReports = [];

// Elementos DOM
const reportListElement = document.getElementById('reportList');
const reportCountElement = document.getElementById('reportCount');
const paginationElement = document.getElementById('pagination');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const applyFiltersButton = document.getElementById('applyFilters');
const clearFiltersButton = document.getElementById('clearFilters');
const loadMoreButton = document.getElementById('load-more');
const selectAllBtn = document.getElementById('selectAllBtn');
const printSelectedBtn = document.getElementById('printSelectedBtn');
const selectedCountSpan = document.getElementById('selectedCount');
let currentFilters = {}; // global
let nextCursor = null; // global
let selectedReports = new Set(); // Para armazenar IDs dos relatórios selecionados

// Filtros
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const sectorFilter = document.getElementById('sectorFilter');
const personFilter = document.getElementById('personFilter');
const idFilter = document.getElementById('idRelatorio');
const garantiaFilter = document.getElementById('garantiaFilter');
const subitemResponsavelFilter = document.getElementById('subitemResponsavelFilter');
const subitemStatusFilter = document.getElementById('subitemStatusFilter');
const subitemPrevisaoInicio = document.getElementById('subitemPrevisaoInicio');
const subitemPrevisaoFim = document.getElementById('subitemPrevisaoFim');

// Event listener do botão "Carregar mais"
// document.getElementById('load-more').addEventListener('click', () => {
//     renderReports();
// });

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
  
    // Event listeners de filtros
    applyFiltersButton.addEventListener('click', applyFilters);
    clearFiltersButton.addEventListener('click', clearFilters);
  
    dateFilter.addEventListener('change', function () {
      if (this.value === '') {
        applyFilters();
      }
    });
  
    personFilter.addEventListener('input', debounce(function () {
      if (this.value.length === 0 || this.value.length > 2) {
        applyFilters();
      }
    }, 500));
  
    idFilter.addEventListener('input', debounce(function () {
      if (this.value.length === 0 || this.value.length > 2) {
        applyFilters();
      }
    }, 500));
  
    subitemResponsavelFilter.addEventListener('input', debounce(function () {
      if (this.value.length === 0 || this.value.length > 2) {
        applyFilters();
      }
    }, 500));
  
    
    [statusFilter, dateFilter, sectorFilter, personFilter, idFilter, garantiaFilter, subitemResponsavelFilter, subitemStatusFilter, subitemPrevisaoInicio, subitemPrevisaoFim].forEach(filter => {
      filter.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          applyFilters();
        }
      });
    });
  
    // Filtros via URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('status')) statusFilter.value = urlParams.get('status');
    if (urlParams.has('date')) dateFilter.value = urlParams.get('date');
    if (urlParams.has('sector')) sectorFilter.value = urlParams.get('sector');
    if (urlParams.has('person')) personFilter.value = urlParams.get('person');
    if (urlParams.has('id')) idFilter.value = urlParams.get('id');
    if (urlParams.has('garantia')) garantiaFilter.value = urlParams.get('garantia');
    if (urlParams.has('subitemResponsavel')) subitemResponsavelFilter.value = urlParams.get('subitemResponsavel');
    if (urlParams.has('subitemStatus')) subitemStatusFilter.value = urlParams.get('subitemStatus');
    if (urlParams.has('subitemPrevisaoInicio')) subitemPrevisaoInicio.value = urlParams.get('subitemPrevisaoInicio');
    if (urlParams.has('subitemPrevisaoFim')) subitemPrevisaoFim.value = urlParams.get('subitemPrevisaoFim');
  
    if (
      urlParams.has('status') || urlParams.has('date') || urlParams.has('sector') ||
      urlParams.has('person') || urlParams.has('id') || urlParams.has('garantia') ||
      urlParams.has('subitemResponsavel') || urlParams.has('subitemStatus') ||
      urlParams.has('subitemPrevisaoInicio') || urlParams.has('subitemPrevisaoFim')
    ) {
        applyFilters();
    } else {
        renderReports();
    }

    carregarSetores();
    carregarStatus();
    carregarOrigem();
    carregarSubitemStatus();

    // Event listeners para seleção múltipla
    selectAllBtn.addEventListener('click', toggleSelectAll);
    printSelectedBtn.addEventListener('click', printSelectedReports);
});

// Funções
function applyFilters() {
    const status = statusFilter.value;
    const date = dateFilter.value;
    const sector = sectorFilter.value;
    const person = personFilter.value;
    const id = idFilter.value;
    const garantia = garantiaFilter.value;
    const subitemResponsavel = subitemResponsavelFilter.value;
    const subitemStatus = subitemStatusFilter.value;
    const previsaoInicio = subitemPrevisaoInicio.value;
    const previsaoFim = subitemPrevisaoFim.value;

    resetCursor(); // zera a paginação
  
    // Atualizar URL com filtros
    const url = new URL(window.location);
    if (status) url.searchParams.set('status', status); else url.searchParams.delete('status');
    if (date) url.searchParams.set('date', date); else url.searchParams.delete('date');
    if (sector) url.searchParams.set('sector', sector); else url.searchParams.delete('sector');
    if (person) url.searchParams.set('person', person); else url.searchParams.delete('person');
    if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
    if (garantia) url.searchParams.set('garantia', garantia); else url.searchParams.delete('garantia');
    if (subitemResponsavel) url.searchParams.set('subitemResponsavel', subitemResponsavel); else url.searchParams.delete('subitemResponsavel');
    if (subitemStatus) url.searchParams.set('subitemStatus', subitemStatus); else url.searchParams.delete('subitemStatus');
    if (previsaoInicio) url.searchParams.set('subitemPrevisaoInicio', previsaoInicio); else url.searchParams.delete('subitemPrevisaoInicio');
    if (previsaoFim) url.searchParams.set('subitemPrevisaoFim', previsaoFim); else url.searchParams.delete('subitemPrevisaoFim');
    window.history.replaceState({}, '', url);
  
    // Resetar paginação
    nextCursor = null;
    reportListElement.innerHTML = '';
  
    // Montar objeto de filtros
    const filters = {};
    if (status) filters.status = status;
    if (person) filters.person = person;
    if (id) filters.id = id;
    if (sector) filters.sector = sector;
    if (date) filters.date = date;
    if (garantia) filters.garantia = garantia;
    if (subitemResponsavel) filters.subitemResponsavel = subitemResponsavel;
    if (subitemStatus) filters.subitemStatus = subitemStatus;
    if (previsaoInicio) filters.subitemPrevisaoInicio = previsaoInicio;
    if (previsaoFim) filters.subitemPrevisaoFim = previsaoFim;
  
    // Salvar filtros atuais e renderizar
    currentFilters = filters;
    renderReports(filters);
}

function clearFilters() {
    // Limpar campos de filtro
    statusFilter.value = '';
    dateFilter.value = '';
    sectorFilter.value = '';
    personFilter.value = '';
    idRelatorio.value = '';
    garantiaFilter.value = '';
    subitemResponsavelFilter.value = '';
    subitemStatusFilter.value = '';
    subitemPrevisaoInicio.value = '';
    subitemPrevisaoFim.value = '';

    // Limpar parâmetros de URL
    const url = new URL(window.location);
    url.search = '';
    window.history.replaceState({}, '', url);
    
    // Resetar filtros e atualizar UI
    currentPage = 1;
    renderReports();
    updatePagination();
}

let todosRelatorios = [];

async function renderReports(filters = {}, append = false) {
    const spinnerLoading = document.getElementById('spinner-loading');

    // Mostrar o spinner centralizado na tela
    if (spinnerLoading) spinnerLoading.classList.remove('hidden');
    
    // Buscar os dados - passa true no segundo parâmetro para usar o cursor quando for append
    const items = await fetchReports(filters, append);
    
    // Esconder o spinner após carregamento
    if (spinnerLoading) spinnerLoading.classList.add('hidden');
        
    if (!items || items.length === 0) {
        if (!append) {
          reportListElement.innerHTML = `
            <div class="alert alert-info">
              Nenhum relatório encontrado com os filtros selecionados.
            </div>
          `;
        } else {
          // Se tentou carregar mais mas não encontrou, mostra mensagem
          const noMoreEl = document.createElement('div');
          noMoreEl.className = 'alert alert-info mt-3';
          noMoreEl.innerHTML = 'Não há mais relatórios para exibir.';
          reportListElement.appendChild(noMoreEl);
        }
        
        // Se não encontrou itens durante um append ou cursor é null, esconde o botão "Ver mais"
        loadMoreButton.style.display = 'none';
        return;
    }

    // ✅ se for "append", não zera a lista
    if (!append) {
        todosRelatorios = []; // limpa o acumulador apenas se for renderização inicial
        reportListElement.innerHTML = ''; // limpa a tela
    }

    todosRelatorios = [...todosRelatorios, ...items]; // acumula os novos
    
    items.forEach(report => {
        const statusText = report.column_values.find(col => col.id === "status8")?.text || '';
        const dateValue = report.column_values.find(col => col.id === "data")?.value;
        const personValue = report.column_values.find(col => col.id === "person")?.value || 
                            report.column_values.find(col => col.id === "pessoas1")?.value;

        // Status
        let statusBadge = '<span class="badge bg-secondary">Indefinido</span>';
        const statusMap = {
            'Feito': '<span class="badge bg-success">Feito</span>',
            'Pendente': '<span class="badge bg-danger">Pendente</span>',
            'Em andamento': '<span class="badge bg-warning text-dark">Em andamento</span>',
            'Em análise': '<span class="badge bg-info text-dark">Em análise</span>',
            'Não iniciado': '<span class="badge bg-secondary">Não iniciado</span>',
            'CANCELADO': '<span class="badge bg-dark">Cancelado</span>'
        };
            
        if (statusText && statusMap[statusText]) {
            statusBadge = statusMap[statusText];
        }

        // Data
        let formattedDate = 'N/A';
        if (dateValue) {
            try {
            const dateObj = JSON.parse(dateValue);
            if (dateObj.date) {
                const date = new Date(dateObj.date);
                formattedDate = date.toLocaleDateString('pt-BR');
            }
            } catch (e) {
            const raw = dateValue.replace(/"/g, '');
            const date = new Date(raw);
            if (!isNaN(date)) formattedDate = date.toLocaleDateString('pt-BR');
            }
        }

        // Responsável
        let responsible = 'N/A';
        const personColumn = report.column_values.find(col => col.id === "person" || col.id === "pessoas1");
        if (personColumn?.text) {
            responsible = personColumn.text;
        } else {
            try {
            const obj = JSON.parse(personValue);
            if (obj.personsAndTeams?.length > 0) {
                responsible = obj.personsAndTeams[0].text || `ID: ${obj.personsAndTeams[0].id}`;
            }
            } catch {
            if (typeof personValue === "string") responsible = personValue.replace(/"/g, '');
            }
        }

        // Setor
        let setor = 'N/A';
        const setorColumn = report.column_values.find(col => col.id === "setor5");
        if (setorColumn?.text) {
            setor = setorColumn.text;
        } else {
            try {
            const obj = JSON.parse(personValue);
            if (obj.personsAndTeams?.length > 0) {
                setor = obj.personsAndTeams[0].text
            }
            } catch {
            if (typeof personValue === "string") setor = personValue.replace(/"/g, '');
            }
        }

        // Data de criação
        let dataCriacao = 'N/A';
        const dataCriacaoColumn = report.column_values.find(col => col.id === "log_de_cria__o");
        if (dataCriacaoColumn?.text) {
            dataCriacao = dataCriacaoColumn.text;
        } else {
            try {
            const obj = JSON.parse(personValue);
            if (obj.personsAndTeams?.length > 0) {
                dataCriacao = obj.personsAndTeams[0].text
            }
            } catch {
            if (typeof personValue === "string") dataCriacao = personValue.replace(/"/g, '');
            }
        }

        // Origem
        let origemBadge = '';
        const origemColumn = report.column_values.find(col => col.id === "status3");
        if (origemColumn?.text) {
            const origemText = origemColumn.text;
            const origemMap = {
                'RECEBIMENTO': '<span class="badge bg-primary">RECEBIMENTO</span>',
                'GARANTIA': '<span class="badge bg-success">GARANTIA</span>',
                'INSPEÇÃO': '<span class="badge bg-info">INSPEÇÃO</span>',
                'PROCESSO': '<span class="badge bg-warning text-dark">PROCESSO</span>',
                'AUDITORIA INTERNA': '<span class="badge bg-danger">AUDITORIA INTERNA</span>',
                'AUDITORIA EXTERNA': '<span class="badge bg-dark">AUDITORIA EXTERNA</span>',
                'CLIENTE': '<span class="badge bg-secondary">CLIENTE</span>'
            };
            origemBadge = origemMap[origemText] || `<span class="badge bg-light text-dark">${origemText}</span>`;
        }

        const subitemsCount = report.subitems?.length || 0;

        const reportCard = document.createElement('div');
        reportCard.className = 'card mb-3 shadow-sm';
        reportCard.innerHTML = `
            <div class="card-body">
            <div class="row align-items-center">
                <div class="col-auto">
                    <input type="checkbox" class="form-check-input report-checkbox" data-report-id="${report.id}" style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <div class="col-md-9">
                <h5 class="card-title mb-1">${report.name}</h5>
                <div class="d-flex flex-wrap gap-2 mb-2">
                    ${statusBadge}
                    ${origemBadge}
                    <small class="text-muted">Responsável: ${responsible}</small>
                    <small class="text-muted">ID: ${report.id}</small>
                    <small class="text-muted">Setor: ${setor}</small>
                    <small class="text-muted">Dt. criação: ${dataCriacao}</small>
                </div>
                ${subitemsCount > 0 ? `
                    <div class="mt-2">
                    <ul class="list-group">
                        ${report.subitems.map(sub => {
                        const lastUpdate = sub.column_values.find(col => col.id === "_ltima_atualiza__o")?.text || "Sem data";
                        const responsavel = sub.column_values.find(col => col.id === "respons_vel")?.text || "Sem responsável";
                        const statusSubitem = sub.column_values.find(col => col.id === "status")?.text || "Sem status";
                        const previsaoColumn = sub.column_values.find(col => col.id === "previs_o");
                        let previsaoText = "Sem previsão";
                        if (previsaoColumn?.text) {
                            previsaoText = previsaoColumn.text;
                        }
                        return `
                            <li class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="flex-grow-1">${sub.name}</div>
                                <div class="d-flex gap-2 flex-wrap">
                                    <span class="badge bg-light text-secondary small">Previsão: ${previsaoText}</span>
                                    <span class="badge bg-light text-secondary small">Resp: ${responsavel}</span>
                                    <span class="badge bg-light text-secondary small">${statusSubitem}</span>
                                </div>
                            </div>
                            </li>
                        `;
                        }).join('')}
                    </ul>
                    </div>` : ''}
                </div>
                <div class="col-md-2 text-md-end mt-3 mt-md-0">
                <a href="report?id=${report.id}" target="_blank" class="btn btn-primary">
                    <i class="bi bi-file-text me-2"></i>Relatório<i class="bi bi-chevron-right ms-1"></i>
                </a>
                </div>
            </div>
            </div>
        `;

        reportListElement.appendChild(reportCard);

        // Adicionar event listener ao checkbox
        const checkbox = reportCard.querySelector('.report-checkbox');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                selectedReports.add(report.id);
            } else {
                selectedReports.delete(report.id);
            }
            updateSelectionUI();
        });
    });

    loadMoreButton.style.display = hasNextPage() ? 'block' : 'none';
}

loadMoreButton.addEventListener('click', () => {
    renderReports(currentFilters, true); // ✅ append = true
});

function updatePagination() {
    const paginationList = document.querySelector('#pagination ul');
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
    
    if (totalPages <= 1) {
        paginationList.parentElement.classList.add('d-none');
        return;
    }
    
    paginationList.parentElement.classList.remove('d-none');
    
    // Atualizar botões de navegação
    prevPageButton.parentElement.classList.toggle('disabled', currentPage === 1);
    nextPageButton.parentElement.classList.toggle('disabled', currentPage === totalPages);
    
    // Limpar páginas existentes (exceto anterior e próximo)
    const pageItems = paginationList.querySelectorAll('.page-item:not(:first-child):not(:last-child)');
    pageItems.forEach(item => item.remove());
    
    // Inserir páginas entre os botões
    const lastPageItem = nextPageButton.parentElement;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${currentPage === i ? 'active' : ''}`;
        
        const pageLink = document.createElement('button');
        pageLink.className = 'page-link';
        pageLink.textContent = i;
        pageLink.addEventListener('click', () => {
            currentPage = i;
            renderReports();
            updatePagination();
            reportListElement.scrollIntoView({ behavior: 'smooth' });
        });
    
        pageItem.appendChild(pageLink);
        paginationList.insertBefore(pageItem, lastPageItem);
    }
}

// Função utilitária para debounce (limitar a frequência de chamadas de função)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Funções para seleção múltipla
function updateSelectionUI() {
    const count = selectedReports.size;
    selectedCountSpan.textContent = count;
    
    if (count > 0) {
        printSelectedBtn.style.display = 'inline-block';
    } else {
        printSelectedBtn.style.display = 'none';
    }

    // Atualizar texto do botão selecionar todos
    const allCheckboxes = document.querySelectorAll('.report-checkbox');
    const allChecked = allCheckboxes.length > 0 && 
                      Array.from(allCheckboxes).every(cb => cb.checked);
    
    if (allChecked) {
        selectAllBtn.innerHTML = '<i class="bi bi-square"></i> Desmarcar Todos';
    } else {
        selectAllBtn.innerHTML = '<i class="bi bi-check-square"></i> Selecionar Todos';
    }
}

function toggleSelectAll() {
    const allCheckboxes = document.querySelectorAll('.report-checkbox');
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    
    allCheckboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
        const reportId = checkbox.dataset.reportId;
        
        if (checkbox.checked) {
            selectedReports.add(reportId);
        } else {
            selectedReports.delete(reportId);
        }
    });
    
    updateSelectionUI();
}

function printSelectedReports() {
    if (selectedReports.size === 0) {
        alert('Nenhum relatório selecionado.');
        return;
    }

    // Abrir cada relatório em uma nova aba
    selectedReports.forEach(reportId => {
        window.open(`report?id=${reportId}`, '_blank');
    });
}

// Função para exportar relatórios para CSV
function exportToCSV() {
    if (filteredReports.length === 0) {
        alert('Não há relatórios para exportar.');
        return;
    }
    
    // Cabeçalhos do CSV
    let csvContent = 'ID,Nome,Status,Data,Responsável,Setor,Causa Raiz,Ação Corretiva\n';
    
    // Dados dos relatórios
    filteredReports.forEach(report => {
        const statusValue = report.column_values.find(col => col.id === "status")?.value;
        const dateValue = report.column_values.find(col => col.id === "data")?.value;
        const personValue = report.column_values.find(col => col.id === "person")?.value || 
                           report.column_values.find(col => col.id === "pessoas1")?.value;
        const sectorValue = report.column_values.find(col => col.id === "setor5")?.value;
        const causeValue = report.column_values.find(col => col.id === "texto_1")?.value;
        const actionValue = report.column_values.find(col => col.id === "long_text_mkpb8pca")?.value;
        
        // Extrair valores formatados
        let status = 'N/A';
        if (statusValue) {
            try {
                const statusObj = JSON.parse(statusValue);
                const statusMap = {
                    0: "Não iniciado",
                    1: "Em análise",
                    3: "Em andamento",
                    6: "Concluído",
                    7: "Pendente"
                };
                status = statusMap[statusObj.index] || "Outro";
            } catch (e) {
                status = 'Indefinido';
            }
        }
        
        let formattedDate = 'N/A';
        if (dateValue) {
            try {
                const dateObj = JSON.parse(dateValue);
                if (dateObj.date) {
                    formattedDate = dateObj.date;
                }
            } catch (e) {
                if (typeof dateValue === "string") {
                    formattedDate = dateValue.replace(/"/g, '');
                }
            }
        }
        
        let responsible = 'N/A';
        if (personValue) {
            try {
                const personObj = JSON.parse(personValue);
                if (personObj.personsAndTeams && personObj.personsAndTeams.length > 0) {
                    responsible = "ID: " + personObj.personsAndTeams[0].id;
                }
            } catch (e) {
                if (typeof personValue === "string") {
                    responsible = personValue.replace(/"/g, '');
                }
            }
        }
        
        let sector = 'N/A';
        if (sectorValue) {
            try {
                const sectorObj = JSON.parse(sectorValue);
                if (sectorObj.ids) {
                    sector = "Setor " + sectorObj.ids.join(', ');
                }
            } catch (e) {
                if (typeof sectorValue === "string") {
                    sector = sectorValue.replace(/"/g, '');
                }
            }
        }
        
        let cause = 'N/A';
        if (causeValue) {
            try {
                if (typeof causeValue === "string") {
                    cause = causeValue.replace(/"/g, '');
                } else {
                    const causeObj = JSON.parse(causeValue);
                    cause = causeObj.text || 'N/A';
                }
            } catch (e) {
                cause = 'N/A';
            }
        }
        
        let action = 'N/A';
        if (actionValue) {
            try {
                const actionObj = JSON.parse(actionValue);
                action = actionObj.text || 'N/A';
            } catch (e) {
                if (typeof actionValue === "string") {
                    action = actionValue.replace(/"/g, '');
                }
            }
        }
        
        // Escapar campos para CSV
        const escapeCsv = (field) => {
            if (field === null || field === undefined) return '';
            return `"${String(field).replace(/"/g, '""')}"`;
        };
        
        // Adicionar linha ao CSV
        csvContent += [
            escapeCsv(report.id),
            escapeCsv(report.name),
            escapeCsv(status),
            escapeCsv(formattedDate),
            escapeCsv(responsible),
            escapeCsv(sector),
            escapeCsv(cause),
            escapeCsv(action)
        ].join(',') + '\n';
    });
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorios_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Adicionar botão de exportação se não existir
document.addEventListener('DOMContentLoaded', function() {
    const reportHeader = document.querySelector('.col-lg-9 .d-flex.justify-content-between');

    // if (reportHeader && !document.getElementById('exportButton')) {
        // const exportButton = document.createElement('button');
        // exportButton.id = 'exportButton';
        // exportButton.className = 'btn btn-outline-primary btn-sm';
        // exportButton.innerHTML = '<i class="bi bi-download me-1"></i> Exportar CSV';
        // exportButton.addEventListener('click', exportToCSV);
        
        // reportHeader.appendChild(exportButton);
    // }
});