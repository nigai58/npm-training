// 配布パネル（Phase 2）のフロントロジック。
// 合奏団・メンバー管理と譜面配布を行う。

const $ = (s) => document.querySelector(s);
const DISTRIBUTOR_ROLES = ['conductor', 'part_leader'];
const ROLE_LABEL = { conductor: '指揮者', part_leader: 'パートリーダー', member: '団員' };

let currentEnsemble = null;
let members = [];

async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API ${res.status}`);
  return body;
}
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadEnsembles(selectId) {
  const { ensembles } = await api('/api/ensembles');
  const sel = $('#ensemble-select');
  sel.innerHTML = '<option value="">-- 選択 --</option>';
  for (const e of ensembles) {
    const o = document.createElement('option');
    o.value = e.id;
    o.textContent = `${e.name} (${e.member_count}人)`;
    sel.appendChild(o);
  }
  if (selectId) sel.value = selectId;
}

async function selectEnsemble(id) {
  currentEnsemble = id ? Number(id) : null;
  if (!currentEnsemble) {
    members = [];
    renderMembers();
    renderCompose();
    renderLog();
    renderInbox();
    return;
  }
  const { members: ms } = await api(`/api/ensembles/${currentEnsemble}/members`);
  members = ms;
  renderMembers();
  renderCompose();
  await renderLog();
  renderInbox();
}

function renderMembers() {
  const ul = $('#members');
  ul.innerHTML = '';
  if (!currentEnsemble) {
    $('#member-hint').textContent = '合奏団を選択または作成してください。';
    return;
  }
  $('#member-hint').textContent = '';
  for (const m of members) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="role role-${m.role}">${ROLE_LABEL[m.role]}</span>
      <span class="m-name">${esc(m.name)}</span>
      <span class="m-inst">${esc(m.instrument || '')}</span>
      <button class="link-btn" data-id="${m.id}">削除</button>`;
    li.querySelector('button').addEventListener('click', () => removeMember(m.id));
    ul.appendChild(li);
  }
}

async function removeMember(id) {
  await fetch(`/api/members/${id}`, { method: 'DELETE' });
  await selectEnsemble(currentEnsemble);
  await loadEnsembles(currentEnsemble);
}

function renderCompose() {
  const sender = $('#d-sender');
  const distributors = members.filter((m) => DISTRIBUTOR_ROLES.includes(m.role));
  sender.innerHTML = distributors.length
    ? distributors.map((m) => `<option value="${m.id}">${esc(m.name)} (${ROLE_LABEL[m.role]})</option>`).join('')
    : '<option value="">指揮者/パートリーダーを追加してください</option>';

  const rec = $('#d-recipients');
  rec.innerHTML = members.length
    ? members
        .map(
          (m) => `<label class="rec"><input type="checkbox" value="${m.id}" />
            ${esc(m.name)} <span class="m-inst">${esc(m.instrument || '')}</span></label>`
        )
        .join('')
    : '<p class="member-hint">メンバーがいません。</p>';

  const inboxSel = $('#inbox-member');
  inboxSel.innerHTML = members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
}

let workChoices = [];
async function searchWorks(term) {
  const q = new URLSearchParams();
  if (term) q.set('search', term);
  q.set('limit', '50');
  const { works } = await api('/api/works?' + q.toString());
  workChoices = works;
  const sel = $('#d-work');
  sel.innerHTML = works
    .map(
      (w) =>
        `<option value="${w.id}" data-redist="${w.redistributable}">${esc(w.composer || '?')} — ${esc(w.title)}</option>`
    )
    .join('');
  updateShareHint();
}

function updateShareHint() {
  const opt = $('#d-work').selectedOptions[0];
  const hint = $('#d-share-hint');
  if (!opt) return (hint.textContent = '');
  const redist = opt.dataset.redist === 'true';
  hint.innerHTML = redist
    ? '<span class="badge ok">再配布可</span> 実ファイルとして共有されます'
    : '<span class="badge link">リンクのみ</span> 外部リンクとして共有されます';
}

async function sendDistribution() {
  const status = $('#d-status');
  try {
    const senderMemberId = Number($('#d-sender').value);
    const workOpt = $('#d-work').selectedOptions[0];
    if (!senderMemberId) throw new Error('送信者を選んでください');
    if (!workOpt) throw new Error('譜面を選んでください');
    const recipientMemberIds = [...$('#d-recipients').querySelectorAll('input:checked')].map((c) => Number(c.value));

    const dist = await api('/api/distributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ensembleId: currentEnsemble,
        workId: Number(workOpt.value),
        senderMemberId,
        recipientMemberIds,
        message: $('#d-message').value || undefined,
      }),
    });
    status.textContent = `配布しました（${dist.share_mode === 'file' ? '実ファイル' : 'リンク'} / ${dist.recipients.length}人）`;
    $('#d-message').value = '';
    $('#d-recipients').querySelectorAll('input:checked').forEach((c) => (c.checked = false));
    await renderLog();
    renderInbox();
  } catch (err) {
    status.textContent = '失敗: ' + err.message;
  }
}

function distItem(d) {
  return `<li>
    <div><strong>${esc(d.work_title)}</strong> <span class="m-inst">${esc(d.composer || '')}</span></div>
    <div class="dist-meta">
      ${d.sender_name ? `${esc(d.sender_name)} →` : ''}
      ${d.recipient_count != null ? `${d.recipient_count}人` : ''}
      <span class="badge ${d.share_mode === 'file' ? 'ok' : 'link'}">${d.share_mode === 'file' ? '実ファイル' : 'リンク'}</span>
      <span class="when">${esc((d.created_at || '').replace('T', ' '))}</span>
    </div>
    ${d.message ? `<div class="dist-msg">${esc(d.message)}</div>` : ''}
  </li>`;
}

async function renderLog() {
  const ul = $('#dist-log');
  if (!currentEnsemble) return (ul.innerHTML = '');
  const { distributions } = await api(`/api/ensembles/${currentEnsemble}/distributions`);
  ul.innerHTML = distributions.length ? distributions.map(distItem).join('') : '<li class="member-hint">配布履歴はまだありません。</li>';
}

function inboxItem(d) {
  const unread = !d.read_at;
  return `<li class="${unread ? 'unread' : ''}">
    <div>
      ${unread ? '<span class="dot" title="未読"></span>' : ''}
      <strong>${esc(d.work_title)}</strong> <span class="m-inst">${esc(d.composer || '')}</span>
    </div>
    <div class="dist-meta">
      ${d.sender_name ? `${esc(d.sender_name)} より` : ''}
      <span class="badge ${d.share_mode === 'file' ? 'ok' : 'link'}">${d.share_mode === 'file' ? '実ファイル' : 'リンク'}</span>
      <span class="when">${esc((d.created_at || '').replace('T', ' '))}</span>
      ${unread ? `<button class="link-btn read-btn" data-dist="${d.id}">既読にする</button>` : '<span class="read-mark">既読</span>'}
    </div>
    ${d.message ? `<div class="dist-msg">${esc(d.message)}</div>` : ''}
  </li>`;
}

async function renderInbox() {
  const sel = $('#inbox-member');
  const ul = $('#inbox');
  if (!sel.value) {
    ul.innerHTML = '';
    $('#inbox-unread').textContent = '';
    renderRecommendations();
    return;
  }
  const { inbox, unread } = await api(`/api/members/${sel.value}/inbox`);
  $('#inbox-unread').textContent = unread ? `未読 ${unread}` : '';
  ul.innerHTML = inbox.length ? inbox.map(inboxItem).join('') : '<li class="member-hint">受信した譜面はありません。</li>';
  ul.querySelectorAll('.read-btn').forEach((b) =>
    b.addEventListener('click', () => markRead(b.dataset.dist))
  );
  renderRecommendations();
}

async function markRead(distId) {
  const memberId = $('#inbox-member').value;
  await api(`/api/distributions/${distId}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId: Number(memberId) }),
  });
  renderInbox();
}

async function renderRecommendations() {
  const ul = $('#recommendations');
  const memberId = $('#inbox-member').value;
  if (!ul) return;
  if (!memberId) return (ul.innerHTML = '');
  const { recommendations } = await api(`/api/members/${memberId}/recommendations`);
  ul.innerHTML = recommendations.length
    ? recommendations
        .map(
          (r) => `<li>
            <span>${esc(r.composer || '?')} — <strong>${esc(r.title)}</strong></span>
            <span class="badge ${r.redistributable ? 'ok' : 'link'}">${r.redistributable ? '再配布可' : 'リンク'}</span>
          </li>`
        )
        .join('')
    : '<li class="member-hint">このメンバーの楽器に合う未配布の譜面はありません。</li>';
}

export function initDistribute() {
  $('#ensemble-add').addEventListener('click', async () => {
    const name = $('#ensemble-name').value.trim();
    if (!name) return;
    try {
      const e = await api('/api/ensembles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      $('#ensemble-name').value = '';
      await loadEnsembles(e.id);
      await selectEnsemble(e.id);
    } catch (err) {
      $('#member-hint').textContent = '合奏団を作成できません: ' + err.message;
    }
  });

  $('#ensemble-select').addEventListener('change', (e) => selectEnsemble(e.target.value));

  $('#member-add').addEventListener('click', async () => {
    if (!currentEnsemble) return ($('#member-hint').textContent = '先に合奏団を選択してください。');
    const name = $('#m-name').value.trim();
    if (!name) return;
    try {
      await api(`/api/ensembles/${currentEnsemble}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          instrument: $('#m-instrument').value || undefined,
          role: $('#m-role').value,
        }),
      });
      $('#m-name').value = '';
      $('#m-instrument').value = '';
      await selectEnsemble(currentEnsemble);
      await loadEnsembles(currentEnsemble);
    } catch (err) {
      $('#member-hint').textContent = '失敗: ' + err.message;
    }
  });

  let timer;
  $('#d-work-search').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => searchWorks(e.target.value), 200);
  });
  $('#d-work').addEventListener('change', updateShareHint);
  $('#d-send').addEventListener('click', sendDistribution);
  $('#inbox-member').addEventListener('change', renderInbox);

  // 初期ロード
  loadEnsembles().then(() => searchWorks('')).catch(() => {});
}

/** ログイン状態が変わったとき、所有合奏団リストを読み直す。 */
export async function reloadDistribute() {
  try {
    await loadEnsembles();
    await selectEnsemble($('#ensemble-select').value);
  } catch {
    /* noop */
  }
}
