(function () {
  const $ = id => document.getElementById(id);
  const element = (tag, value, cls) => { const n = document.createElement(tag); if (value != null) n.textContent = value; if (cls) n.className = cls; return n; };
  const labels = { plan: '計画・希望', performed: '実施・進展', completed: '完成・解決', problem: '問題・保留' };
  const validId = id => /^[\w-]{11}$/.test(id);
  let data, selected = 'lna', shown = 40;
  const date = v => v.publishedAt ? v.publishedAt.slice(0, 10) : '公開日未取得';
  const query = () => $('memory-search').value.trim().toLocaleLowerCase();
  const videoUrl = (v, seconds) => 'https://www.youtube.com/watch?v=' + v.id + (seconds == null ? '' : '&t=' + Math.floor(seconds) + 's');
  const byDate = (a, b) => {
    if (!a.publishedAt) return b.publishedAt ? 1 : 0;
    if (!b.publishedAt) return -1;
    return a.publishedAt.localeCompare(b.publishedAt) * ($('memory-order').value === 'asc' ? 1 : -1);
  };
  function evidence(v) { return v.evidence.filter(e => selected === 'all' || e.projects[selected] >= .5); }
  function matches(v) {
    if (selected !== 'all' && !v.projects.includes(selected)) return false;
    const q = query();
    if (q && ![v.title, v.description, v.searchText].join(' ').toLocaleLowerCase().includes(q)) return false;
    const event = $('memory-event').value;
    return event === 'all' || evidence(v).some(e => e.events[event] >= .8);
  }
  function graph(videos) {
    const root = $('memory-graph'); root.replaceChildren();
    const visible = videos.slice(0, shown).filter(v => v.projects.includes(selected));
    const linked = visible.length <= 12 ? visible : Array.from({ length: 12 }, (_, i) => visible[Math.floor(i * visible.length / 12)]);
    if (selected === 'all' || !linked.length) { root.append(element('p', selected === 'all' ? '左のプロジェクトを選ぶと、関連する動画を結ぶ図を表示します。' : 'この条件の関連動画はまだありません。', 'memory-note')); return; }
    const map = element('div', null, 'memory-map');
    map.append(element('div', data.projects[selected], 'memory-map-hub'));
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
    root.append(element('h2', data.projects[selected]));
    const ordered = [...videos].sort((a, b) => (a.publishedAt || '9999').localeCompare(b.publishedAt || '9999'));
    const plans = ordered.flatMap(v => evidence(v).filter(e => e.events.plan >= .8).map(e => ({ v, e })));
    const done = ordered.flatMap(v => evidence(v).filter(e => e.events.completed >= .8).map(e => ({ v, e })));
    const p = element('p', `${videos.length}本が関連候補。計画の記述 ${plans.length}件、完成・解決の記述 ${done.length}件。対象動画と字幕の取得・解析範囲に限った数字です。`);
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
    c.append(element('p', `${date(v)} · ${v.transcript ? '字幕取得済み' : '字幕未取得'} · ${v.analyzed ? 'Jev解析済み' : '未解析'}`, 'date'));
    const h = element('h3'), a = element('a', v.title); a.href = videoUrl(v); a.target = '_blank'; a.rel = 'noopener noreferrer'; h.append(a); c.append(h);
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
      c.append(box);
    }
    const tags = element('div', null, 'labels');
    for (const key of v.projects) {
      const confidence = Math.max(...v.evidence.map(e => e.projects[key] || 0));
      tags.append(element('span', (data.projects[key] || key) + (confidence < .8 ? ' · 要確認' : '')));
    }
    const ev = evidence(v);
    for (const [key, name] of Object.entries(labels)) if (ev.some(e => e.events[key] >= .8)) tags.append(element('span', name, key));
    c.append(tags);
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
    $('memory-count').textContent = `${selectedVideos.length}本中 ${Math.min(shown, selectedVideos.length)}本を表示 · 関連判定0.5以上は候補、0.8未満は要確認`;
    $('memory-timeline').replaceChildren(...selectedVideos.slice(0, shown).map(card));
    if (!selectedVideos.length) $('memory-timeline').append(element('p', '該当する動画はありません。プロジェクトや検索語、記述の条件を変えてください。', 'memory-empty'));
    $('memory-more').hidden = shown >= selectedVideos.length;
  }
  fetch('data/projectMemory.json?v=2').then(r => { if (!r.ok) throw Error('data unavailable'); return r.json(); }).then(value => {
    data = value;
    const c = data.coverage;
    $('coverage').textContent = `公開動画 ${c.catalog}本 ／ 公開日あり ${c.dated}本 ／ 字幕取得 ${c.transcripts}本（試行 ${c.captionAttempted}本、取得不可など ${c.captionUnavailable}本）／ Jev解析 ${c.analyzed}本。日付がない動画は時系列の末尾に表示します。`;
    const list = $('project-list'), all = element('button', 'すべての動画'); all.type = 'button'; all.dataset.project = 'all'; list.append(all);
    for (const [key, name] of Object.entries(data.projects)) {
      const count = data.videos.filter(v => v.projects.includes(key)).length;
      const b = element('button', `${name} · ${count}`); b.type = 'button'; b.dataset.project = key; if (key === selected) b.className = 'active'; list.append(b);
    }
    list.addEventListener('click', e => { const b = e.target.closest('button[data-project]'); if (!b) return; selected = b.dataset.project; shown = 40; list.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); render(); });
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
