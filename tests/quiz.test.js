const test = require('node:test');
const assert = require('node:assert/strict');
const { quiz, fields, styles, calculateScores, recommendations } = require('../quiz.js');

test('all 4096 response paths are valid and all 20 types can be selected among top scores', () => {
  const types = new Set();
  for (let path = 0; path < 4 ** quiz.length; path++) {
    let code = path;
    const answers = quiz.map(() => { const a = code % 4; code = Math.floor(code / 4); return a; });
    const result = calculateScores(answers);
    for (const f of result.fieldTies) for (const s of result.styleTies) types.add(`${f.i}:${s.i}`);
    for (const axis of [result.f, result.st]) {
      assert(axis.every(x => Number.isFinite(x.score) && x.score >= 0 && x.score <= 12));
      assert(axis.every((x,i) => !i || axis[i-1].score >= x.score));
    }
  }
  assert.equal(types.size, 20);
  assert(types.has('3:2'), 'earth science experimenter must be reachable');
});

test('ties preserve all joint leaders rather than silently choosing array order', () => {
  let found = false;
  for (let path = 0; path < 4096 && !found; path++) {
    let code=path;
    const answers=quiz.map(()=>{const a=code%4;code=Math.floor(code/4);return a});
    const r=calculateScores(answers);
    if(r.fieldTies.length>1 || r.styleTies.length>1){
      found=true;
      assert.deepEqual(r.fieldTies,r.f.filter(x=>x.score===r.f[0].score));
      assert.deepEqual(r.styleTies,r.st.filter(x=>x.score===r.st[0].score));
      assert.deepEqual(calculateScores(answers),r);
    }
  }
  assert(found);
});

test('each type has three distinct books and every type has a distinct recommendation set', () => {
  const sets = new Set();
  fields.forEach((_,f)=>styles.forEach((_,s)=>{
    const picks=recommendations(f,s);
    assert.equal(picks.length,3);
    assert.equal(new Set(picks.map(b=>b.title)).size,3);
    assert(picks.every(b=>b.title && b.author));
    sets.add(picks.map(b=>b.title).sort().join('|'));
  }));
  assert.equal(sets.size,20);
});

test('incomplete, sparse, and malformed answers cannot produce a result', () => {
  for(const answers of [null,[],[0,0,0],Array(6),[0,0,0,0,0,4],[0,0,0,0,0,-1],[0,0,0,0,0,'1']]){
    assert.throws(()=>calculateScores(answers));
  }
  assert.throws(()=>recommendations(5,0));
  assert.throws(()=>recommendations(0,-1));
});

 test('known answer path preserves the supplied weighted scoring', () => {
  const r=calculateScores([0,0,0,0,0,0]);
  assert.deepEqual([...r.f].sort((a,b)=>a.i-b.i).map(x=>x.score),[7,3,3,4,6]);
  assert.deepEqual([...r.st].sort((a,b)=>a.i-b.i).map(x=>x.score),[4,5,2,2]);
});
