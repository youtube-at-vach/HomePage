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

`.github/workflows/update-youtube.yml` は**毎週月曜 03:17 JST** と手動実行で、公開動画・公開プレイリストを一度に取得し、最新12本とプロジェクトの記憶を同じデータから生成して Firebase Hosting に公開します。週次では公開一覧とプレイリスト所属を確認し、動画詳細は新規・直近50本だけ更新します。古い動画の概要欄を変更した場合は手動実行の `full_refresh` を選ぶと全件更新できます。毎日の実行や、最新動画を取り直す二重取得はしません。字幕とJevのAPIはActionsから呼びません。利用するには GitHub リポジトリの Actions secrets に次の2つを登録してください。秘密情報をファイルやコミットに含めないでください。

- `YOUTUBE_API_KEY`: YouTube Data API v3 の APIキー。可能ならこのAPIのみに制限してください。
- `FIREBASE_SERVICE_ACCOUNT_YOUTUBE_AT_VACH`: Firebase Hosting へのデプロイ権限を持つサービスアカウントの JSON。`firebase init hosting:github` で作成・登録できます。

GitHub Actions の「Update YouTube information」から手動実行して初回の取得・公開を確認できます。定期実行は上記の secrets を設定し、ワークフローを既定ブランチに反映してから動きます。成功した公開データをActionsのキャッシュへ残し、次回の差分更新に使います。キャッシュが消えた場合はリポジトリにある公開データから再開し、新しい動画を再取得します。API失敗時は公開せず、既存の公開内容を維持します。サイトの JSON は最大5分キャッシュされます。スケジュール実行は GitHub 側の都合で遅れることがあります。

ローカルで同じ更新を行うには `node --env-file=.env scripts/fetchChannelArchive.js --reuse public/data/projectMemory.json`、`node scripts/publishChannelArchive.js` の順に実行します。`--reuse` を外すと全件詳細を更新します。後者は既存のJev判定を、タイトル・概要欄・公開日が変わらない動画に限って維持し、新規または変更された動画は未解析として扱います。生成データと表示を確認してから `firebase deploy --only hosting` を実行してください。`.firebaserc` は本番プロジェクト `youtube-at-vach` を指しています。

## リソースと旧AI記事

トップページとリソース一覧のダウンロード資源・参考リンクは、JSONを使わず各HTMLに固定記述しています。古いAI調査記事は公開対象から削除し、トップページの掲載とサイトマップへの登録も停止しています。

## プロジェクトの記憶・Jev試作

### 公開動画から記憶マップを生成

`public/project-memory.html` は公開プレイリスト、時系列、計画・実施・完成・問題の原文を表示します。「自作MEMSマイクへの道」は、公式プレイリスト全体（周辺活動も含む）と、タイトルにシリーズ名のある本編＋同じリストに属する製作前史3本・後続の録音検証1本を分けています。オリジナル曲の2リスト、Producer.AI実験室、機器修理も独立した入口です。プレイリストはチャンネルによる整理であり、Jevの技術トピックは別の推定分類です。検索は収集済み字幕の全文とタイトル・概要欄を対象にし、字幕の一致箇所から再生時刻へ移動できます。Jevの関連判定と出来事判定を**同じ区間**で対応付けるため、話題が同じだけの別件を自動的に「解決済み」と扱いません。

公開動画とプレイリストは字幕取得を試さず、YouTube Data API v3のみで更新できます。`fetchChannelArchive.js` はチャンネルのuploadsリストと公開プレイリストをページ単位で取得し、動画詳細を50本単位で照合します。非公開動画、外部チャンネルの動画はこのHPの履歴から除外します。全ページ成功した場合にのみ `.local/memory-catalog.json` を置き換えます。既存の `fetchVideos.js` は単独の最新動画取得用で、週次Actionsでは使いません。

Python 3.10以上の仮想環境を用意し、[youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) と [yt-dlp](https://github.com/yt-dlp/yt-dlp) をインストールします。字幕の取得は前者を先に試し、取得できない場合のみ後者を1回試します。動画本体はダウンロードしません。字幕が公開されていない動画やアクセス制限時は取得できません。

```bash
python3 -m venv .local/venv
.local/venv/bin/python -m pip install youtube-transcript-api yt-dlp
node --env-file=.env scripts/fetchChannelArchive.js
node scripts/fetchMemoryTranscripts.js --input .local/memory-catalog.json --limit 20 --delay 1500
node --env-file=.env scripts/buildProjectMemory.js --limit 20 --max-calls 100 --budget 1
python3 -m http.server 8767 --bind 127.0.0.1 --directory public
```

`http://127.0.0.1:8767/project-memory.html` で確認できます。字幕・分類キャッシュ・失敗台帳は `.local/` に保存し、公開用には `public/data/projectMemory.json` だけを生成します。再実行は取得済み動画をスキップし、同じJev入力はキャッシュを利用します。IP制限が続く場合は字幕取得行を省略し、APIメタデータと既存のJev判定だけで `node scripts/buildProjectMemory.js --build-only` を実行してください。

1回の字幕収集は最大100本、各動画に2方式を1回ずつ、取得不能が5件続いたら停止します。Jevも1回あたり最大100本・300リクエスト、1動画最大12区間、予算上限を送信前に確認し、通信失敗を自動再試行しません。通信が不確かな場合は `.local/memory-analysis/pending.json` を確認してから再開してください。字幕だけ追加した後は `node scripts/buildProjectMemory.js --build-only` で検索データを更新できます。変更した字幕のJev判定は再実行時に更新されます。

**進捗の読み方:** 「公開動画」「字幕取得」「Jev解析」は異なる母数です。プレイリスト所属はAPIによる事実ですが、0.5以上のJev関連候補は要確認を含み、0.8以上でも検証済みの正答率を意味しません。字幕なし・未解析の動画がある間、続報がないことや現在の未完了を証明できません。

`node --env-file=.env scripts/runJevPilot.js --compare` で、過去データから20本を分類してローカルの `.local/jev-pilot/report.html` にトピック別の年表と原文を生成します。`TYPESAFE_API_KEY` が必要です。同一入力はキャッシュを再利用します。SRT/VTTの字幕取り込みにも対応しています。

最初のJev試作の実測はタイトル・概要欄のみです。現在の知識マップは取得できた字幕も解析していますが、全動画の字幕収集と続報の照合は未完了です。料金、最初の実測結果、再実行、字幕の追加手順は [Jev試作メモ](docs/jev-pilot.md) を参照してください。
