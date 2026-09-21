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

`node --env-file=.env scripts/runJevPilot.js --compare` で、過去データから20本を分類してローカルの `.local/jev-pilot/report.html` にトピック別の年表と原文を生成します。`TYPESAFE_API_KEY` が必要です。同一入力はキャッシュを再利用します。SRT/VTTの字幕取り込みにも対応しています。

現在の実測はタイトル・概要欄のみで、字幕による履歴復元や未完了判定は次の段階です。料金、実測結果、再実行、字幕の追加手順は [Jev試作メモ](docs/jev-pilot.md) を参照してください。
