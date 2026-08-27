const { JSDOM } = require('jsdom');
const fs = require('fs');
const HTML = fs.readFileSync('index.html','utf8');

// 実際のボタンをクリックして通す（UIフローそのものの検証になる）
function run(picks, uriageMan, keihiMan) {
  const dom = new JSDOM(HTML, { runScripts:'dangerously', pretendToBeVisual:true,
    beforeParse(w){
      w.fetch = () => Promise.resolve();
      w.scrollTo = () => {};
      w.requestAnimationFrame = cb => cb();
    }});
  const w = dom.window, d = w.document;

  const click = (container, label) => {
    const btns = [...d.querySelectorAll('#'+container+' .opt-btn')];
    const b = btns.find(x => x.dataset.value === label);
    if (!b) throw new Error(`選択肢が見つからない: ${container} / ${label}\n  候補: ${btns.map(x=>x.dataset.value).join(' | ')}`);
    b.click();
  };
  click('opts1', picks.q1);
  click('opts2', picks.q2);
  click('opts3', picks.q3);
  click('opts6', picks.q6);
  click('opts7', picks.q7);

  const setVal = (id, v) => {
    const el = d.getElementById(id);
    el.value = String(v);
    el.dispatchEvent(new w.Event('input'));
  };
  setVal('uriage', uriageMan);
  setVal('keihi', keihiMan);

  const next4 = d.getElementById('next4').disabled;
  const next5 = d.getElementById('next5').disabled;

  d.getElementById('email').value = 'test@example.com';
  d.getElementById('email').dispatchEvent(new w.Event('input'));
  const submitDisabled = d.getElementById('next8').disabled;

  const r = w.renderResult();
  w.animateChart();

  return {
    est: r.est.label, mode: r.mode,
    hero: r.now.tedori, baseline: r.baseline.tedori, after: r.after.tedori,
    chartTitle: d.getElementById('chartTitle').textContent,
    deltaLead: d.getElementById('deltaLead').textContent,
    deltaAmount: d.getElementById('deltaAmount').textContent,
    barNowVal: d.getElementById('barNowVal').textContent,
    barAfterVal: d.getElementById('barAfterVal').textContent,
    barNowH: d.getElementById('barNow').style.height,
    barAfterH: d.getElementById('barAfter').style.height,
    warn: d.getElementById('warnSlot').textContent.replace(/\s+/g,' ').trim(),
    estBox: d.getElementById('estBox').textContent.replace(/\s+/g,' ').trim(),
    resSub: d.getElementById('resSub').textContent.replace(/\s+/g,' ').trim(),
    bdRows: [...d.querySelectorAll('#bdTable tr')].map(t=>t.textContent.replace(/\s+/g,' ').trim()),
    gates: {next4, next5, submitDisabled}
  };
}

const ETAX='スマホ・パソコンから送信（e-Tax）', KAMI='紙を郵送・税務署に持参', WAKARANAI='わからない';
const SOFT='会計ソフトで自分でした（freee・マネフォ・弥生など）', ZEIRISHI='税理士におまかせした';
const TEGAKI='手書き・国税庁サイトで自分でした', SHITENAI='していない／今年が初めて';
const KOKUHO='国民健康保険に入っている', FUYO='家族の社会保険の扶養に入っている';

const CASES = [
  ['① 白色（申請書なし）',   {q1:TEGAKI,   q2:KAMI,  q3:'出していない', q6:'39歳以下', q7:KOKUHO}],
  ['② 青色・簡易簿記',       {q1:TEGAKI,   q2:ETAX,  q3:'出した',       q6:'39歳以下', q7:KOKUHO}],
  ['③ 青色・複式＋書面',     {q1:SOFT,     q2:KAMI,  q3:'出した',       q6:'39歳以下', q7:KOKUHO}],
  ['④ 青色・複式＋e-Tax',    {q1:ZEIRISHI, q2:ETAX,  q3:'出した',       q6:'39歳以下', q7:KOKUHO}],
  ['⑤ 覚えていない→白色扱い',{q1:ZEIRISHI, q2:WAKARANAI, q3:'覚えていない', q6:'40歳以上', q7:KOKUHO}],
  ['⑥ 初めて＋扶養',         {q1:SHITENAI, q2:WAKARANAI, q3:'出していない', q6:'39歳以下', q7:FUYO}],
];

for (const [name, p] of CASES) {
  const r = run(p, 500, 200);
  console.log('━━━━━', name);
  console.log('  推定       :', r.est, '| mode =', r.mode);
  console.log('  ヒーロー   :', r.hero.toLocaleString(), '円');
  console.log('  グラフ     :', r.chartTitle);
  console.log('    棒(左)   :', r.barNowVal, '→ height', r.barNowH);
  console.log('    棒(右)   :', r.barAfterVal, '→ height', r.barAfterH);
  console.log('  ' + r.deltaLead + ' :', r.deltaAmount);
  if (r.warn) console.log('  ⚠️        :', r.warn.slice(0,95));
  console.log('  ゲート     : next4=' + r.gates.next4 + ' next5=' + r.gates.next5 + ' submit=' + r.gates.submitDisabled);
  console.log('');
}

console.log('===== 内訳テーブル（白色・売上500万/経費200万）=====');
run(CASES[0][1], 500, 200).bdRows.forEach(x => console.log('  ' + x));

console.log('\n===== 売上・経費バリエーション（白色）=====');
for (const [u,k] of [[300,60],[500,200],[800,320],[1200,480],[100,90],[0,0]]) {
  try {
    const r = run(CASES[0][1], u, k);
    console.log(`売上${String(u).padStart(4)}万 経費${String(k).padStart(3)}万: そのまま=${r.baseline.toLocaleString().padStart(10)} → 青色=${r.after.toLocaleString().padStart(10)}  ${r.deltaAmount}`);
  } catch(e){ console.log(`売上${u}万 経費${k}万: ERROR ${e.message}`); }
}
