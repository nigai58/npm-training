// フロントエンド（依存なしのバニラ JS）。
// API を叩いて一覧・検索・フィルタ・詳細表示・収集トリガを行う。

const $ = (sel) => document.querySelector(sel);

const filters = {
  search: $('#search'),
  composer: $('#composer'),
  instrument: $('#instrument'),
  tag: $('#tag'),
  source: $('#source'),
  redist: $('#redist'),
};

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function fillSelect(sel, items, labelFn = (x) => x.name, valueFn = (x) => x.name) {
  const current = sel.value;
  sel.innerHTML = '<option value="">すべて</option>';
  for (const it of items) {
    const opt = document.createElement('option');
    opt.value = valueFn(it);
    opt.textContent = it.count != null ? `${labelFn(it)} (${it.count})` : labelFn(it);
    sel.appendChild(opt);
  }
  sel.value = current;
}

async function loadFacets() {
  const f = await api('/api/facets');
  fillSelect(filters.composer, f.composers);
  fillSelect(filters.instrument, f.instruments);
  fillSelect(filters.tag, f.tags);
  fillSelect(filters.source, f.sources, (s) => s.display_name, (s) => s.name);
  renderSyncButtons(f.sources);
}

function queryString() {
  const p = new URLSearchParams();
  if (filters.search.value) p.set('search', filters.search.value);
  if (filters.composer.value) p.set('composer', filters.composer.value);
  if (filters.instrument.value) p.set('instrument', filters.instrument.value);
  if (filters.tag.value) p.set('tag', filters.tag.value);
  if (filters.source.value) p.set('source', filters.source.value);
  if (filters.redist.checked) p.set('redistributable', 'true');
  return p.toString();
}

function licenseBadge(work) {
  const cls = work.redistributable ? 'badge ok' : 'badge link';
  const text = work.redistributable ? '再配布可' : 'リンクのみ';
  return `<span class="${cls}" title="${escapeHtml(work.license || '')}">${text}</span>`;
}

async function loadWorks() {
  const { works } = await api('/api/works?' + queryString());
  $('#count').textContent = `${works.length} 件`;
  $('#empty').classList.toggle('hidden', works.length > 0);

  const ul = $('#works');
  ul.innerHTML = '';
  for (const w of works) {
    const li = document.createElement('li');
    li.className = 'work-card';
    li.innerHTML = `
      <div class="work-main">
        <h3>${escapeHtml(w.title)}</h3>
        <p class="composer">${escapeHtml(w.composer || '作曲者不明')}${w.opus ? ' · ' + escapeHtml(w.opus) : ''}</p>
        <p class="meta">${escapeHtml(w.instrumentation || '')}</p>
        <div class="tags">${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
      <div class="work-side">
        ${licenseBadge(w)}
        <span class="src">${escapeHtml(w.source_label || w.source || '')}</span>
      </div>`;
    li.addEventListener('click', () => openDetail(w.id));
    ul.appendChild(li);
  }
}

async function openDetail(id) {
  const w = await api('/api/works/' + id);
  const files = (w.files || [])
    .map(
      (f) => `
      <li>
        <span class="file-label">${escapeHtml(f.label || f.format)}</span>
        ${f.instrument ? `<span class="tag">${escapeHtml(f.instrument)}</span>` : ''}
        <a href="/api/files/${f.id}" target="_blank" rel="noopener">
          ${f.storage_kind === 'local' ? '開く (PDF)' : '外部リンクで開く ↗'}
        </a>
      </li>`
    )
    .join('');

  $('#detail-body').innerHTML = `
    <h2>${escapeHtml(w.title)}</h2>
    <p class="composer">${escapeHtml(w.composer || '作曲者不明')}${w.opus ? ' · ' + escapeHtml(w.opus) : ''}</p>
    <p class="meta">${escapeHtml(w.instrumentation || '')}${w.year ? ' · ' + w.year : ''}</p>
    <p>${licenseBadge(w)} <span class="license-text">${escapeHtml(w.license || '')}</span></p>
    <p class="src">出典: ${escapeHtml(w.source_label || w.source || '')}
      ${w.source_url ? `· <a href="${escapeAttr(w.source_url)}" target="_blank" rel="noopener">ソースページ ↗</a>` : ''}</p>
    <div class="tags">${(w.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    <h3>譜面ファイル</h3>
    <ul class="files">${files || '<li>ファイルなし</li>'}</ul>`;
  $('#detail').classList.remove('hidden');
}

function renderSyncButtons(sources) {
  const box = $('#sync-buttons');
  box.innerHTML = '';
  // 既知のアダプタ（facets の sources は取り込み済みのみなので固定で出す）
  const known = [
    { name: 'seed', label: 'seed' },
    { name: 'mutopia', label: 'Mutopia' },
    { name: 'imslp', label: 'IMSLP' },
  ];
  for (const s of known) {
    const btn = document.createElement('button');
    btn.className = 'sync-btn';
    btn.textContent = `${s.label} を取り込む`;
    btn.addEventListener('click', () => runSync(s.name));
    box.appendChild(btn);
  }
}

async function runSync(name) {
  const status = $('#sync-status');
  status.textContent = `${name} を収集中...`;
  try {
    const stats = await api(`/api/sources/${name}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: name === 'seed' ? undefined : 15 }),
    });
    status.textContent = `${name}: 新規 ${stats.inserted} / 更新 ${stats.updated}`;
    await loadFacets();
    await loadWorks();
  } catch (err) {
    status.textContent = `${name}: 失敗 (${err.message})`;
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}

// イベント
for (const el of Object.values(filters)) {
  el.addEventListener('input', loadWorks);
  el.addEventListener('change', loadWorks);
}
$('#reset').addEventListener('click', () => {
  filters.search.value = '';
  filters.composer.value = '';
  filters.instrument.value = '';
  filters.tag.value = '';
  filters.source.value = '';
  filters.redist.checked = false;
  loadWorks();
});
$('#detail-close').addEventListener('click', () => $('#detail').classList.add('hidden'));
$('#detail').addEventListener('click', (e) => {
  if (e.target.id === 'detail') $('#detail').classList.add('hidden');
});

// 初期化
loadFacets().then(loadWorks).catch((e) => {
  $('#sync-status').textContent = '初期化エラー: ' + e.message;
});
