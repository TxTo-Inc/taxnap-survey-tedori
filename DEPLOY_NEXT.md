# 回答保存を有効にする — 残りの手作業（2026-09-03 準備済み）

## 準備済み
- 回答先スプレッドシート: 「手取りシミュレーション_アンケート回答」
  https://docs.google.com/spreadsheets/d/1J7gL5uAAesaYdqLdCt1NZxGjiN2pXQw_JG75JuAslV0/edit
  （「日本政策金融公庫_アンケート」と同じフォルダ。シート「回答」「MGR感想」は初回受信時に GAS が自動作成）
- GAS コード: `gas/Code.gs`（そのまま貼る。列定義は index.html の送信キーと一致確認済み）
- POST_TOKEN: `taxnap_tedori_db9ae863134c93dd`（index.html に反映済み）

## 2026-09-04 完了
- GAS ウェブアプリ稼働確認: GET → `{"ok":true,"responses":N,"feedback":N}`
- テスト投稿（company_id=test、user_agent=curl-check）で「回答」「MGR感想」に各1行追記を確認。トークン不一致は unauthorized で拒否
- index.html に /exec URL と POST_TOKEN を反映して push 済み → 以後の回答は上記シートに保存される
- テスト行（会社コード test）は集計時に除外 or 削除してよい

## 以後の運用メモ
- Code.gs を直したら「デプロイを管理 > ✏️ > 新バージョン」（「新しいデプロイ」は URL が変わる）
- 行が増えない時: ①アクセス=全員でない ②トークン不一致 ③URL が /dev（/exec が正）
- 現在の回答数は /exec を GET すると JSON で見える
