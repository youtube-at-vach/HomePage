(function () {
  const $ = id => document.getElementById(id);
  const element = (tag, value, cls) => { const n = document.createElement(tag); if (value != null) n.textContent = value; if (cls) n.className = cls; return n; };
  const labels = { plan: '計画・希望', performed: '実施・進展', completed: '完成・解決', problem: '問題・保留' };
  const validId = id => /^[\w-]{11}$/.test(id);
  let data, selected = 'series:mems', shown = 40, select = () => {};
  const collection = () => data.collections.find(g => g.id === selected);
  const selectionName = () => collection()?.title || data.projects[selected];
  const date = v => v.publishedAt ? v.publishedAt.slice(0, 10) : '公開日未取得';
  const mediaTime = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const query = () => $('memory-search').value.trim().toLocaleLowerCase();
  const videoUrl = (v, seconds) => 'https://www.youtube.com/watch?v=' + v.id + (seconds == null ? '' : '&t=' + Math.floor(seconds) + 's');
  const thumbnailUrl = v => /^https:\/\//.test(v.thumbnail || '') ? v.thumbnail : `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
  const byDate = (a, b) => {
    if (!a.publishedAt) return b.publishedAt ? 1 : 0;
    if (!b.publishedAt) return -1;
    return a.publishedAt.localeCompare(b.publishedAt) * ($('memory-order').value === 'asc' ? 1 : -1);
  };
  function evidence(v) { return v.evidence.filter(e => selected === 'all' || collection() || e.projects[selected] >= .5); }
  function matches(v) {
    if (selected !== 'all' && !(collection() ? v.collections.includes(selected) : v.projects.includes(selected))) return false;
    const q = query();
    if (q && ![v.title, v.description, v.searchText].join(' ').toLocaleLowerCase().includes(q)) return false;
    const event = $('memory-event').value;
    return event === 'all' || evidence(v).some(e => e.events[event] >= .8);
  }
  function graph(videos) {
    const root = $('memory-graph'); root.replaceChildren();
    const visible = videos.slice(0, shown);
    const linked = visible.length <= 12 ? visible : Array.from({ length: 12 }, (_, i) => visible[Math.floor(i * visible.length / 12)]);
    if (selected === 'all' || !linked.length) { root.append(element('p', selected === 'all' ? '左のプロジェクトを選ぶと、関連する動画を結ぶ図を表示します。' : 'この条件の関連動画はまだありません。', 'memory-note')); return; }
    const map = element('div', null, 'memory-map');
    map.append(element('div', selectionName(), 'memory-map-hub'));
    const links = element('div', null, 'memory-map-links');
    linked.forEach(v => {
      const link = element('a', null, 'memory-map-video'); link.href = '#video-' + v.id;
      link.append(element('span', date(v), 'memory-map-date'), element('span', v.title)); links.append(link);
    });
    map.append(links); root.append(map);
    if (visible.length > linked.length) root.append(element('p', `${visible.length}本中${linked.length}本を抜粋。年表には表示中の動画をすべて掲載しています。`, 'memory-note'));
  }
  function summary(videos) {
    const root = $('project-summary'); root.replaceChildren();
    if (selected === 'all') { root.append(element('p', 'トピックを選ぶと、動画の進展と計画の記述を時系列で確認できます。')); return; }
    const group = collection();
    if (group) {
      root.append(element('h2', group.title), element('p', group.description || 'チャンネルが公開しているプレイリストです。'));
      const members = data.videos.filter(v => v.collections.includes(group.id));
      root.append(element('p', `この入口の動画 ${members.length}本 ／ 字幕取得 ${members.filter(v => v.transcript).length}本 ／ Jev解析 ${members.filter(v => v.analyzed).length}本。概要は確認済みの資料に限ります。`, 'memory-note'));
      root.append(element('p', `${videos.length}本が現在の検索条件に一致。プレイリスト内の順番ではなく、公開日順に表示します。`));
      if (group.kind === 'playlist') {
        const link = element('a', 'YouTubeでプレイリストを開く ↗'); link.href = group.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; root.append(link);
      } else if (group.playlistId) {
        const playlist = data.collections.find(g => g.id === group.playlistId);
        if (playlist) { const link = element('a', `関連プレイリスト全体（${playlist.videoIds.length}本）を見る`); link.href = '#'; link.addEventListener('click', e => { e.preventDefault(); select(playlist.id); }); root.append(link); }
      }
      if (group.overview?.length) {
        root.append(element('h3', 'まず読む概要'));
        const overview = element('ol', null, 'memory-overview');
        for (const item of group.overview) {
          const li = element('li');
          li.append(element('p', item.text));
          const refs = element('div', null, 'memory-overview-links');
          for (const ref of item.sources) {
            const video = data.videos.find(v => v.id === ref.id);
            if (!video) continue;
            const link = element('a', `${video.title} · ${mediaTime(ref.start)} ↗`);
            link.href = videoUrl(video, ref.start); link.target = '_blank'; link.rel = 'noopener noreferrer';
            refs.append(link);
          }
          li.append(refs); overview.append(li);
        }
        root.append(overview, element('p', '字幕で確認できた動画の記録を要約しています。プロジェクト全体の現在の完成状態は示しません。', 'memory-note'));
      }
      if (group.milestones?.length) {
        const details = element('details', null, 'memory-summary-details');
        details.append(element('summary', `タイトルからたどる節目（${group.milestones.length}件）`));
        const ul = element('ol'); ul.className = 'memory-milestones';
        for (const item of group.milestones) {
          const v = data.videos.find(x => x.id === item.id);
          if (!v) continue;
          const li = element('li'), a = element('a', `${date(v)}｜${item.caption}`); a.href = '#video-' + v.id;
          li.append(a); ul.append(li);
        }
        details.append(ul, element('p', '節目の見出しは動画タイトルに基づきます。試作品の完成とプロジェクト全体の完了は同義ではありません。', 'memory-note'));
        root.append(details);
      }
      if (group.history?.length) {
        const details = element('details', null, 'memory-summary-details');
        details.append(element('summary', `字幕を根拠にしたSTV自作マイク製作史（${group.history.length}件）`));
        details.append(element('p', '構想・回路設計・実装・測定を時系列で整理しました。各リンクは根拠となる字幕の時刻から再生します。', 'memory-note'));
        const history = element('ol', null, 'memory-history');
        for (const item of group.history) {
          const li = element('li', null, 'memory-history-item');
          const source = data.videos.find(v => v.id === item.sources[0]?.id);
          li.append(element('p', source ? date(source) : '日付未取得', 'memory-history-date'));
          li.append(element('h4', item.title), element('p', item.text, 'memory-history-text'));
          const links = element('div', null, 'memory-history-links');
          for (const ref of item.sources) {
            const video = data.videos.find(v => v.id === ref.id);
            if (!video) continue;
            const link = element('a', `${video.title} · 字幕 ${mediaTime(ref.start)} ↗`);
            link.href = videoUrl(video, ref.start); link.target = '_blank'; link.rel = 'noopener noreferrer';
            links.append(link);
          }
          li.append(links); history.append(li);
        }
        details.append(history); root.append(details);
      }
      return;
    }
    root.append(element('h2', data.projects[selected]));
    const ordered = [...videos].sort((a, b) => (a.publishedAt || '9999').localeCompare(b.publishedAt || '9999'));
    const plans = ordered.flatMap(v => evidence(v).filter(e => e.events.plan >= .8).map(e => ({ v, e })));
    const done = ordered.flatMap(v => evidence(v).filter(e => e.events.completed >= .8).map(e => ({ v, e })));
    const p = element('p', `${videos.length}本が関連候補。計画の記述 ${plans.length}件、完成・解決の記述 ${done.length}件。関連判定と出来事判定はいずれも候補であり、対象動画と解析済み区間に限った数字です。`);
    root.append(p);
    if (plans.length) {
      root.append(element('h3', '続報を確認したい計画の記述'));
      const ul = element('ul');
      for (const { v, e } of plans.slice(-5).reverse()) {
        const li = element('li'), link = element('a', `${date(v)} ${e.text.slice(0, 90)}`); link.href = '#video-' + v.id;
        li.append(link); ul.append(li);
      }
      root.append(ul, element('p', '上の計画と完成の記述が同じ作業を指すかは未照合です。続きを原文で確認してください。', 'memory-note'));
    }
  }
  function card(v) {
    const c = element('article', null, 'memory-card'); c.id = 'video-' + v.id;
    const main = element('div', null, 'memory-card-main');
    const thumbnail = element('a', null, 'memory-thumbnail'); thumbnail.href = videoUrl(v); thumbnail.target = '_blank'; thumbnail.rel = 'noopener noreferrer'; thumbnail.setAttribute('aria-label', `${v.title}をYouTubeで開く`);
    const image = element('img'); image.src = thumbnailUrl(v); image.alt = ''; image.width = 320; image.height = 180; image.loading = 'lazy'; image.decoding = 'async';
    const fallback = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
    image.addEventListener('error', () => { if (image.src !== fallback) image.src = fallback; });
    thumbnail.append(image); main.append(thumbnail);
    const content = element('div', null, 'memory-card-content');
    content.append(element('p', `${date(v)} · ${v.transcript ? '字幕取得済み' : '字幕未取得'} · ${v.analyzed ? 'Jev解析済み' : '未解析'}`, 'date'));
    const h = element('h3'), a = element('a', v.title); a.href = videoUrl(v); a.target = '_blank'; a.rel = 'noopener noreferrer'; h.append(a); content.append(h);
    const q = query(), searchAt = q ? (v.searchText || '').toLocaleLowerCase().indexOf(q) : -1;
    const descriptionAt = q ? (v.description || '').toLocaleLowerCase().indexOf(q) : -1;
    if (searchAt >= 0 || descriptionAt >= 0) {
      const offsets = (v.searchOffsets || '').split(';').filter(Boolean).map(pair => pair.split(',').map(Number));
      const hit = searchAt >= 0 ? offsets.findLast(([position]) => position <= searchAt) : null;
      const source = searchAt >= 0 ? v.searchText : v.description;
      const at = searchAt >= 0 ? searchAt : descriptionAt;
      const excerpt = source.slice(Math.max(0, at - 70), Math.min(source.length, at + q.length + 100));
      const box = element('div', null, 'memory-search-hit');
      box.append(element('strong', searchAt >= 0 ? '字幕内の一致箇所' : '概要欄の一致箇所'), element('p', `${at > 70 ? '…' : ''}${excerpt}${at + q.length + 100 < source.length ? '…' : ''}`));
      if (hit) { const jump = element('a', 'この付近から再生'); jump.href = videoUrl(v, hit[1]); jump.target = '_blank'; jump.rel = 'noopener noreferrer'; box.append(jump); }
      content.append(box);
    }
    const tags = element('div', null, 'labels');
    if (collection()) tags.append(element('span', collection().kind === 'series' ? '本編・前史' : '公式プレイリスト', 'collection-tag'));
    for (const key of v.projects) {
      const confidence = Math.max(...v.evidence.map(e => e.projects[key] || 0));
      tags.append(element('span', (data.projects[key] || key) + (confidence < .8 ? ' · 要確認' : '')));
    }
    const ev = evidence(v);
    for (const [key, name] of Object.entries(labels)) if (ev.some(e => e.events[key] >= .8)) tags.append(element('span', name, key));
    content.append(tags); main.append(content); c.append(main);
    if (ev.length) {
      const d = element('details'); d.append(element('summary', `根拠を確認（${ev.length}区間）`));
      for (const e of ev) {
        const row = element('div', null, 'evidence');
        row.append(element('small', `${e.source === 'transcript' ? '字幕 ' + Math.floor(e.start / 60) + '分' : e.source === 'title' ? 'タイトル' : '概要欄'} · 関連候補 ${Object.entries(e.projects).map(([k, s]) => (data.projects[k] || k) + ' ' + s.toFixed(2)).join('、')}`));
        row.append(element('blockquote', e.text));
        const jump = element('a', 'YouTubeの該当箇所を開く'); jump.href = videoUrl(v, e.source === 'transcript' ? e.start : null); jump.target = '_blank'; jump.rel = 'noopener noreferrer'; row.append(jump); d.append(row);
      } c.append(d);
    } else if (!v.analyzed) c.append(element('p', '検索対象です。出来事の分類はまだ行っていません。', 'memory-note'));
    return c;
  }
  function render() {
    const selectedVideos = data.videos.filter(v => validId(v.id) && matches(v));
    selectedVideos.sort(byDate);
    graph(selectedVideos); summary(selectedVideos);
    $('memory-count').textContent = `${selectedVideos.length}本中 ${Math.min(shown, selectedVideos.length)}本を表示 · ${collection() ? 'リスト所属は公式API、出来事タグはJevの候補' : '関連判定0.5以上は候補、0.8未満は要確認'}`;
    $('memory-timeline').replaceChildren(...selectedVideos.slice(0, shown).map(card));
    if (!selectedVideos.length) $('memory-timeline').append(element('p', '該当する動画はありません。プロジェクトや検索語、記述の条件を変えてください。', 'memory-empty'));
    $('memory-more').hidden = shown >= selectedVideos.length;
  }
  fetch('data/projectMemory.json?v=5').then(r => { if (!r.ok) throw Error('data unavailable'); return r.json(); }).then(value => {
    data = value;
    const requested = new URLSearchParams(location.search).get('collection');
    if (requested && data.collections.some(g => g.id === requested)) selected = requested;
    const c = data.coverage;
    $('coverage').textContent = `公開動画 ${c.catalog}本 ／ 公開プレイリスト ${data.collections.filter(g => g.kind === 'playlist').length}件 ／ 字幕取得 ${c.transcripts}本（試行 ${c.captionAttempted}本、取得不可など ${c.captionUnavailable}本）／ Jev解析 ${c.analyzed}本。`;
    const list = $('project-list'), all = element('button', 'すべての動画'); all.type = 'button'; all.dataset.project = 'all'; list.append(all);
    list.append(element('h3', 'シリーズ・プレイリスト', 'memory-nav-title'));
    for (const group of data.collections || []) {
      const b = element('button', `${group.title} · ${group.videoIds.length}`); b.type = 'button'; b.dataset.project = group.id;
      if (group.id === selected) b.className = 'active'; list.append(b);
    }
    const technical = element('details', null, 'memory-technical');
    technical.append(element('summary', 'Jevで見つけた技術トピック'));
    const technicalList = element('div', null, 'memory-technical-list');
    for (const [key, name] of Object.entries(data.projects)) {
      const count = data.videos.filter(v => v.projects.includes(key)).length;
      const b = element('button', `${name} · ${count}`); b.type = 'button'; b.dataset.project = key; if (key === selected) b.className = 'active'; technicalList.append(b);
    }
    technical.append(technicalList); list.append(technical);
    function selectGroup(key) {
      selected = key; shown = 40; if (data.projects[key]) technical.open = true;
      const url = new URL(location.href); if (collection()) url.searchParams.set('collection', key); else url.searchParams.delete('collection');
      history.replaceState(null, '', url);
      list.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.project === key)); render();
    }
    select = selectGroup;
    list.addEventListener('click', e => { const b = e.target.closest('button[data-project]'); if (b) selectGroup(b.dataset.project); });
    $('project-summary').addEventListener('click', e => {
      const link = e.target.closest('a[href^="#video-"]');
      if (!link) return;
      const id = link.getAttribute('href').slice('#video-'.length);
      if ($('video-' + id)) return;
      const position = data.videos.filter(v => validId(v.id) && matches(v)).sort(byDate).findIndex(v => v.id === id);
      if (position < 0) return;
      shown = Math.max(shown, position + 1); render();
      e.preventDefault(); $('video-' + id)?.scrollIntoView();
    });
    for (const id of ['memory-search', 'memory-event', 'memory-order']) $(id).addEventListener(id === 'memory-search' ? 'input' : 'change', () => { shown = 40; render(); });
    $('memory-more').addEventListener('click', () => { shown += 40; render(); }); render();
  }).catch(() => { $('coverage').textContent = 'プロジェクトデータを読み込めませんでした。'; });
})();
