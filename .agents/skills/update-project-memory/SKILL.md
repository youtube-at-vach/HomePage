---
name: update-project-memory
description: このHomePageリポジトリのYouTube動画・プレイリスト履歴をローカルで更新し、必要に応じて字幕ファイル取り込みやJev再解析を行う。通常のサイト編集や週次GitHub Actionsの運用には使わない。
---

# プロジェクト履歴のローカル更新

このスキルはこのリポジトリ専用。作業前に `README.md` の「定期更新と公開」「プロジェクトの記憶・Jev試作」、対象スクリプトの現在の引数、`git status --short` を確認する。既存の作業ツリーと公開データを保持し、ユーザーが依頼した更新範囲だけを扱う。秘密情報の値を表示・コミットしない。

## データの境界

- `.local/memory-catalog.json` は公式YouTube Data APIから取得した作業用カタログ。`.local/jev-transcripts/` と `.local/memory-analysis/` はローカル専用の字幕・Jevキャッシュ。`.env` と `.local/` は公開・コミットしない。
- `public/data/projectMemory.json` と `public/data/latestVideos.json` が公開用成果物。公式プレイリスト所属とJevの推定トピックを混同せず、字幕がない箇所の発言や計画の達成を補完しない。
- GitHub Actionsは週次のAPIメタデータ更新・Firebase公開を担い、字幕取得とJev追加解析はしない。このスキルを使っただけではデプロイ、GitHubへのpush、Actions手動実行をしない。それらは依頼された場合に別途行う。

## 更新方法を選ぶ

1. **通常のメタデータ更新**: `node --env-file=.env scripts/fetchChannelArchive.js --reuse public/data/projectMemory.json` を実行し、次に `node scripts/publishChannelArchive.js` を実行する。公開一覧とプレイリスト所属を照合し、新規・直近50本の詳細を更新する。古い動画のタイトル・概要欄も更新する依頼なら `--reuse` を外して全件取得する。APIキーは `YOUTUBE_API_KEY`。API失敗時は公開用JSONを上書きしない。
2. **既存の字幕・Jev結果から再構築**: `.local` のカタログ、字幕、解析結果が揃っていることを確認して `node scripts/buildProjectMemory.js --build-only --publish .local/memory-preview.json` を実行する。プレビューの件数・シリーズ・根拠を既存の公開データと比べ、意図しない解析済み件数の減少がないことを確認してから `--publish public/data/projectMemory.json` で再生成する。必要なら `node scripts/publishChannelArchive.js` で最新12本も同期する。
3. **字幕の追加**: ユーザーが入手したSRT/VTTは、動画IDを確認して `node scripts/importJevSubtitles.js --input <字幕ファイル> --video <11文字の動画ID>` で取り込む。字幕取得を明示的に依頼された場合だけ `scripts/fetchMemoryTranscripts.js` の現在の上限・失敗停止条件を確認して試す。IPブロックや連続失敗時に繰り返し回避を試さない。字幕追加後はまず上記の `--build-only` で検索データを更新し、Jevによる出来事判定の更新は別途必要と伝える。
4. **Jevの追加解析**: ユーザーが解析を依頼した場合だけ、`TYPESAFE_API_KEY` の存在、対象、`--limit`、`--max-calls`、`--budget` を確認して `node --env-file=.env scripts/buildProjectMemory.js --limit <本数> --max-calls <回数> --budget <USD上限> --publish .local/memory-preview.json` を使う。予算上限が示されていなければ解析前に確認する。`.local/memory-analysis/pending.json` がある場合は通信結果が不明なので、内容を調べずに再送したり、ファイルを勝手に消したりしない。結果を確認した後、`node scripts/buildProjectMemory.js --build-only --publish public/data/projectMemory.json` でAPIを再呼び出しせず公開用JSONを再生成する。

## 受け渡し前の確認

`node --test tests/*.test.js`、`node --check public/project-memory.js`、`git diff --check` を実行し、公開JSONの動画数・字幕数・Jev解析数・主要プレイリスト件数とサイト表示を確認する。メタデータ変更でJev判定が無効化された動画は「未解析」のまま扱う。何を更新したか、未取得・未解析の範囲、デプロイの有無を報告する。
