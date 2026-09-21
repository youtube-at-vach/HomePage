(function () {
  const $ = id => document.getElementById(id);
  const element = (tag, value, cls) => { const n = document.createElement(tag); if (value != null) n.textContent = value; if (cls) n.className = cls; return n; };
  const labels = { plan: '計画・希望', performed: '実施・進展', completed: '完成・解決', problem: '問題・保留' };
  const validId = id => /^[\w-]{11}$/.test(id);
  let data, selected = 'lna', shown = 40;
  const date = v => v.publishedAt ? v.publishedAt.slice(0, 10) : '公開日未取得';
  function evidence(v) { return v.evidence.filter(e => selected === 'all' || e.projects[selected] >= .5); }
  function matches(v) {
    if (selected !== 'all' && !v.projects.includes(selected)) return false;
    const query = $('memory-search').value.trim().toLocaleLowerCase();
    if (query && ![v.title, v.description, v.searchText].join(' ').toLocaleLowerCase().includes(query)) return false;
    const event = $('memory-event').value;
    return event === 'all' || evidence(v).some(e => e.events[event] >= .8);
  }
  function graph(videos) {
    const root = $('memory-graph'); root.replaceChildren();
    const visible = videos.slice(0, shown).filter(v => v.projects.includes(selected));
    const linked = visible.length <= 12 ? visible : Array.from({ length: 12 }, (_, i) => visible[Math.floor(i * visible.length / 12)]);
    if (selected === 'all' || !linked.length) { root.append(element('p', selected === 'all' ? '左のプロジェクトを選ぶと、関連する動画を結ぶ図を表示します。' : 'この条件の関連動画はまだありません。', 'memory-note')); return; }
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 750 240'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${data.projects[selected]}と関連する動画${linked.length}件の関係図`);
    const center = 105;
    const hub = document.createElementNS(ns, 'circle'); hub.setAttribute('cx', center); hub.setAttribute('cy', 120); hub.setAttribute('r', 44); svg.append(hub);
    const ht = document.createElementNS(ns, 'text'); ht.setAttribute('x', center); ht.setAttribute('y', 125); ht.setAttribute('text-anchor', 'middle'); ht.textContent = data.projects[selected].slice(0, 9); svg.append(ht);
    linked.forEach((v, i) => {
      const col = i % 3, row = Math.floor(i / 3), x = 255 + col * 160, y = 34 + row * 56;
      const line = document.createElementNS(ns, 'line'); for (const [k, val] of Object.entries({ x1: center + 44, y1: 120, x2: x, y2: y })) line.setAttribute(k, val); svg.append(line);
      const link = document.createElementNS(ns, 'a'); link.setAttribute('href', '#video-' + v.id);
      const circle = document.createElementNS(ns, 'circle'); circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', 7);
      const txt = document.createElementNS(ns, 'text'); txt.setAttribute('x', x + 10); txt.setAttribute('y', y + 4); txt.textContent = `${date(v).slice(2, 4)} ${v.title.slice(0, 8)}`;
      const title = document.createElementNS(ns, 'title'); title.textContent = v.title; link.append(title, circle, txt); svg.append(link);
    }); root.append(svg);
  }
  function summary(videos) {
    const root = $('project-summary'); root.replaceChildren();
    if (selected === 'all') { root.append(element('p', 'トピックを選ぶと、動画の進展と計画の記述を時系列で確認できます。')); return; }
    root.append(element('h2', data.projects[selected]));
    const dated = videos.filter(v => v.publishedAt).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    const plans = dated.flatMap(v => evidence(v).filter(e => e.events.plan >= .8).map(e => ({ v, e })));
    const done = dated.flatMap(v => evidence(v).filter(e => e.events.completed >= .8).map(e => ({ v, e })));
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
    const h = element('h3'), a = element('a', v.title); a.href = 'https://www.youtube.com/watch?v=' + v.id; a.target = '_blank'; a.rel = 'noopener noreferrer'; h.append(a); c.append(h);
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
        const time = e.source === 'transcript' ? '&t=' + Math.floor(e.start) + 's' : '';
        const jump = element('a', 'YouTubeの該当箇所を開く'); jump.href = 'https://www.youtube.com/watch?v=' + v.id + time; jump.target = '_blank'; jump.rel = 'noopener noreferrer'; row.append(jump); d.append(row);
      } c.append(d);
    } else if (!v.analyzed) c.append(element('p', '検索対象です。出来事の分類はまだ行っていません。', 'memory-note'));
    return c;
  }
  function render() {
    const selectedVideos = data.videos.filter(v => validId(v.id) && matches(v));
    selectedVideos.sort((a, b) => ((a.publishedAt || '9999').localeCompare(b.publishedAt || '9999')) * ($('memory-order').value === 'asc' ? 1 : -1));
    graph(selectedVideos); summary(selectedVideos);
    $('memory-count').textContent = `${selectedVideos.length}本中 ${Math.min(shown, selectedVideos.length)}本を表示 · 関連判定0.5以上は候補、0.8未満は要確認`;
    $('memory-timeline').replaceChildren(...selectedVideos.slice(0, shown).map(card));
    $('memory-more').hidden = shown >= selectedVideos.length;
  }
  fetch('data/projectMemory.json').then(r => { if (!r.ok) throw Error('data unavailable'); return r.json(); }).then(value => {
    data = value;
    const c = data.coverage;
    $('coverage').textContent = `公開動画 ${c.catalog}本 ／ 公開日あり ${c.dated}本 ／ 字幕取得 ${c.transcripts}本（試行 ${c.captionAttempted}本、取得不可など ${c.captionUnavailable}本）／ Jev解析 ${c.analyzed}本。日付がない動画は時系列の末尾に表示します。`;
    const list = $('project-list'), all = element('button', 'すべての動画'); all.type = 'button'; all.dataset.project = 'all'; list.append(all);
    for (const [key, name] of Object.entries(data.projects)) {
      const count = data.videos.filter(v => v.projects.includes(key)).length;
      const b = element('button', `${name} · ${count}`); b.type = 'button'; b.dataset.project = key; if (key === selected) b.className = 'active'; list.append(b);
    }
    list.addEventListener('click', e => { const b = e.target.closest('button[data-project]'); if (!b) return; selected = b.dataset.project; shown = 40; list.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); render(); });
    for (const id of ['memory-search', 'memory-event', 'memory-order']) $(id).addEventListener(id === 'memory-search' ? 'input' : 'change', () => { shown = 40; render(); });
    $('memory-more').addEventListener('click', () => { shown += 40; render(); }); render();
  }).catch(() => { $('coverage').textContent = 'プロジェクトデータを読み込めませんでした。'; });
})();
