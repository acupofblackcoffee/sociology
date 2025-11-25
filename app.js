const DATA_PATH = {
    // バージョン02のJSONファイルを参照します
    main: 'data/main_data.json',
    taxonomy: 'data/taxonomy.json',
    references: 'data/references.json'
};

let state = {
    mainData: [],
    taxonomy: {},
    references: {},
    // フィルタ状態に fields を追加
    filters: { eras: [], countries: [], topics: [], fields: [] }
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupHamburgerMenu();

    // 現在のページによって処理を分岐
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
    } catch (e) {
        console.error("Data Load Error:", e);
        alert("データの読み込みに失敗しました。ファイル名()を確認してください。");
    }
}

/* --- ハンバーガーメニュー制御 --- */
function setupHamburgerMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if(!toggle) return; // 記事ページ等でボタンがない場合は無視

    const closeMenu = () => {
        sidebar.classList.remove('active');
    };

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    if(overlay) overlay.addEventListener('click', closeMenu);
}

/* --- Index Page Logic --- */
function initIndexPage() {
    renderFilters();
    renderTimeline();

    // URLパラメータからフィルタ初期値を設定 (紹介ページからの遷移用)
    const params = new URLSearchParams(window.location.search);
    if(params.has('country')) updateFilterState('countries', params.get('country'), true);
    if(params.has('era')) updateFilterState('eras', params.get('era'), true);
    if(params.has('field')) updateFilterState('fields', params.get('field'), true);
    if(params.has('topic')) updateFilterState('topics', params.get('topic'), true);
    
    // UI上のチェックボックスも同期させる
    syncCheckboxes();

    document.getElementById('reset-filters').addEventListener('click', resetFilters);
}

function updateFilterState(group, value, isChecked) {
    if (isChecked) {
        if(!state.filters[group].includes(value)) state.filters[group].push(value);
    } else {
        state.filters[group] = state.filters[group].filter(item => item !== value);
    }
}

function syncCheckboxes() {
    // state.filtersの内容に合わせてチェックボックスをONにする
    for (const group in state.filters) {
        state.filters[group].forEach(val => {
            const input = document.querySelector(`input[value="${val}"][data-group="${group}"]`);
            if(input) input.checked = true;
        });
    }
    renderTimeline();
}

function renderFilters() {
    // フィルタ項目生成ヘルパー
    const createItem = (id, label, group) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        // ℹ️ボタンのリンク先: intro.html
        div.innerHTML = `
            <label>
                <input type="checkbox" value="${id}" data-group="${group}">
                ${label}
            </label>
            <a href="intro.html?type=${group}&id=${id}" class="info-icon" title="${label}について">ℹ️</a>
        `;
        return div;
    };

    // 1. 年代
    const eraContainer = document.getElementById('filter-eras');
    state.taxonomy.eras.forEach(e => eraContainer.appendChild(createItem(e.id, e.label, 'eras')));

    // 2. 国家
    const countryContainer = document.getElementById('filter-countries');
    state.taxonomy.countries.forEach(c => countryContainer.appendChild(createItem(c.id, c.label, 'countries')));

    // 3. 分野 (Fields)
    const fieldContainer = document.getElementById('filter-fields');
    if(state.taxonomy.fields) {
        state.taxonomy.fields.forEach(f => fieldContainer.appendChild(createItem(f.id, f.label, 'fields')));
    }

    // 4. 論点
    const topicContainer = document.getElementById('filter-topics');
    state.taxonomy.topics.forEach(t => topicContainer.appendChild(createItem(t.id, t.label, 'topics')));

    // イベントリスナー設定
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', (e) => {
            updateFilterState(e.target.dataset.group, e.target.value, e.target.checked);
            renderTimeline();
        });
    });
}

function renderTimeline() {
    const container = document.getElementById('timeline-grid');
    container.innerHTML = '';
    const activeFiltersBar = document.getElementById('active-filters');

    const f = state.filters;
    const filtered = state.mainData.filter(item => {
        // 各フィルタグループ内でOR、グループ間でAND
        // 未選択の場合は全表示(true)
        const matchEra = f.eras.length === 0 || f.eras.includes(item.era_id);
        const matchCountry = f.countries.length === 0 || f.countries.includes(item.country_id);
        const matchField = f.fields.length === 0 || (item.field_tags && item.field_tags.some(tag => f.fields.includes(tag)));
        const matchTopic = f.topics.length === 0 || (item.topic_tags && item.topic_tags.some(tag => f.topics.includes(tag)));
        
        return matchEra && matchCountry && matchField && matchTopic;
    });

    activeFiltersBar.textContent = filtered.length > 0 ? `Displaying ${filtered.length} records` : 'No records found';

    filtered.forEach(item => {
        // ラベル解決
        const countryLabel = state.taxonomy.countries.find(c => c.id === item.country_id)?.label || item.country_id;
        const eraLabel = state.taxonomy.eras.find(e => e.id === item.era_id)?.label || item.era_id;

        // カード生成
        const card = document.createElement('a');
        card.className = 'card';
        if(item.file) card.href = `article.html?id=${item.id}`;
        
        // Termバッジは削除しましたが、スタブ（記事なし）の場合はクリック不可にする
        if(!item.file) {
            card.removeAttribute('href');
            card.style.cursor = 'default';
        }

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

    // パンくずリスト生成 (TOP > 国 > 分野 > タイトル)
    const breadcrumbs = document.getElementById('breadcrumbs');
    const countryLabel = state.taxonomy.countries.find(c => c.id === item.country_id)?.label || 'Unknown';
    // 最初の分野タグを取得して表示に使う
    const fieldId = item.field_tags && item.field_tags.length > 0 ? item.field_tags[0] : null;
    const fieldLabel = fieldId ? (state.taxonomy.fields.find(f => f.id === fieldId)?.label || fieldId) : '';

    let breadcrumbHTML = `<a href="index.html">TOP</a> <span class="crumb-separator">&gt;</span> `;
    breadcrumbHTML += `<a href="index.html?country=${item.country_id}">${countryLabel}</a> <span class="crumb-separator">&gt;</span> `;
    if(fieldLabel) {
        breadcrumbHTML += `<a href="index.html?field=${fieldId}">${fieldLabel}</a> <span class="crumb-separator">&gt;</span> `;
    }
    breadcrumbHTML += `<span>${item.title}</span>`;
    
    breadcrumbs.innerHTML = breadcrumbHTML;

    // 記事読み込み
    try {
        const res = await fetch(`articles/${item.file}`);
        if(res.ok) {
            const text = await res.text();
            let html = marked.parse(text);
            // 自動リンク (リンク先は article.html に変更)
            html = applyAutoLinker(html, item.id);
            document.getElementById('article-content').innerHTML = html;
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
        document.getElementById('intro-title').textContent = data.label;
        document.getElementById('intro-desc').innerHTML = data.description 
            ? marked.parse(data.description) 
            : `<p>${data.label}に関する詳細な解説は準備中です。</p>`;
        
        // フィルタパラメータのマッピング
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
