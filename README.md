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

## JSONファイルの編集（インタラクティブフィルタ）

`public/data/videos.json` には過去の不要な動画も含まれる場合があります。以下のスクリプトで対話的に一覧を表示し、
必要なものだけを選んでファイルを更新できます。

### 使用方法

```bash
node scripts/editVideos.js
```

## JSONファイルの概要抽出

`public/data/videos.json` からタイトルと概要(description)のみを抜き出し、
`public/data/videos-summary.json` を生成するスクリプトを用意しています。

### 使用方法

```bash
node scripts/extractSummary.js
```
 
## 除外リストの自動生成

`public/data/videos_mic.json` に表示したい動画の ID を配列で設定しておくと、
`public/data/videos.json` と比較し、差分（不要動画）の ID を
`public/data/videoExcludes.json` に自動で出力するスクリプトを追加しました。

### 使用方法

```bash
node scripts/updateExcludes.js
```
