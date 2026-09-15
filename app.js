// URL da sua planilha CSV publicada na web
const URL_PLANILHA_CSV = 'SUA_URL_DA_PLANILHA_CSV_AQUI';

let dadosEstoque = [];
let modoLojaAtivo = false;

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosPlanilha();
    configurarEventos();
});

function carregarDadosPlanilha() {
    Papa.parse(URL_PLANILHA_CSV, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const linhas = results.data;
            
            // Processa o Link do Grupo VIP na célula L2 (Linha Índice 1, Coluna Índice 11)
            if (linhas.length > 1 && linhas[1][11]) {
                const linkGrupo = linhas[1][11].trim();
                const btnGrupo = document.getElementById('linkGrupoWhatsapp');
                if (btnGrupo && linkGrupo.startsWith('http')) {
                    btnGrupo.href = linkGrupo;
                }
            }

            // Converte cabeçalhos e linhas para o formato de estoque
            if (linhas.length > 0) {
                const headers = linhas[0];
                const registros = linhas.slice(1);
                
                dadosEstoque = registros.map(linha => {
                    let obj = {};
                    headers.forEach((h, i) => {
                        obj[h.trim()] = linha[i] ? linha[i].trim() : '';
                    });
                    return obj;
                });

                renderizarEstoque(dadosEstoque);
                renderizarTicker(dadosEstoque);
            }
        },
        error: (err) => {
            console.error("Erro ao carregar planilha:", err);
        }
    });
}

function renderizarEstoque(lista) {
    const grid = document.getElementById('gridVeiculos');
    if (!grid) return;

    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted">Nenhum veículo encontrado.</div>`;
        return;
    }

    lista.forEach(item => {
        const cardHtml = `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card-vehicle" onclick="abrirDetalhesVeiculo('${item.Placa || ''}')">
                    <div class="img-vehicle-wrapper">
                        <span class="tag-status tag-status-disponivel">Disponível</span>
                        ${item.Novidade === 'SIM' ? '<span class="tag-feature tag-feature-novidade">Novidade</span>' : ''}
                        ${item.Baixou === 'SIM' ? '<span class="tag-feature tag-feature-baixou">Baixou</span>' : ''}
                        ${item.Laudo === 'SIM' ? '<span class="tag-feature tag-feature-laudo">Laudo OK</span>' : ''}
                        <img src="${item.Foto1 || 'https://via.placeholder.com/300x200?text=Sem+Foto'}" class="img-vehicle" alt="${item.Modelo || 'Veículo'}">
                    </div>
                    <div class="card-vehicle-body">
                        <div class="vehicle-title">${item.Modelo || 'Modelo não informado'}</div>
                        <div class="specs-grid">
                            <div class="spec-pill"><span>Ano</span>${item.Ano || '-'}</div>
                            <div class="spec-pill"><span>Km</span>${item.KM || '-'}</div>
                        </div>
                        <div class="price-container">
                            <div>
                                <span class="price-label">Valor</span>
                                <span class="price-value">R$ ${item.Valor || 'N/I'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHtml;
    });
}

function renderizarTicker(lista) {
    const tickerContainer = document.getElementById('tickerNovidades');
    if (!tickerContainer) return;

    const novidades = lista.filter(item => item.Novidade === 'SIM' || item.Baixou === 'SIM');
    if (novidades.length === 0) {
        tickerContainer.innerHTML = `<span class="item-ticker">Confira nosso estoque completo atualizado!</span>`;
        return;
    }

    let html = '';
    novidades.forEach(item => {
        html += `<span class="item-ticker"><i class="bi bi-fire text-warning me-1"></i> ${item.Modelo} - R$ ${item.Valor}</span>`;
    });
    tickerContainer.innerHTML = html;
}

function configurarEventos() {
    const inputBusca = document.getElementById('inputBusca');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = dadosEstoque.filter(item => 
                (item.Modelo && item.Modelo.toLowerCase().includes(termo)) ||
                (item.Marca && item.Marca.toLowerCase().includes(termo)) ||
                (item.Ano && item.Ano.toLowerCase().includes(termo))
            );
            renderizarEstoque(filtrados);
        });
    }

    const btnCopiar = document.getElementById('btnCopiarPost');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
            const areaTexto = document.getElementById('textoGeradoPost');
            areaTexto.select();
            document.execCommand('copy');
            alert('Texto copiado com sucesso!');
        });
    }
}

function abrirDetalhesVeiculo(placa) {
    const item = dadosEstoque.find(v => v.Placa === placa);
    if (!item) return;

    const modalBody = document.getElementById('conteudoDetalhesVeiculo');
    const carouselInner = document.getElementById('carouselInnerFotos');

    if (carouselInner) {
        let fotosHtml = '';
        const fotos = [item.Foto1, item.Foto2, item.Foto3, item.Foto4].filter(f => f && f.length > 0);
        
        if (fotos.length === 0) fotos.push('https://via.placeholder.com/600x400?text=Sem+Foto');

        fotos.forEach((foto, index) => {
            fotosHtml += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${foto}" class="modal-carousel-img d-block w-100" alt="Foto Veículo">
                </div>
            `;
        });
        carouselInner.innerHTML = fotosHtml;
    }

    if (modalBody) {
        modalBody.innerHTML = `
            <h4 class="fw-bold mb-1">${item.Modelo || ''}</h4>
            <p class="text-muted mb-3">${item.Marca || ''} - ${item.Ano || ''}</p>
            <h3 class="text-primary fw-extrabold mb-3">R$ ${item.Valor || 'N/I'}</h3>
            <div class="p-3 bg-light rounded-3 mb-3">
                <div class="row g-2 font-sm">
                    <div class="col-6"><strong>Quilometragem:</strong> ${item.KM || '-'} km</div>
                    <div class="col-6"><strong>Cor:</strong> ${item.Cor || '-'}</div>
                    <div class="col-6"><strong>Cambio:</strong> ${item.Cambio || '-'}</div>
                    <div class="col-6"><strong>Combustível:</strong> ${item.Combustivel || '-'}</div>
                </div>
            </div>
            <a href="https://wa.me/5551986597751?text=Olá Ariel, tenho interesse no veículo: ${item.Modelo} (${item.Ano})" target="_blank" class="btn btn-success w-100 fw-bold py-2">
                <i class="bi bi-whatsapp me-2"></i>Falar com Ariel Coimbra
            </a>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
    modal.show();
}
