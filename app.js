// INSIRA ABAIXO O SEU LINK DA PLANILHA PUBLICADA COMO CSV DO GOOGLE SHEETS
const URL_PLANILHA_CSV = 'COLE_AQUI_O_LINK_DO_SEU_CSV';

let dadosEstoque = [];
let filtroAtivo = 'todos';
let apenasComMargem = false;

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosPlanilha();
    configurarEventos();
});

function carregarDadosPlanilha() {
    if (!URL_PLANILHA_CSV || URL_PLANILHA_CSV.includes('COLE_AQUI')) {
        console.warn("Aguardando inserção da URL_PLANILHA_CSV válida.");
        return;
    }

    Papa.parse(URL_PLANILHA_CSV, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const linhas = results.data;
            if (!linhas || linhas.length === 0) return;

            // Extração do Link do Grupo VIP na célula L2 (Linha 2 -> índice 1, Coluna L -> índice 11)
            if (linhas.length > 1 && linhas[1][11]) {
                const linkGrupo = linhas[1][11].trim();
                const btnGrupo = document.getElementById('linkGrupoWhatsapp');
                if (btnGrupo && linkGrupo.startsWith('http')) {
                    btnGrupo.href = linkGrupo;
                }
            }

            // Tratamento de cabeçalho e linhas de veículos
            const headers = linhas[0].map(h => h.trim());
            const registros = linhas.slice(1);
            
            dadosEstoque = registros.map(linha => {
                let obj = {};
                headers.forEach((h, i) => {
                    obj[h] = linha[i] ? linha[i].trim() : '';
                });
                return obj;
            }).filter(item => item.Modelo && item.Modelo.length > 0);

            aplicarFiltrosEOrdenacao();
            renderizarTicker(dadosEstoque);
        },
        error: (err) => {
            console.error("Erro ao carregar os dados do estoque via PapaParse:", err);
        }
    });
}

function renderizarEstoque(lista) {
    const grid = document.getElementById('gridVeiculos');
    if (!grid) return;

    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted fw-semibold">Nenhum veículo encontrado no estoque no momento.</div>`;
        return;
    }

    lista.forEach(item => {
        const fotoPrincipal = item.Foto1 || item.Foto || 'https://via.placeholder.com/400x300?text=Sem+Foto';
        
        const cardHtml = `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card-vehicle" onclick="abrirDetalhesVeiculo('${item.Placa || ''}')">
                    <div class="img-vehicle-wrapper">
                        <span class="tag-status tag-status-disponivel">${item.Status || 'Disponível'}</span>
                        ${item.Novidade === 'SIM' ? '<span class="tag-feature tag-feature-novidade">Novidade</span>' : ''}
                        ${item.Baixou === 'SIM' ? '<span class="tag-feature tag-feature-baixou">Baixou</span>' : ''}
                        ${item.Laudo === 'SIM' ? '<span class="tag-feature tag-feature-laudo">Laudo OK</span>' : ''}
                        <img src="${fotoPrincipal}" class="img-vehicle" alt="${item.Modelo}">
                    </div>
                    <div class="card-vehicle-body">
                        <div class="vehicle-title">${item.Modelo}</div>
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

    const destaques = lista.filter(item => item.Novidade === 'SIM' || item.Baixou === 'SIM');
    const baseLista = destaques.length > 0 ? destaques : lista;

    if (baseLista.length === 0) {
        tickerContainer.innerHTML = `<span class="item-ticker"><i class="bi bi-star-fill text-warning me-1"></i> Confira o estoque de ofertas Unidas Atacado!</span>`;
        return;
    }

    let html = '';
    baseLista.forEach(item => {
        html += `<span class="item-ticker"><i class="bi bi-fire text-warning me-1"></i> ${item.Modelo} ${item.Ano ? '('+item.Ano+')' : ''} - R$ ${item.Valor}</span>`;
    });
    tickerContainer.innerHTML = html;
}

function aplicarFiltrosEOrdenacao() {
    let resultado = [...dadosEstoque];

    // Busca por Texto
    const termo = document.getElementById('inputBusca')?.value.toLowerCase() || '';
    if (termo) {
        resultado = resultado.filter(item => 
            (item.Modelo && item.Modelo.toLowerCase().includes(termo)) ||
            (item.Marca && item.Marca.toLowerCase().includes(termo)) ||
            (item.Ano && item.Ano.toLowerCase().includes(termo)) ||
            (item.Placa && item.Placa.toLowerCase().includes(termo))
        );
    }

    // Carroceria
    const carroceria = document.getElementById('selectCarroceria')?.value || 'todas';
    if (carroceria !== 'todas') {
        resultado = resultado.filter(item => item.Carroceria === carroceria);
    }

    // Pills de Categoria
    if (filtroAtivo === 'novidade') resultado = resultado.filter(item => item.Novidade === 'SIM');
    if (filtroAtivo === 'baixou') resultado = resultado.filter(item => item.Baixou === 'SIM');
    if (filtroAtivo === 'laudo') resultado = resultado.filter(item => item.Laudo === 'SIM');
    if (apenasComMargem) resultado = resultado.filter(item => item.Margem && parseFloat(item.Margem) > 0);

    // Ordenação
    const ordenacao = document.getElementById('selectOrdenacao')?.value || 'padrao';
    if (ordenacao === 'menor-preco') {
        resultado.sort((a, b) => (parseFloat(a.Valor.replace(/\./g,'').replace(',','.')) || 0) - (parseFloat(b.Valor.replace(/\./g,'').replace(',','.')) || 0));
    } else if (ordenacao === 'maior-preco') {
        resultado.sort((a, b) => (parseFloat(b.Valor.replace(/\./g,'').replace(',','.')) || 0) - (parseFloat(a.Valor.replace(/\./g,'').replace(',','.')) || 0));
    } else if (ordenacao === 'maior-margem') {
        resultado.sort((a, b) => (parseFloat(b.Margem) || 0) - (parseFloat(a.Margem) || 0));
    }

    renderizarEstoque(resultado);
}

function configurarEventos() {
    document.getElementById('inputBusca')?.addEventListener('input', aplicarFiltrosEOrdenacao);
    document.getElementById('selectOrdenacao')?.addEventListener('change', aplicarFiltrosEOrdenacao);
    document.getElementById('selectCarroceria')?.addEventListener('change', aplicarFiltrosEOrdenacao);

    const btnMargem = document.getElementById('btnFiltroMargem');
    if (btnMargem) {
        btnMargem.addEventListener('click', () => {
            apenasComMargem = !apenasComMargem;
            btnMargem.classList.toggle('active-margem', apenasComMargem);
            aplicarFiltrosEOrdenacao();
        });
    }

    const pills = document.querySelectorAll('.btn-filter-pill:not(#btnFiltroMargem)');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            filtroAtivo = e.target.getAttribute('data-filtro') || 'todos';
            aplicarFiltrosEOrdenacao();
        });
    });

    document.getElementById('btnCopiarPost')?.addEventListener('click', () => {
        const areaTexto = document.getElementById('textoGeradoPost');
        if (areaTexto) {
            areaTexto.select();
            document.execCommand('copy');
            alert('Oferta copiada com sucesso!');
        }
    });
}

function abrirDetalhesVeiculo(placa) {
    const item = dadosEstoque.find(v => v.Placa === placa);
    if (!item) return;

    const modalBody = document.getElementById('conteudoDetalhesVeiculo');
    const carouselInner = document.getElementById('carouselInnerFotos');

    if (carouselInner) {
        let fotosHtml = '';
        const fotos = [item.Foto1, item.Foto2, item.Foto3, item.Foto4, item.Foto5].filter(f => f && f.length > 5);
        
        if (fotos.length === 0) fotos.push('https://via.placeholder.com/600x400?text=Sem+Foto');

        fotos.forEach((foto, index) => {
            fotosHtml += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${foto}" class="modal-carousel-img d-block w-100" alt="Foto ${item.Modelo}">
                </div>
            `;
        });
        carouselInner.innerHTML = fotosHtml;
    }

    if (modalBody) {
        modalBody.innerHTML = `
            <h4 class="fw-bold mb-1">${item.Modelo}</h4>
            <p class="text-muted mb-2">${item.Marca || ''} ${item.Ano ? '• ' + item.Ano : ''}</p>
            <h3 class="text-primary fw-extrabold mb-3">R$ ${item.Valor || 'N/I'}</h3>
            
            <div class="p-3 bg-light rounded-3 mb-3">
                <div class="row g-2 font-sm">
                    <div class="col-6"><strong>Quilometragem:</strong> ${item.KM || '-'} km</div>
                    <div class="col-6"><strong>Combustível:</strong> ${item.Combustivel || '-'}</div>
                    <div class="col-6"><strong>Câmbio:</strong> ${item.Cambio || '-'}</div>
                    <div class="col-6"><strong>Cor:</strong> ${item.Cor || '-'}</div>
                </div>
            </div>

            <div class="p-3 bg-dark text-white rounded-3 mb-3" style="font-size: 0.85rem;">
                <div class="fw-bold text-primary mb-1"><i class="bi bi-geo-alt-fill me-1"></i> Unidas Atacado Porto Alegre</div>
                <div class="text-white-50 mb-2">Av. Sertório, 5686 - Sarandi, Porto Alegre - RS</div>
                <div class="p-2 rounded bg-secondary bg-opacity-25 text-warning fw-semibold mb-0" style="font-size: 0.78rem;">
                    Importante: Ao chegar no pátio, solicite atendimento exclusivo com o vendedor Ariel Coimbra.
                </div>
            </div>

            <a href="https://wa.me/5551986597751?text=Olá Ariel, tenho interesse no veículo: ${encodeURIComponent(item.Modelo)} (${item.Ano || ''})" target="_blank" class="btn btn-success w-100 fw-bold py-2">
                <i class="bi bi-whatsapp me-2"></i>Falar no WhatsApp: (51) 98659-7751
            </a>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('modalDetalhes'));
    modal.show();
}
