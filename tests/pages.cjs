// Verify published content under a GitHub Pages project prefix, including script failures.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const root=path.resolve(__dirname,'..');
  for(const mode of ['enabled','disabled','quiz-unavailable']){
   const context=await browser.newContext({javaScriptEnabled:mode!=='disabled',viewport:{width:390,height:844}});
   const page=await context.newPage();
   await page.route('http://127.0.0.1:8000/261104/**',async route=>{
    const pathname=new URL(route.request().url()).pathname.slice('/261104/'.length)||'index.html';
    if(mode==='quiz-unavailable'&&pathname==='quiz.js')return route.abort();
    const file=path.resolve(root,pathname);
    assert(file.startsWith(root+path.sep));
    await route.fulfill({path:file});
   });
   await page.goto('http://127.0.0.1:8000/261104/',{waitUntil:'networkidle'});
   assert.equal(await page.locator('#bookList .book').count(),5);
   assert.equal(await page.locator('#curationList .curation').count(),3);
   assert(await page.locator('#bookList img,#curationList img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(mode==='enabled'){
    await page.locator('.book').first().click();
    assert.equal(await page.locator('#modalContent h2').innerText(),'시간은 흐르지 않는다');
    await page.keyboard.press('Escape');
    await page.locator('.curation').first().click();
    assert.equal(await page.locator('#modalContent h2').innerText(),'SF 영화를 좋아한다면');
   }
   if(mode==='disabled'){
    assert((await page.locator('.book').first().getAttribute('href')).startsWith('https://search.kyobobook.co.kr/'));
   }
   console.log(`PASS /261104/ with JavaScript ${mode}: 5 books, 3 curations, 8 loaded images, no overflow`);
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
