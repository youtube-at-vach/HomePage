# 銀河ヒッチハイク・DIYオーディオガイド リポジトリ

このリポジトリは「銀河ヒッチハイク・DIYオーディオガイド」の静的サイトおよび、YouTube Data APIを使用して動画やプレイリストデータを取得・管理するスクリプト、外部リンク取得や記事インデックス生成ツールを含みます。

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

## プレイリストデータの取得（fetchPlaylists.js）

YouTube Data API を使用して、指定したチャンネルのプレイリスト一覧と各プレイリストに含まれる動画IDを取得し、`public/data/playlists.json` に保存します。

### 使用方法

```bash
export YOUTUBE_API_KEY=YOUR_API_KEY
node scripts/fetchPlaylists.js CHANNEL_ID
```

## 動画データのフィルタリングと除外リスト生成（editVideos.js）

`public/data/videos.json` には不要な動画も含まれる場合があります。以下のスクリプトで対話的に一覧を表示し、必要な動画を選択できます。
選択結果に基づいて、`public/data/videoExcludes.json` に除外動画IDリストを生成します。

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
 
## 外部リンク一覧の取得（fetchExternalLinks.js）

`public/data/allurls.txt` に記載された URL 一覧を読み込み、各 URL のページタイトルを取得して、`public/data/externalLinks.json` に保存します。

### 使用方法

```bash
node scripts/fetchExternalLinks.js
```

## 記事インデックスの生成（generateIndex.js）

`public/articles` フォルダ内の Markdown ファイルからタイトルなどのメタデータを抽出し、`public/data/index.json` として保存します。

### 使用方法

```bash
node scripts/generateIndex.js
```

