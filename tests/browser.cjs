// Requires Playwright and Chromium. Serve the project on port 8000 first.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { quiz, fields, styles, calculateScores, recommendations } = require('../quiz.js');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8000',{waitUntil:'networkidle'});
    assert.equal(await page.title(),'Odd Orbit — Follow Your Curiosity');
    assert(await page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
    for(const width of [320,390,720,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}px`);
    }
    assert.equal(await page.locator('#next').evaluate(e=>Math.round(e.getBoundingClientRect().width)),44);
    console.log('PASS images and responsive widths: 320, 390, 720, 768, 1024, 1440');
    await page.setViewportSize({width:390,height:844});
    await page.locator('#searchBtn').click();
    assert.equal(await page.locator('#searchResults button').count(),5);
    await page.locator('#searchInput').fill('  코스모스  ');
    assert.equal(await page.locator('#searchResults button').count(),1);
    await page.keyboard.press('Escape');
    assert(await page.locator('#searchBtn').evaluate(e=>e===document.activeElement));
    await page.locator('#startQuiz').click();
    assert.equal(await page.locator('#modalContent h2').innerText(),'토끼를 따라,\n나의 호기심 궤도 찾기');
    await page.keyboard.press('Shift+Tab');
    assert(await page.locator('.actions .primary').evaluate(e=>e===document.activeElement));
    await page.keyboard.press('Tab');
    assert(await page.locator('#close').evaluate(e=>e===document.activeElement));
    await page.locator('.actions .primary').click();
    assert(await page.locator('.actions .primary').isDisabled());
    await page.locator('.choice').nth(2).click();
    assert(await page.locator('.choice').nth(2).evaluate(e=>e===document.activeElement));
    await page.locator('.actions .primary').click();
    await page.getByRole('button',{name:'← 이전',exact:true}).click();
    assert.equal(await page.locator('.choice[aria-pressed="true"]').count(),1);
    assert.equal(await page.locator('.choice').nth(2).getAttribute('aria-pressed'),'true');
    await page.keyboard.press('Escape');
    console.log('PASS search, modal focus containment/restoration, answer persistence and navigation');
    const witnesses=new Map();
    for(let path=0;path<4096;path++){
      let code=path;const answers=quiz.map(()=>{const a=code%4;code=Math.floor(code/4);return a});
      const r=calculateScores(answers);
      for(const f of r.fieldTies)for(const s of r.styleTies){
        if(!witnesses.has(`${f.i}:${s.i}`))witnesses.set(`${f.i}:${s.i}`,answers);
      }
    }
    for(const [key,answers] of witnesses){
      const [f,s]=key.split(':').map(Number);
      await page.locator('#startQuiz').click();await page.locator('.actions .primary').click();
      for(const a of answers){await page.locator('.choice').nth(a).click();await page.locator('.actions .primary').click()}
      const result=calculateScores(answers);
      if(result.fieldTies.length>1 || result.styleTies.length>1){
        assert(await page.locator('.actions .primary').isDisabled());
        if(result.fieldTies.length>1)await page.getByRole('button',{name:new RegExp(`^${fields[f]}`)}).click();
        if(result.styleTies.length>1)await page.getByRole('button',{name:new RegExp(`^${styles[s]}`)}).click();
        await page.locator('.actions .primary').click();
      }
      assert.equal(await page.locator('.result-head h2').innerText(),`${fields[f]} ${styles[s]}`);
      assert.deepEqual(await page.locator('.result-books strong').allTextContents(),recommendations(f,s).map(b=>b.title));
      assert(await page.evaluate(()=>document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth));
      await page.getByRole('button',{name:'추천 도서 더 살펴보기 →',exact:true}).click();
      assert.equal(await page.locator('.reading-book').count(),3);
      await page.getByRole('button',{name:'← 나의 결과로 돌아가기',exact:true}).click();
      assert.equal(await page.locator('.result-head h2').innerText(),`${fields[f]} ${styles[s]}`);
      await page.getByRole('button',{name:'다시 테스트',exact:true}).click();
      await page.locator('.actions .primary').click();
      assert.equal(await page.locator('.choice[aria-pressed="true"]').count(),0);
      await page.keyboard.press('Escape');
    }
    console.log('PASS all 20 result types through actual quiz UI, tie selection, personalized books, result return, restart');
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'/tmp/odd-orbit-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'/tmp/odd-orbit-mobile.png',fullPage:true});
    await page.locator('.book').first().click();assert.equal(await page.locator('#modalContent h2').innerText(),'시간은 흐르지 않는다');await page.keyboard.press('Escape');
    await page.locator('#openQuestion').click();assert.equal(await page.locator('#modalContent h2').innerText(),'우리가 아는 ‘맛’은 정말 음식의 맛일까?');await page.keyboard.press('Escape');
    await page.locator('.curation').first().click();assert.equal(await page.locator('#modalContent h2').innerText(),'SF 영화를 좋아한다면');await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    console.log('PASS existing book/question/curation dialogs; zero JavaScript page errors');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
