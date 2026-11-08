# KOMOREBI ISLAND — PROJECT_STATE

最終更新：2026-11-09

## 目標
オリジナルの3D生活ゲームを、iPhone SafariでプレイできるWeb版から育て、将来はネイティブアプリ化する。

## 実装済み v0.1
- `index.html`、`styles.css`、`game.js` にWeb試作品を分離
- 地形・家・商店・池・畑・住民等の立体モデルをWebGL1で描画
- WebGL未対応環境ではCanvas2D投影表示
- 移動・カメラ回転、近接して採集、釣り、畑、NPC会話、売買、家の増築、依頼
- localStorageでセーブ、JSONバックアップ
- Node.js標準機能による静的スモークテストとGitHub Actionsワークフロー

## 移行状況
2026-11-09、`hideomi121154-spec/komorebi-island-3d` 専用の公開リポジトリへのコード移行を実施。
ソースの元の保管場所はprivateの `AI-DEVELOPMENT-HUB/KOMOREBI_ISLAND`。

## 検証状況
- 先行プロトタイプではPCブラウザで移動・採集・売買・農業の基本動作を確認済み。
- GitHub Actionsの静的チェックは2026-11-09に **成功**（run #42506850718 / commit b3744d00d857fc966b12401f725e3aa049f418ce）。
- **iPhone Safari実機、公開後のWebGL表示・セーブ復元は未確認**。
- テストはJS構文・画面構成・機能コード存在の静的検査であり、ブラウザ操作や描画品質を自動保証しない。

## ゲームの公開について
GitHub Pagesをmainブランチ(root)から公開する必要がある。設定前はプレイURLとして機能しない。
