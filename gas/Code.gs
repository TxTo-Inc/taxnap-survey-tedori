/**
 * 手取りシミュレーション — 回答受け口（Google Apps Script）
 *
 * 【セットアップ手順】README.md の「GASデプロイ手順」を参照。
 *
 * 要点だけ:
 *  1. スプレッドシートを作り、拡張機能 > Apps Script でこのコードを貼る
 *  2. プロジェクトの設定 > スクリプト プロパティ に POST_TOKEN を登録
 *     （index.html の POST_TOKEN と同じ文字列にする）
 *  3. デプロイ > 新しいデプロイ > 種類=ウェブアプリ
 *       次のユーザーとして実行: 自分
 *       アクセスできるユーザー: 全員
 *  4. 発行された /exec URL を index.html の GAS_URL に貼る
 *
 * 注意: フロントは mode:'no-cors' で送るためレスポンスを読めない。
 *       到達確認は本スプレッドシートの行と、下部の doGet ヘルスチェックで行う。
 */

// 回答を書き込むシート名（_kind で振り分ける）
var SHEET_SURVEY   = '回答';        // 試算アンケート本編（スタッフ・マネージャー共通）
var SHEET_FEEDBACK = 'MGR感想';     // マネージャーの感想（?r=mgr のときだけ届く）

// 列の定義。key = index.html の payload のキー / label = シートに表示する見出し
// ※ key は変更しないこと（フロントの送信キーと対応）。label は自由に変えてよい。
var COLUMNS = [
  { key: 'timestamp',     label: '送信時刻' },
  { key: 'received_at',   label: '受信時刻(JST)' },
  { key: 'company',       label: '会社名' },
  { key: 'company_id',    label: '会社コード' },
  { key: 'role',          label: '対象者' },
  { key: 'email',         label: 'メールアドレス' },
  { key: 'q1_method',     label: 'Q1 申告のしかた' },
  { key: 'q2_submit',     label: 'Q2 提出方法' },
  { key: 'q3_shinsei',    label: 'Q3 青色申告承認申請書' },
  { key: 'q4_uriage',     label: 'Q4 売上(円)' },
  { key: 'q5_keihi',      label: 'Q5 経費(円)' },
  { key: 'q6_age',        label: 'Q6 年齢' },
  { key: 'q7_insurance',  label: 'Q7 健康保険' },
  { key: 'est_kicho',     label: '推定した記帳方法・控除' },
  { key: 'tedori_now',    label: '手取り(いま/2026年分)' },
  { key: 'tedori_2027',   label: '手取り(2027年 青色75万)' },
  { key: 'delta',         label: '差額(2027年どうし)' },
  { key: 'user_agent',    label: 'ブラウザ情報' }
];

// MGR感想シートの列
var FEEDBACK_COLUMNS = [
  { key: 'timestamp',     label: '送信時刻' },
  { key: 'received_at',   label: '受信時刻(JST)' },
  { key: 'company',       label: '会社名' },
  { key: 'company_id',    label: '会社コード' },
  { key: 'email',         label: 'メールアドレス' },
  { key: 'fb_recommend',    label: 'Q1 美容師に案内したいか' },
  { key: 'fb_understand',   label: 'Q2 美容師が理解できそうか' },
  { key: 'fb_unclear',      label: 'Q3 分かりにくかった点(複数)' },
  { key: 'fb_unclear_free', label: 'Q3 その他(自由記述)' },
  { key: 'user_agent',    label: 'ブラウザ情報' }
];

/** 見出し行に使うラベルの配列 */
function headerLabels_(cols) {
  return cols.map(function (c) { return c.label; });
}

/** 同時投稿で行が壊れないようロックを取る */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return jsonOut({ ok: false, error: 'busy' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, error: 'empty_body' });
    }

    var data = JSON.parse(e.postData.contents);

    // トークン照合（無関係な第三者からの書き込みを弾く）
    var expected = PropertiesService.getScriptProperties().getProperty('POST_TOKEN');
    if (!expected || data._token !== expected) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }

    // _kind で書き込み先とスキーマを切り替える（既定は本編アンケート）
    var isFeedback = (data._kind === 'feedback');
    var cols  = isFeedback ? FEEDBACK_COLUMNS : COLUMNS;
    var sheet = getSheet_(isFeedback ? SHEET_FEEDBACK : SHEET_SURVEY, cols);
    var jst = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

    var row = cols.map(function (col) {
      if (col.key === 'received_at') return jst;
      var v = data[col.key];
      if (v === undefined || v === null) return '';
      // 万一配列で届いても崩れないようにする
      return Array.isArray(v) ? v.join(', ') : String(v);
    });

    sheet.appendRow(row);
    return jsonOut({ ok: true });
  } catch (err) {
    // 失敗しても回答者側は完了画面へ進むため、ここで記録を残す
    console.error(err);
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 動作確認用。ブラウザで /exec を開くと現在の回答数が見える */
function doGet() {
  var survey   = getSheet_(SHEET_SURVEY, COLUMNS);
  var feedback = getSheet_(SHEET_FEEDBACK, FEEDBACK_COLUMNS);
  return jsonOut({
    ok: true,
    responses: Math.max(survey.getLastRow() - 1, 0),
    feedback:  Math.max(feedback.getLastRow() - 1, 0)
  });
}

/** シートが無ければ作り、ヘッダー行を用意する */
function getSheet_(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  var labels = headerLabels_(cols);

  if (sheet.getLastRow() === 0) {
    // 新規シート: 見出し行を作る
    setHeader_(sheet, labels);
  } else {
    // 既存シート: 見出しが古い（英語キーのまま）なら日本語ラベルへ上書きする。
    // データ行はそのまま残るため、過去の回答は失われない。
    var width = Math.max(sheet.getLastColumn(), labels.length);
    var currentHeader = sheet.getRange(1, 1, 1, width).getValues()[0];
    if (String(currentHeader[0]).trim() !== labels[0]) {
      setHeader_(sheet, labels);
    }
  }
  return sheet;
}

/** 見出し行を書き込み、太字＋固定にする */
function setHeader_(sheet, labels) {
  sheet.getRange(1, 1, 1, labels.length).setValues([labels]);
  sheet.getRange(1, 1, 1, labels.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
