# 🌈 こもれび異世界ひろば — 3D × 2D × マルチプレイ

**2026-11-14 初期実装。** 既存の一人用「こもれび島」を残して、別ページ `dimension-hub.html` に新しい世界を追加しました。

## 何が遊べる？

- **3D・星の交流広場**：Three.jsで歩ける独立した立体空間。星の門、カフェ、噴水、海、花壇、アバターを表示。
- **2D・花びらのガーデン**：Canvas2Dで歩けるドット絵の街。お店、池、花びら8枚集め、同じアバターで探索。
- **世界の切替**：画面右の「🚪 2Dの世界へ」または下の「🌈 世界を切替」で移動。島の🌈アイコンから入室し、🏝️で従来の島へ戻れます。
- **スマホ操作**：画面左下の十字キー、PCでは矢印/WASD、Eで次の世界へ。
- **友達ルーム（実装済み・サーバー未配備）**：6文字の招待コード、最大8人の位置同期、同じ世界のアバター表示、チャット、挨拶。2Dと3Dを分かれて探索する場合も同じ部屋に居られます。

## オンラインについての重要な現状

GitHub Pagesは静的Webサイトを配信するため、**GitHubだけではリアルタイムマルチプレイは動きません**。Cloudflare WorkerのWebSocketサーバーを別途配備し、`dimension-config.js` に接続先を設定する必要があります。未配備時はUIに **「オフライン体験」「サーバー接続待ち」** と表示し、オンラインの友達がいるように装うことはありません。

### Cloudflareで無料枠から配備する

1. Cloudflareアカウントを用意（無料枠の範囲内で利用する構成）。GitHub Pagesはそのまま使う。
2. Node.js環境で `cd multiplayer` を実行。
3. `npx wrangler@latest login` でCloudflareアカウントにログイン。
4. `npx wrangler@latest deploy` でWorkerとSQLite-backed Durable Objectを配備。
5. 表示された `https://komorebi-world-rooms.<subdomain>.workers.dev` をコピー。
6. GitHubの `dimension-config.js` を編集し、`window.KOMOREBI_ROOM_WS_URL='wss://komorebi-world-rooms.<subdomain>.workers.dev/ws';` とする。
7. GitHub Pagesの公開後、**別のブラウザやiPhone2台**で同じ招待コードから入室して確認。

外部アカウントの接続・Cloudflareへのデプロイは、このコミットでは実行していません。使用量に応じてCloudflareの無料枠を超えることもあるため、利用量を管理してください。

### プロトコル（最初のオンライン版）

- 1ルーム最大8人、6文字のランダムコード（O、I、0、1を除く）、ルームコードを知る人が参加可能。
- `welcome` で自分IDと現在の参加者一覧。`join` / `leave` / `move` / `world` / `chat` / `emote` を共有。
- Server-side origin検査、入室上限、移動の速度制限、位置範囲、テキスト長と投稿頻度制限を実装。表示時も必ず `textContent` を利用。
- 位置は約5回/秒まで送信。動きの少ない時は送信しない。Durable ObjectsのWebSocket hibernation API `acceptWebSocket` を使用し待機時のコストを抑える。
- 他人のセーブデータ、既存の `komorebi_island_3d_v01` は送信しない。友達登録、永続的な共同建設、クラウドセーブは**未実装**です。
- 名前は本人申告であり本人確認されません。招待コードだけでは完全なアクセス保護はできません。未成年利用や一般公開前にはモデレーション・ブロック・通報・認証などが必要です。

## 次の開発候補（意図的に未実装）

1. **3Dの家に入ると2Dの室内へ**：店でアルバイト、家具配置、友達とのボードゲーム。
2. **共同建設**：オブジェクトの所有権と更新競合の解消、サーバーに共有保存。
3. **オンラインレース**：入力同期・不正対策・遅延補間・サーバーで順位確定。
4. **フレンド招待・通報**：招待以外のアクセスを制限し、迷惑行為を防止。
5. **部屋を増やす**：複数島ルームに分けて運用、ユーザー数に応じて負荷テスト。

## 重要な制約

オンラインサーバーをまだ公開していないので、現在公開しただけで友達がリアルタイムに見えるわけではありません。現時点で遊べるのは3D/2Dの切替と2Dの花びら集めです。iPhone実機の表示速度とタッチ操作は別途確認してください。

Cloudflare公式資料:
- https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/changelog/post/2026-07-09-restrict-new-kv-backed-namespaces/
