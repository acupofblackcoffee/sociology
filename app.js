const DATA_PATH = {
    main: 'data/main_data.json',
    taxonomy: 'data/taxonomy.json',
    references: 'data/references.json'
};

let state = {
    mainData: [],
    taxonomy: {},
    references: {},
    filters: { eras: [], countries: [], topics: [], fields: [] }
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupHamburgerMenu();
    renderSidebarFilters(); 
    
    const breadcrumbs = document.getElementById('breadcrumbs');
    if(breadcrumbs) breadcrumbs.innerHTML = `<a href="index.html">TOP</a>`;

    if (document.body.classList.contains('page-index')) {
        initIndexPage();
    } else if (document.body.classList.contains('page-article')) {
        initArticlePage();
    } else if (document.body.classList.contains('page-intro')) {
        initIntroPage();
    }
});

async function loadAllData() {
    try {
        const [main, tax, refs] = await Promise.all([
            fetch(DATA_PATH.main).then(r => r.json()),
            fetch(DATA_PATH.taxonomy).then(r => r.json()),
            fetch(DATA_PATH.references).then(r => r.json())
        ]);
        state.mainData = main;
        state.taxonomy = tax;
        state.references = refs;
    } catch (e) { console.error("Data Load Error:", e); }
}

function setupHamburgerMenu() {
    const toggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if(!toggle) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('nav-open');
    });

    if(overlay) {
        overlay.addEventListener('click', () => {
            document.body.classList.remove('nav-open');
        });
    }
}

function renderSidebarFilters() {
    const mountPoint = document.getElementById('sidebar-filters-mount');
    if (!mountPoint) return;

    const isIndex = document.body.classList.contains('page-index');

    const createFilterGroup = (label, type, items) => {
        const details = document.createElement('details');
        if (type === 'eras') details.open = true;

        const summary = document.createElement('summary');
        summary.textContent = `${label}`;
        details.appendChild(summary);

        const listDiv = document.createElement('div');
        listDiv.className = 'checkbox-list';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            const introLink = `intro.html?type=${type}&id=${item.id}`;

            if (isIndex) {
                div.innerHTML = `
                    <label>
                        <input type="checkbox" value="${item.id}" data-group="${type}">
                        ${item.label}
                    </label>
                    <a href="${introLink}" class="intro-link-btn" title="解説"><span class="book-icon"></span></a>
                `;
            } else {
                let filterKey = "";
                if(type === 'countries') filterKey = 'country';
                if(type === 'eras') filterKey = 'era';
                if(type === 'fields') filterKey = 'field';
                if(type === 'topics') filterKey = 'topic';

                div.innerHTML = `
                    <a href="index.html?${filterKey}=${item.id}" style="text-decoration:none; color:inherit; font-size:0.9rem; display:block; width:100%;">
                        ${item.label}
                    </a>
                    <a href="${introLink}" class="intro-link-btn" title="解説"><span class="book-icon"></span></a>
                `;
            }
            listDiv.appendChild(div);
        });

        details.appendChild(listDiv);
        return details;
    };

    const wrap = (el) => {
        const g = document.createElement('div');
        g.className = 'filter-group';
        g.appendChild(el);
        return g;
    }

    mountPoint.innerHTML = '';
    mountPoint.appendChild(wrap(createFilterGroup('年代 (Era)', 'eras', state.taxonomy.eras)));
    mountPoint.appendChild(wrap(createFilterGroup('国家 (Country)', 'countries', state.taxonomy.countries)));
    
    if(state.taxonomy.fields) {
        mountPoint.appendChild(wrap(createFilterGroup('分野 (Field)', 'fields', state.taxonomy.fields)));
    }
    mountPoint.appendChild(wrap(createFilterGroup('論点 (Topic)', 'topics', state.taxonomy.topics)));

    if (isIndex) {
        mountPoint.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                updateFilterState(e.target.dataset.group, e.target.value, e.target.checked);
                renderTimeline();
            });
        });
        document.getElementById('reset-filters').addEventListener('click', resetFilters);
    } else {
        document.getElementById('reset-filters').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

function updateBreadcrumbs(item = null, categoryLabel = null) {
    const nav = document.getElementById('breadcrumbs');
    if (!nav) return;

    let html = `<a href="index.html">TOP</a>`;

    if (item) {
        // ラベル解決時にマスタ存在チェックを行う（なければIDを表示せずUnknown等にする）
        const countryObj = state.taxonomy.countries.find(c => c.id === item.country_id);
        const countryLabel = countryObj ? countryObj.label : null; // マスタになければnull

        const fieldId = item.field_tags && item.field_tags.length > 0 ? item.field_tags[0] : null;
        const fieldObj = fieldId ? state.taxonomy.fields.find(f => f.id === fieldId) : null;
        const fieldLabel = fieldObj ? fieldObj.label : null;

        if (countryLabel) {
            html += ` <span class="crumb-separator">/</span> <a href="index.html?country=${item.country_id}">${countryLabel}</a>`;
        }
        if (fieldLabel) {
            html += ` <span class="crumb-separator">/</span> <a href="index.html?field=${fieldId}">${fieldLabel}</a>`;
        }
        html += ` <span class="crumb-separator">/</span> <span>${item.title}</span>`;
    } else if (categoryLabel) {
        html += ` <span class="crumb-separator">/</span> <span>${categoryLabel}</span>`;
    }

    nav.innerHTML = html;
}

function initIndexPage() {
    renderTimeline();

    const params = new URLSearchParams(window.location.search);
    if(params.has('country')) updateFilterState('countries', params.get('country'), true);
    if(params.has('era')) updateFilterState('eras', params.get('era'), true);
    if(params.has('field')) updateFilterState('fields', params.get('field'), true);
    if(params.has('topic')) updateFilterState('topics', params.get('topic'), true);
    
    syncCheckboxes();
}

function updateFilterState(group, value, isChecked) {
    if (isChecked) {
        if(!state.filters[group].includes(value)) state.filters[group].push(value);
    } else {
        state.filters[group] = state.filters[group].filter(item => item !== value);
    }
}

function syncCheckboxes() {
    for (const group in state.filters) {
        state.filters[group].forEach(val => {
            const input = document.querySelector(`input[value="${val}"][data-group="${group}"]`);
            if(input) input.checked = true;
        });
    }
    renderTimeline();
}

function renderTimeline() {
    const container = document.getElementById('timeline-grid');
    if(!container) return;
    container.innerHTML = '';
    const activeFiltersBar = document.getElementById('active-filters');

    const f = state.filters;
    const filtered = state.mainData.filter(item => {
        const matchEra = f.eras.length === 0 || f.eras.includes(item.era_id);
        const matchCountry = f.countries.length === 0 || f.countries.includes(item.country_id);
        const matchField = f.fields.length === 0 || (item.field_tags && item.field_tags.some(tag => f.fields.includes(tag)));
        const matchTopic = f.topics.length === 0 || (item.topic_tags && item.topic_tags.some(tag => f.topics.includes(tag)));
        return matchEra && matchCountry && matchField && matchTopic;
    });

    if(activeFiltersBar) {
        activeFiltersBar.textContent = filtered.length > 0 ? `${filtered.length} items` : 'No items';
    }

    // ★修正ポイント: カード描画時にマスタデータ存在チェックを行う
    filtered.forEach(item => {
        // マスタにない場合は null になる
        const countryObj = state.taxonomy.countries.find(c => c.id === item.country_id);
        const eraObj = state.taxonomy.eras.find(e => e.id === item.era_id);
        
        // マスタにないラベルは表示しない
        const countryLabel = countryObj ? countryObj.label : null;
        const eraLabel = eraObj ? eraObj.label : null;

        const card = document.createElement('a');
        card.className = 'card';
        if(item.file) card.href = `article.html?id=${item.id}`;
        if(!item.file) { card.removeAttribute('href'); card.style.cursor = 'default'; }

        // タグのHTMLを動的に組み立てる（存在するラベルだけ表示）
        let metaHTML = '<div class="card-meta">';
        if (eraLabel) metaHTML += `<span class="tag era">${eraLabel}</span>`;
        if (countryLabel) metaHTML += `<span class="tag country">${countryLabel}</span>`;
        
        // 分野タグも同様にチェック
        if (item.field_tags && state.taxonomy.fields) {
            item.field_tags.forEach(fid => {
                const fObj = state.taxonomy.fields.find(f => f.id === fid);
                if(fObj) {
                    // 分野タグ用のスタイルがあればクラスを追加、なければ汎用タグ
                    metaHTML += `<span class="tag">${fObj.label}</span>`; 
                }
            });
        }
        metaHTML += '</div>';

        card.innerHTML = `
            ${metaHTML}
            <h3 class="card-title">${item.title}</h3>
            <p class="card-summary">${item.summary}</p>
        `;
        container.appendChild(card);
    });
}

function resetFilters() {
    state.filters = { eras: [], countries: [], topics: [], fields: [] };
    document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
    renderTimeline();
    window.history.replaceState({}, '', window.location.pathname);
}

async function initArticlePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const item = state.mainData.find(d => d.id === id);
    if (!item) return;

    updateBreadcrumbs(item);

    try {
        const res = await fetch(`articles/${item.file}`);
        if(res.ok) {
            const text = await res.text();
            let html = marked.parse(text);
            html = applyAutoLinker(html, item.id);
            const contentEl = document.getElementById('article-content');
            contentEl.innerHTML = html;
            processCitations(contentEl);
        }
    } catch(e) { console.error(e); }
}

function applyAutoLinker(html, currentId) {
    const terms = state.mainData.filter(d => d.type === 'term' && d.id !== currentId);
    let newHtml = html;
    terms.forEach(term => {
        const regex = new RegExp(`(${term.title})`, 'i');
        if (regex.test(newHtml)) {
            const replacement = term.file 
                ? `<a href="article.html?id=${term.id}" class="term-link" data-desc="${term.summary}">$1</a>`
                : `<span class="term-stub" data-desc="${term.summary} (未執筆)">$1</span>`;
            newHtml = newHtml.replace(regex, replacement);
        }
    });
    return newHtml;
}

function processCitations(element) {
    const cites = element.querySelectorAll('cite');
    const refList = document.getElementById('references-list');
    const refArea = document.getElementById('references-area');
    
    if (cites.length === 0) return;

    refArea.style.display = 'block';
    refList.innerHTML = '';
    
    cites.forEach((cite, index) => {
        const refId = cite.id;
        const refData = state.references[refId];
        cite.textContent = index + 1;
        if (refData) {
            const li = document.createElement('li');
            li.innerHTML = `
                [${index + 1}] <strong>${refData.author}</strong> (${refData.year}) 
                <em>${refData.title}</em>. 
                ${refData.url ? `<a href="${refData.url}" target="_blank">Link</a>` : ''}
            `;
            refList.appendChild(li);
        }
    });
}

async function initIntroPage() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');

    let labelData = null;
    if (state.taxonomy[type]) {
        labelData = state.taxonomy[type].find(d => d.id === id);
    }
    
    if (labelData) {
        updateBreadcrumbs(null, labelData.label);
        document.getElementById('intro-title').textContent = labelData.label;

        try {
            const res = await fetch(`introductions/${id}.md`);
            
            if(res.ok) {
                const text = await res.text();
                document.getElementById('intro-desc').innerHTML = marked.parse(text);
            } else {
                document.getElementById('intro-desc').innerHTML = `<p>現在、${labelData.label}に関する詳細な解説は準備中です。</p>`;
            }
        } catch(e) {
            document.getElementById('intro-desc').innerHTML = `<p>解説データの読み込みに失敗しました。</p>`;
        }
        
        let filterKey = "";
        if(type === 'countries') filterKey = 'country';
        if(type === 'eras') filterKey = 'era';
        if(type === 'fields') filterKey = 'field';
        if(type === 'topics') filterKey = 'topic';

        document.getElementById('intro-filter-link').href = `index.html?${filterKey}=${id}`;
    } else {
        document.getElementById('intro-title').textContent = "Category Not Found";
    }
}
