# KOMOREBI ISLAND — DECISIONS

最終更新：2026-11-09

1. 既存の生活ゲームのジャンルから着想を得るが、キャラクター・素材・音楽・ロゴ・UI等は独自制作し、他作品の権利物を流用しない。
2. 先にモバイルブラウザで遊べるv0.1を公開し、仕様を検証してからGodot等のネイティブアプリ化を検討。
3. v0.1の技術基盤は外部ライブラリ不要のHTML/CSS/JavaScript、WebGL1、Canvas2D予備描画。
4. セーブはまずlocalStorageとJSON書出し。ドメイン移行でセーブが自動共有されない点を明記。
5. ソースの本体は公開専用の `komorebi-island-3d` に移す。引継ぎ用の `AI-DEVELOPMENT-HUB` は引き続きprivateにする。
6. GitHub Pagesは公開サイトになるため、個人情報・APIキーや権利上問題のある素材はコミットしない。
