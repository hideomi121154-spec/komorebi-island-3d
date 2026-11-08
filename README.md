# 🌿 こもれび島 3D — Komorebi Island

オリジナルの3Dスローライフゲーム。小さな島を歩き、採集・釣り・農業・住民との会話・商店での売買・家の改築を楽しむ、スマホ対応のWeb試作品です。

## プレイ

公開済みの **GitHub Pages** で、次のURLから遊べます。

https://hideomi121154-spec.github.io/komorebi-island-3d/

GitHubのコード閲覧画面では実行されないため、上の公開URLをSafariで開いてください。

## 操作

- iPhone・Android：画面の十字キーで移動し、「調べる」を押す。カメラ回転ボタンも使用可能。
- PC：WASD／矢印キーで移動、E／Spaceで調べる。
- 釣り：池で「釣りをする」を選択し、**島の3D画面のまま**竿を投げて、浮きが沈んだらタイミングよく引き上げる。
- セーブ：同じブラウザのlocalStorageに保存。公開先URLの変更やSafariのデータ削除で失う可能性があるので、ゲーム内のJSONバックアップも利用してください。

## 開発

外部JavaScriptライブラリなしで、HTML + CSS + JavaScript（WebGL1）を使用。WebGLが使えない環境向けにCanvas2D投影表示も用意しています。

```sh
python3 -m http.server 8000
# http://localhost:8000
```

```sh
node --check game.js
node --test tests/*.test.mjs
```

## 資料

- [ゲーム設計書](GAME_DESIGN.md)
- [実装・検証状況](PROJECT_STATE.md)
- [設計判断](DECISIONS.md)
- [開発タスク](NEXT_TASKS.md)
- [開発ロードマップ](ROADMAP.md)

## 品質・権利

基本操作は以前のプロトタイプでPCブラウザ確認済みですが、**この公開用リポジトリでの実機iPhone Safari確認は未実施**です。GitHub Actionsの静的チェックは実際の3D表示や操作を保証しません。

キャラクター、世界観、アート、音楽など既存タイトルの権利物を流用しない独自作品として制作します。
