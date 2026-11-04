const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const root=path.resolve(__dirname,'..');
  await page.route('http://127.0.0.1:8000/261104/**',route=>{
   const name=new URL(route.request().url()).pathname.slice('/261104/'.length)||'index.html';
   const file=path.resolve(root,name);assert(file.startsWith(root+path.sep));return route.fulfill({path:file});
  });
  const assets=['hero','question_dejavu','question_ai','question_trees','question_time'];
  for(const standalone of [false,true]){
   const url='http://127.0.0.1:8000/261104/'+(standalone?'Odd_Orbit_preview.html':'');
   await page.goto(url,{waitUntil:'networkidle'});
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    for(let i=0;i<5;i++){
     await page.locator('#questionList button').nth(i).click();
     await page.locator('.hero-image').evaluate(i=>i.decode());
     const src=await page.locator('.hero-image').getAttribute('src');
     const expected=standalone?'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets',assets[i]+'.png')).toString('base64'):'assets/'+assets[i]+'.png';
     assert.equal(src,expected);
     assert.equal(await page.locator('#questionList button[aria-current="true"]').count(),1);
     const title=await page.locator('#heroTitle').innerText();
     await page.locator('#openQuestion').click();
     assert.equal(await page.locator('#modalContent h2').innerText(),title);
     assert.equal(await page.locator('.question-art').getAttribute('src'),expected);
     await page.locator('.question-art').evaluate(i=>i.decode());
     await page.keyboard.press('Escape');
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    // Wrap from question 5 to 1 and back; dots must also select matching artwork.
    await page.locator('#next').click();
    assert.equal(await page.locator('#counter').innerText(),'01 / 05');
    await page.locator('#prev').click();
    assert.equal(await page.locator('#counter').innerText(),'05 / 05');
    await page.locator('#dots button').nth(2).click();
    assert.equal(await page.locator('#counter').innerText(),'03 / 05');
    console.log(`PASS ${standalone?'standalone':'project'} ${width}px: 5 question artworks, matching details, next/previous/dots, no overflow`);
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
