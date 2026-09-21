# バーチャ農ちゃんねるの技術サイト

`public/` を Firebase Hosting で配信する静的サイトです。

## YouTube の新着情報

トップページの「最新動画からの情報」は `public/data/latestVideos.json` を読み込みます。`scripts/fetchVideos.js` がチャンネル `@va-ch` の公開動画を新しい順に最大12件取得し、タイトル、公開日、サムネイル、現在の概要欄を保存します。概要欄を編集した場合も、次の取得で反映されます。APIキーは生成時にのみ使い、公開ファイルには含めません。

YouTube Data API v3 を Google Cloud で有効にして、APIキーを環境変数に設定して実行します。チャンネルを変える場合は `YOUTUBE_CHANNEL_HANDLE` を指定できます。Node.js 20 以降が必要です。

```bash
YOUTUBE_API_KEY='（APIキー）' node scripts/fetchVideos.js
firebase emulators:start --only hosting
```

生成結果は `public/data/latestVideos.json` です。取得に失敗したときは既存の JSON を上書きしません。動画が未取得の場合、サイトには YouTube チャンネルへの案内が表示されます。`public/data/videos.json.bak` は2025年時点の古い控えであり、新着表示には使いません。

### 定期更新と公開

`.github/workflows/update-youtube.yml` は毎日 03:17 JST と手動実行で、動画データを取得して Firebase Hosting に公開します。利用するには GitHub リポジトリの Actions secrets に次の2つを登録してください。秘密情報をファイルやコミットに含めないでください。

- `YOUTUBE_API_KEY`: YouTube Data API v3 の APIキー。可能ならこのAPIのみに制限してください。
- `FIREBASE_SERVICE_ACCOUNT_YOUTUBE_AT_VACH`: Firebase Hosting へのデプロイ権限を持つサービスアカウントの JSON。`firebase init hosting:github` で作成・登録できます。

GitHub Actions の「Update YouTube information」から手動実行して初回の取得・公開を確認できます。定期実行は上記の secrets を設定し、ワークフローを `master` に反映してから動きます。サイトの JSON は最大5分キャッシュされます。スケジュール実行は GitHub 側の都合で遅れることがあります。

ローカルから手動公開する場合は、生成されたデータと表示を確認してから `firebase deploy --only hosting` を実行してください。`.firebaserc` は本番プロジェクト `youtube-at-vach` を指しています。

## 記事インデックス

`node scripts/generateIndex.js` で `public/articles` の Markdown から `public/data/index.json` を生成します。Marp CLI が必要です。

## プロジェクトの記憶・Jev試作

### 公開動画から記憶マップを生成

`public/project-memory.html` はプロジェクト候補と動画の関係図、時系列、計画・実施・完成・問題の原文を表示します。検索は収集済み字幕の全文とタイトル・概要欄を対象にし、字幕の一致箇所から再生時刻へ移動できます。Jevの関連判定と出来事判定を**同じ区間**で対応付けるため、話題が同じだけの別件を自動的に「解決済み」と扱いません。計画は続報の確認候補として表示します。

Python 3.10以上の仮想環境を用意し、[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) と [yt-dlp](https://github.com/yt-dlp/yt-dlp) をインストールします。字幕の取得は前者を先に試し、取得できない場合のみ後者を1回試します。動画本体はダウンロードしません。字幕が公開されていない動画やアクセス制限時は取得できません。

```bash
python3 -m venv .local/venv
.local/venv/bin/python -m pip install youtube-transcript-api yt-dlp
.local/venv/bin/yt-dlp --flat-playlist --dump-single-json --socket-timeout 15 --no-warnings 'https://www.youtube.com/@va-ch/videos' > .local/channel-flat.json
node scripts/buildMemoryCatalog.js
# YOUTUBE_API_KEY がある場合: node --env-file=.env scripts/enrichMemoryCatalog.js
node scripts/fetchMemoryTranscripts.js --input .local/memory-catalog.json --limit 20 --delay 1500
node --env-file=.env scripts/buildProjectMemory.js --limit 20 --max-calls 100 --budget 1
python3 -m http.server 8767 --bind 127.0.0.1 --directory public
```

`http://127.0.0.1:8767/project-memory.html` で確認できます。カタログは公開一覧と `videos.json.bak` の照合結果です。旧バックアップにない動画は公開日・概要欄が空欄です。`YOUTUBE_API_KEY` があれば `enrichMemoryCatalog.js` が公式APIで全件の現行詳細と公開状態を照合します（最大500件、50件ずつ、自動再試行なし）。字幕・分類キャッシュ・失敗台帳は `.local/` に保存し、公開用には `public/data/projectMemory.json` だけを生成します。再実行は取得済み動画をスキップし、同じJev入力はキャッシュを利用します。

1回の字幕収集は最大100本、各動画に2方式を1回ずつ、取得不能が5件続いたら停止します。Jevも1回あたり最大100本・300リクエスト、1動画最大12区間、予算上限を送信前に確認し、通信失敗を自動再試行しません。通信が不確かな場合は `.local/memory-analysis/pending.json` を確認してから再開してください。字幕だけ追加した後は `node scripts/buildProjectMemory.js --build-only` で検索データを更新できます。変更した字幕のJev判定は再実行時に更新されます。

**進捗の読み方:** 画面の「公開動画」「公開日あり」「字幕取得」「Jev解析」は異なる母数です。0.5以上の関連候補は要確認を含み、0.8以上でも検証済みの正答率を意味しません。字幕なし・未解析・日付なしの動画がある間、続報がないことや現在の未完了を証明できません。

`node --env-file=.env scripts/runJevPilot.js --compare` で、過去データから20本を分類してローカルの `.local/jev-pilot/report.html` にトピック別の年表と原文を生成します。`TYPESAFE_API_KEY` が必要です。同一入力はキャッシュを再利用します。SRT/VTTの字幕取り込みにも対応しています。

最初のJev試作の実測はタイトル・概要欄のみです。現在の知識マップは取得できた字幕も解析していますが、全動画の字幕収集と続報の照合は未完了です。料金、最初の実測結果、再実行、字幕の追加手順は [Jev試作メモ](docs/jev-pilot.md) を参照してください。
