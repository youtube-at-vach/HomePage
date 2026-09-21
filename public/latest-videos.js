(function () {
  const container = document.getElementById('latest-videos-list');
  const updated = document.getElementById('latest-videos-updated');
  if (!container) return;

  function addDescription(parent, value) {
    const text = String(value || '概要欄に説明はありません。');
    const urlPattern = /https?:\/\/[^\s<>"']+/g;
    let cursor = 0;
    for (const match of text.matchAll(urlPattern)) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
      const raw = match[0];
      const url = raw.replace(/[.,、。)）\]}]+$/, '');
      const link = document.createElement('a');
      link.href = url;
      link.textContent = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      parent.append(link);
      parent.append(document.createTextNode(raw.slice(url.length)));
      cursor = match.index + raw.length;
    }
    parent.append(document.createTextNode(text.slice(cursor)));
  }

  function renderVideo(video) {
    if (!/^[\w-]{11}$/.test(video.id)) return null;
    const card = document.createElement('article');
    card.className = 'video-card';
    const link = document.createElement('a');
    link.href = `https://www.youtube.com/watch?v=${video.id}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'video-title-link';
    if (video.thumbnail && /^https:\/\//.test(video.thumbnail)) {
      const image = document.createElement('img');
      image.src = video.thumbnail;
      image.alt = '';
      image.loading = 'lazy';
      image.className = 'video-thumbnail';
      link.append(image);
    }
    const title = document.createElement('h3');
    title.textContent = video.title;
    link.append(title);
    card.append(link);

    const date = document.createElement('p');
    date.className = 'video-date';
    const published = new Date(video.publishedAt);
    date.textContent = Number.isNaN(published.getTime()) ? '' : published.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' }) + ' 公開';
    card.append(date);

    const details = document.createElement('details');
    details.className = 'video-description';
    const summary = document.createElement('summary');
    summary.textContent = '概要欄を読む';
    details.append(summary);
    const description = document.createElement('p');
    addDescription(description, video.description);
    details.append(description);
    card.append(details);
    return card;
  }

  fetch('data/latestVideos.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data.videos) || !data.videos.length) throw new Error('動画データが空です');
      const fetched = new Date(data.fetchedAt);
      if (updated && !Number.isNaN(fetched.getTime())) {
        updated.textContent = `YouTube情報の最終取得: ${fetched.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;
      }
      container.replaceChildren();
      data.videos.forEach(video => {
        const card = renderVideo(video);
        if (card) container.append(card);
      });
      if (!container.children.length) throw new Error('有効な動画データがありません');
    })
    .catch(() => {
      container.replaceChildren();
      const message = document.createElement('p');
      message.textContent = '動画情報を取得できませんでした。最新情報はYouTubeチャンネルをご覧ください。';
      container.append(message);
    });
})();
