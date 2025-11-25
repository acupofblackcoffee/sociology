/**
 * Sociology Chronicle - Main Logic
 */

const DATA_PATH = {
    main: 'data/main_data.json',
    taxonomy: 'data/taxonomy.json',
    references: 'data/references.json'
};

// Global State
let state = {
    mainData: [],
    taxonomy: {},
    references: {},
    filters: {
        eras: [],
        countries: [],
        topics: []
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();

    if (document.body.classList.contains('page-index')) {
        initIndexPage();
    } else if (document.body.classList.contains('page-article')) {
        initArticlePage();
    }
});

async function loadAllData() {
    try {
        const [main, tax, refs] = await Promise.all([
            fetch(DATA_PATH.main).then(res => res.json()),
            fetch(DATA_PATH.taxonomy).then(res => res.json()),
            fetch(DATA_PATH.references).then(res => res.json())
        ]);
        state.mainData = main;
        state.taxonomy = tax;
        state.references = refs;
    } catch (error) {
        console.error('Data loading failed:', error);
        alert('データの読み込みに失敗しました。JSONファイルの配置を確認してください。');
    }
}

/* =========================================
   Index Page Logic (Filtering & Timeline)
   ========================================= */
function initIndexPage() {
    renderFilters();
    renderTimeline();

    // Event Listener for Reset
    document.getElementById('reset-filters').addEventListener('click', () => {
        state.filters = { eras: [], countries: [], topics: [] };
        // Uncheck all boxes
        document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
        renderTimeline();
    });
}

function renderFilters() {
    const createCheckbox = (id, label, group) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <label>
                <input type="checkbox" value="${id}" data-group="${group}">
                ${label}
            </label>
        `;
        return div;
    };

    const eraContainer = document.getElementById('filter-eras');
    state.taxonomy.eras.forEach(era => {
        eraContainer.appendChild(createCheckbox(era.id, era.label, 'eras'));
    });

    const countryContainer = document.getElementById('filter-countries');
    state.taxonomy.countries.forEach(country => {
        countryContainer.appendChild(createCheckbox(country.id, country.label, 'countries'));
    });

    const topicContainer = document.getElementById('filter-topics');
    state.taxonomy.topics.forEach(topic => {
        topicContainer.appendChild(createCheckbox(topic, topic, 'topics')); // topic is simple string
    });

    // Add change listeners
    document.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const group = e.target.dataset.group;
            const value = e.target.value;
            
            if (e.target.checked) {
                state.filters[group].push(value);
            } else {
                state.filters[group] = state.filters[group].filter(item => item !== value);
            }
            renderTimeline();
        });
    });
}

function renderTimeline() {
    const container = document.getElementById('timeline-grid');
    const activeFiltersBar = document.getElementById('active-filters');
    container.innerHTML = '';
    
    // 1. Filtering Logic (AND search within groups, OR is implied for simplicity unless specified otherwise, but request said "AND search")
    // Let's implement: Matches ANY in era AND ANY in country... (Standard e-commerce filter)
    const filtered = state.mainData.filter(item => {
        const matchEra = state.filters.eras.length === 0 || state.filters.eras.includes(item.era_id);
        const matchCountry = state.filters.countries.length === 0 || state.filters.countries.includes(item.country_id);
        
        // Topic logic: Item must have AT LEAST ONE of the selected topics (if topics selected)
        // Or strict AND? "AND search" in prompt usually means Era AND Country AND Topic.
        // For topics, let's say if I select "Rationalization", show items with that tag.
        const matchTopic = state.filters.topics.length === 0 || 
                           (item.topic_tags && item.topic_tags.some(t => state.filters.topics.includes(t)));

        return matchEra && matchCountry && matchTopic;
    });

    // Update Active Filters UI
    const allSelected = [...state.filters.eras, ...state.filters.countries, ...state.filters.topics];
    activeFiltersBar.innerHTML = allSelected.length > 0 
        ? `Active Filters: ${allSelected.map(f => `<span class="active-tag">${f}</span>`).join('')}` 
        : 'Displaying all records';

    // 2. Render Cards
    filtered.forEach(item => {
        // Resolve labels
        const eraLabel = state.taxonomy.eras.find(e => e.id === item.era_id)?.label || item.era_id;
        const countryLabel = state.taxonomy.countries.find(c => c.id === item.country_id)?.label || item.country_id;
        
        // Link handling: If file exists, link to article. If null (stub), no link (or dummy).
        const href = item.file ? `article.html?id=${item.id}` : '#';
        const stubClass = item.file ? '' : 'style="opacity: 0.6; cursor: default;"';
        
        const card = document.createElement('a');
        card.className = 'card';
        if (item.file) card.href = href;
        
        card.innerHTML = `
            <div class="card-meta">
                <span class="tag era">${eraLabel}</span>
                <span class="tag country">${countryLabel}</span>
                ${item.type === 'term' ? '<span class="tag">Term</span>' : ''}
            </div>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-summary">${item.summary}</p>
        `;
        container.appendChild(card);
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<p>No results found matching your filters.</p>';
    }
}


/* =========================================
   Article Page Logic (Markdown & Auto-Linker)
   ========================================= */
async function initArticlePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const item = state.mainData.find(d => d.id === id);

    if (!item || !item.file) {
        document.getElementById('article-content').innerHTML = '<p>Article not found or unavailable.</p>';
        return;
    }

    // 1. Fetch Markdown
    try {
        const response = await fetch(`articles/${item.file}`);
        if (!response.ok) throw new Error('File load error');
        const text = await response.text();

        // 2. Convert to HTML
        let html = marked.parse(text);

        // 3. Auto-Linker (Term Injection)
        html = applyAutoLinker(html, item.id); // pass current ID to avoid self-linking

        // 4. Render
        const contentEl = document.getElementById('article-content');
        contentEl.innerHTML = html;

        // 5. Process Citations
        processCitations(contentEl);

    } catch (e) {
        document.getElementById('article-content').innerHTML = '<p>Error loading article content.</p>';
        console.error(e);
    }
}

function applyAutoLinker(html, currentId) {
    // Sort terms by length (desc) to avoid partial matches replacing parts of longer terms
    // e.g. "Rationalization" should be matched before "Rational"
    const terms = state.mainData
        .filter(d => d.type === 'term' && d.id !== currentId) // Don't link self
        .sort((a, b) => b.title.length - a.title.length);

    let newHtml = html;

    terms.forEach(term => {
        // Regex to match term, Case Insensitive
        // We use a simplified regex that replaces the FIRST occurrence.
        // Note: In a production app, we must ensure we aren't replacing text inside existing HTML tags (href attributes etc).
        // For this MVP, we assume terms are unique enough or simplistic text replacement.
        
        const regex = new RegExp(`(${escapeRegExp(term.title)})`, 'i');
        
        // Check if exists
        if (regex.test(newHtml)) {
            // Determine replacement HTML
            let replacement = '';
            if (term.file) {
                // Link
                replacement = `<a href="article.html?id=${term.id}" class="term-link" data-desc="${term.summary}">$1</a>`;
            } else {
                // Stub
                replacement = `<span class="term-stub" data-desc="${term.summary} (未執筆)">$1</span>`;
            }
            
            // Replace ONLY the first occurrence
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
    
    cites.forEach((cite, index) => {
        const refId = cite.id;
        const refData = state.references[refId];
        
        // Add number to cite in text
        cite.textContent = index + 1;
        
        // Add to list
        if (refData) {
            const li = document.createElement('li');
            li.innerHTML = `
                [${index + 1}] <strong>${refData.author}</strong> (${refData.year}) 
                <em>${refData.title}</em>. 
                ${refData.url ? `<a href="${refData.url}" target="_blank">Link</a>` : ''}
            `;
            refList.appendChild(li);
            
            // Tooltip for cite
            cite.title = `${refData.author} (${refData.year})`;
        } else {
            console.warn(`Reference not found: ${refId}`);
        }
    });
}

// Utility
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
