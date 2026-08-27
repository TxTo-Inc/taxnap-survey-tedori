// 実ブラウザで通して結果画面をスクショ（文字あふれ・崩れの目視確認用）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({channel:'chrome'});
  const p = await b.newPage({ viewport:{width:414,height:900}, deviceScaleFactor:2 });
  await p.goto('https://txto-inc.github.io/taxnap-survey-tedori/');

  const pick = async (container, label) => {
    await p.click(`#${container} .opt-btn[data-value="${label}"]`);
    await p.click('.slide.active .btn-next:not([disabled])');
  };

  const scenario = process.argv[2] || 'shiro';
  const S = {
    shiro:  {q1:'手書き・国税庁サイトで自分でした', q2:'紙を郵送・税務署に持参', q3:'出していない'},
    kami:   {q1:'会計ソフトで自分でした（freee・マネフォ・弥生など）', q2:'紙を郵送・税務署に持参', q3:'出した'},
    etax:   {q1:'税理士におまかせした', q2:'スマホ・パソコンから送信（e-Tax）', q3:'出した'},
  }[scenario];

  await p.click('#s0 .btn-next');                        // イントロ
  await pick('opts1', S.q1);
  await pick('opts2', S.q2);
  await pick('opts3', S.q3);
  await p.fill('#uriage', '500'); await p.click('#next4');
  await p.fill('#keihi', '200');  await p.click('#next5');
  await pick('opts6', '39歳以下');
  await pick('opts7', '国民健康保険に入っている');
  await p.fill('#email', 'test@example.com');
  await p.click('#next8');
  await p.waitForTimeout(1600);

  await p.screenshot({ path:`live_${scenario}.png`, fullPage:true });
  console.log('shot: result_' + scenario + '.png');
  await b.close();
})();
