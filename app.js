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
    
    // 全ページ共通: サイドバーのフィルタ生成
    renderSidebarFilters(); 

    // 全ページ共通: パンくずリスト生成（初期状態）
    updateBreadcrumbs();

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
    } catch (e) { console.error(e); }
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

/* --- 全ページ共通: サイドバーのフィルタ描画 --- */
function renderSidebarFilters() {
    const mountPoint = document.getElementById('sidebar-filters-mount');
    if (!mountPoint) return;

    // 現在がトップページかどうか判定
    const isIndex = document.body.classList.contains('page-index');

    // フィルタグループを生成する関数
    const createFilterGroup = (label, type, items) => {
        const details = document.createElement('details');
        // 初期状態は開いておく（お好みで）
        if (type === 'eras') details.open = true;

        const summary = document.createElement('summary');
        summary.textContent = `${label}`;
        details.appendChild(summary);

        const listDiv = document.createElement('div');
        listDiv.className = 'checkbox-list';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';

            if (isIndex) {
                // --- トップページの場合: チェックボックスを表示 ---
                div.innerHTML = `
                    <label>
                        <input type="checkbox" value="${item.id}" data-group="${type}">
                        ${item.label}
                    </label>
                    <a href="intro.html?type=${type}&id=${item.id}" class="intro-link-btn" title="解説"><span class="book-icon"></span></a>
                `;
            } else {
                // --- 他のページの場合: リンクを表示 (クリックでトップへ検索遷移) ---
                let filterKey = "";
                if(type === 'countries') filterKey = 'country';
                if(type === 'eras') filterKey = 'era';
                if(type === 'fields') filterKey = 'field';
                if(type === 'topics') filterKey = 'topic';

                div.innerHTML = `
                    <a href="index.html?${filterKey}=${item.id}" style="text-decoration:none; color:inherit; font-size:0.9rem; display:block; width:100%;">
                        ${item.label}
                    </a>
                    <a href="intro.html?type=${type}&id=${item.id}" class="intro-link-btn" title="解説"><span class="book-icon"></span></a>
                `;
            }
            listDiv.appendChild(div);
        });

        details.appendChild(listDiv);
        return details; // <div class="filter-group">で囲む場合は修正
    };

    // グループ作成 & 追加
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

    // イベントリスナー (トップページのみ)
    if (isIndex) {
        mountPoint.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', (e) => {
                updateFilterState(e.target.dataset.group, e.target.value, e.target.checked);
                renderTimeline();
            });
        });
        document.getElementById('reset-filters').addEventListener('click', resetFilters);
    } else {
        // 他のページではリセットボタンを押したらトップへ
        document.getElementById('reset-filters').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}


/* --- 共通: パンくずリスト更新 --- */
function updateBreadcrumbs(item = null) {
    const nav = document.getElementById('breadcrumbs');
    if (!nav) return;

    let html = `<a href="index.html">TOP</a>`;

    if (item) {
        // 記事ページなどの場合
        const countryLabel = state.taxonomy.countries.find(c => c.id === item.country_id)?.label || 'Unknown';
        const fieldId = item.field_tags && item.field_tags.length > 0 ? item.field_tags[0] : null;
        const fieldLabel = fieldId ? (state.taxonomy.fields.find(f => f.id === fieldId)?.label || fieldId) : '';

        html += ` <span class="crumb-separator">&gt;</span> <a href="index.html?country=${item.country_id}">${countryLabel}</a>`;
        if (fieldLabel) {
            html += ` <span class="crumb-separator">&gt;</span> <a href="index.html?field=${fieldId}">${fieldLabel}</a>`;
        }
        // タイトルが長い場合は省略するなどCSSで対応
        html += ` <span class="crumb-separator">&gt;</span> <span>${item.title}</span>`;
    } 
    // トップページや特定のフィルタ状態の表示ロジックを入れることも可能

    nav.innerHTML = html;
}


/* --- Index Page Logic --- */
function initIndexPage() {
    renderTimeline(); // 初期表示

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

    filtered.forEach(item => {
        const countryLabel = state.taxonomy.countries.find(c => c.id === item.country_id)?.label || item.country_id;
        const eraLabel = state.taxonomy.eras.find(e => e.id === item.era_id)?.label || item.era_id;

        const card = document.createElement('a');
        card.className = 'card';
        if(item.file) card.href = `article.html?id=${item.id}`;
        if(!item.file) { card.removeAttribute('href'); card.style.cursor = 'default'; }

        card.innerHTML = `
            <div class="card-meta">
                <span class="tag era">${eraLabel}</span>
                <span class="tag country">${countryLabel}</span>
            </div>
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

/* --- Article Page Logic --- */
async function initArticlePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const item = state.mainData.find(d => d.id === id);
    if (!item) return;

    // パンくず更新
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

/* --- Intro Page Logic --- */
function initIntroPage() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');

    let data = null;
    if (state.taxonomy[type]) {
        data = state.taxonomy[type].find(d => d.id === id);
    }
    
    if (data) {
        // パンくず更新 (シンプルに)
        const nav = document.getElementById('breadcrumbs');
        nav.innerHTML = `<a href="index.html">TOP</a> <span class="crumb-separator">&gt;</span> <span>${data.label}</span>`;

        document.getElementById('intro-title').textContent = data.label;
        document.getElementById('intro-desc').innerHTML = data.description 
            ? marked.parse(data.description) 
            : `<p>解説準備中</p>`;
        
        let filterKey = "";
        if(type === 'countries') filterKey = 'country';
        if(type === 'eras') filterKey = 'era';
        if(type === 'fields') filterKey = 'field';
        if(type === 'topics') filterKey = 'topic';

        document.getElementById('intro-filter-link').href = `index.html?${filterKey}=${id}`;
    }
}
