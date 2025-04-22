# バーチャ農ちゃんねるの保管庫

このリポジトリは「バーチャ農ちゃんねる」の静的サイトおよび、YouTube Data APIを使用して動画の基本データを取得・保存するスクリプトを含みます。

## 動画データの取得

以下の手順で動画データを取得し、public/data/videos.json に保存できます。

1. 依存パッケージをインストール (初回のみ)

   ```bash
   npm install googleapis
   ```

2. APIキーを環境変数に設定

   ```bash
   export YOUTUBE_API_KEY=YOUR_API_KEY
   ```

3. スクリプトを実行 (CHANNEL_ID は対象チャンネルのID)

   ```bash
   node scripts/fetchVideos.js CHANNEL_ID
   ```

4. public/data/videos.json に取得結果が出力されます。  
   Webサイトからフェッチして表示に利用してください。

## JSONファイルの分割

取得した動画データ (public/data/videos.json) を、2021年10月以降の動画のみを対象に年-月ごとに分割し、public/data/YYYY-MM.json として保存します。

### 使用方法

```bash
node scripts/splitVideos.js
```

実行後、public/data 以下に 2021-10.json, 2021-11.json ... といったファイルが作成されます。

## JSONファイルの編集（インタラクティブフィルタ）

`public/data/videos.json` には過去の不要な動画も含まれる場合があります。以下のスクリプトで対話的に一覧を表示し、
必要なものだけを選んでファイルを更新できます。

### 使用方法

```bash
node scripts/editVideos.js
```
