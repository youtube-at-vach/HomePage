# ようこそ！銀河ヒッチハイク・DIYオーディオガイド リポジトリへ！

このリポジトリは、あなた自身の「銀河ヒッチハイク・DIYオーディオガイド」静的サイトを構築するための秘密基地です！YouTube Data APIを駆使して動画データを取得・管理する魔法のスクリプトや、記事インデックスを自動生成する便利なツールが揃っています。さあ、一緒に宇宙の果てまで届くような、魅力的なオーディオガイドを作り上げましょう！

## 動画データの取得 (scripts/fetchVideos.js)

YouTube銀河から動画データをビームアップする準備はOK？ このスクリプトはあなたの頼れるトランスポーター！指定したチャンネルIDから動画の詳細情報をまるっと取得し、`public/data/videos.json` にきちんと整理整頓してくれます。これで、あなたのサイトに動画コンテンツをリッチに表示できますね！

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
   Webサイトからフェッチして表示に利用してください。準備万端！

## 記事インデックスの魔法（scripts/generateIndex.js）

あなたの素晴らしい記事たちを、魔法のようにインデックス化したいと思ったことはありませんか？ このスクリプトはあなたの専属司書です！`public/articles` フォルダ内をくまなくスキャンし、タイトルやメタデータを抽出して、便利な `public/data/index.json` ファイルをサッと作成してくれます。これで、訪問者はあなたの知識の海をスムーズに航海できるでしょう！

### 使用方法

```bash
node scripts/generateIndex.js
```

