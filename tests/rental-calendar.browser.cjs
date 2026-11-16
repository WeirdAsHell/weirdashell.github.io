const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const page=await browser.newPage();let privateData=null,publicData=[{name:'Testa Produkts',description:'Tests',price:'10',image:'',busy:['2026-11-16']}],ps='p1',ss=null,failPublic=false,puts=[];
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const file=(data,sha)=>({content:Buffer.from(JSON.stringify(data)).toString('base64'),sha});
 await page.route('https://api.github.com/**',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;let body,status=200;
  if(req.method()==='PUT'){
   const j=req.postDataJSON();const data=JSON.parse(Buffer.from(j.content,'base64'));puts.push({path,data});
   if(path.includes('/private-bookings/')){privateData=data;ss='s'+puts.length;body={content:{sha:ss}};}
   else if(failPublic){status=500;body={message:'test failure'};failPublic=false;}
   else{assert.equal(j.sha,ps);publicData=data;ps='p'+puts.length;body={content:{sha:ps}};}
  }else if(path.endsWith('/user'))body={login:'WeirdAsHell'};
  else if(path.includes('/branches/'))body={name:'main'};
  else if(path.endsWith('/private-bookings/')||path.endsWith('/private-bookings'))body={private:true,default_branch:'main'};
  else if(path.endsWith('/public-storage/')||path.endsWith('/public-storage'))body={private:false,default_branch:'main'};
  else if(path.includes('/private-bookings/contents/')){if(privateData)body=file(privateData,ss);else{status=404;body={message:'Not Found'};}}
  else if(path.includes('/contents/data/noma.json'))body=file(publicData,ps);
  else body={default_branch:'main'};
  await route.fulfill({status,json:body});
 });
 await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8000'}/panelis/`);await page.locator('#token').fill('test-token');await page.getByRole('button',{name:'Pieslēgties',exact:true}).click();await page.getByRole('button',{name:'Nomas kalendārs',exact:true}).click();
 assert.equal(await page.getByLabel('Privātā repozitorija nosaukums').inputValue(),'garazas-studija-reservations');
 await page.getByLabel('Privātā repozitorija nosaukums').fill('public-storage');await page.getByRole('button',{name:'Atvērt kalendāru'}).click();await page.getByRole('alert').filter({hasText:'privāts repozitorijs'}).waitFor();assert.equal(puts.length,0);assert.equal(await page.evaluate(()=>localStorage.length),0);
 await page.getByLabel('Privātā repozitorija nosaukums').fill('private-bookings');await page.getByRole('button',{name:'Atvērt kalendāru'}).click();
 await page.getByLabel('Skats',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('gs:rental-repository:WeirdAsHell/weirdashell.github.io')),'private-bookings');
 await page.getByLabel('Datums',{exact:true}).fill('2026-11-18');
 await page.getByLabel('Klienta kods').fill('GS-0001');await page.getByLabel('Sākuma datums').fill('2026-11-18');await page.getByLabel('Beigu datums').fill('2026-11-20');await page.getByRole('button',{name:'Pievienot rezervāciju',exact:true}).click();
 await page.getByRole('button',{name:'Mainīt',exact:true}).waitFor();assert.equal(privateData.bookings.length,1);assert.deepEqual(publicData[0].busy,['2026-11-16','2026-11-18','2026-11-19','2026-11-20']);assert(!JSON.stringify(publicData).includes('GS-'));
 await page.getByLabel('Klienta kods').fill('GS-0002');await page.getByLabel('Sākuma datums').fill('2026-11-20');await page.getByLabel('Beigu datums').fill('2026-11-21');let count=puts.length;await page.getByRole('button',{name:'Pievienot rezervāciju',exact:true}).click();await page.getByRole('status').filter({hasText:'jau ir rezervācija'}).waitFor();assert.equal(puts.length,count);
 await page.getByLabel('Skats',{exact:true}).selectOption('week');assert.equal(await page.locator('thead th').count(),8);
 await page.getByRole('button',{name:'Mainīt',exact:true}).click();await page.getByLabel('Rezervācijas statuss').selectOption('cancelled');failPublic=true;await page.getByRole('button',{name:'Saglabāt izmaiņas',exact:true}).click();await page.getByRole('button',{name:'Atkārtot pieejamības sinhronizāciju'}).waitFor();assert.equal(privateData.bookings[0].status,'cancelled');
 // Reload the section after a partial write: recover pending sync from private state.
 await page.getByRole('button',{name:'Nomas kalendārs',exact:true}).click();await page.getByLabel('Privātā repozitorija nosaukums').fill('private-bookings');await page.getByRole('button',{name:'Atvērt kalendāru'}).click();await page.getByRole('button',{name:'Atkārtot pieejamības sinhronizāciju'}).click();await page.getByLabel('Skats',{exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('#content button')?.disabled);assert.deepEqual(publicData[0].busy,['2026-11-16']);
 await page.getByLabel('Datums',{exact:true}).fill('2026-11-18');await page.getByRole('button',{name:'Dzēst',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent==='');assert.equal(privateData.bookings.length,0);
 const colors=await page.locator('.status-legend .booking-status').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundColor));
 assert.equal(new Set(colors).size,4);
 await page.getByRole('button',{name:'Produktu pārvaldība',exact:true}).click();
 assert.equal(await page.locator('.calendar-scroll').count(),0);
 await page.getByRole('button',{name:'Dzēst produktu',exact:true}).click();
 await page.getByRole('status').filter({hasText:'nevar dzēst'}).waitFor();assert.equal(publicData.length,1);
 await page.getByRole('button',{name:'+ Pievienot produktu',exact:true}).click();
 const beforeCreate=puts.length;
 await page.getByLabel('Produkta nosaukums').fill('Arka');await page.getByLabel('Cena dienā (€)').fill('25.50');
 assert.equal(puts.length,beforeCreate); // Creating a draft must not save a placeholder product.
 await page.getByRole('button',{name:'Izveidot produktu',exact:true}).click();
 await page.getByRole('heading',{name:'Arka',exact:true}).waitFor();
 const arka=page.locator('.product-item').filter({has:page.getByRole('heading',{name:'Arka',exact:true})});
 await arka.getByRole('button',{name:'Rediģēt',exact:true}).click();
 await page.getByLabel('Produkta nosaukums').fill('Balta arka');await page.getByLabel('Apraksts',{exact:true}).fill('Balta kāzu arka');
 await page.getByRole('button',{name:'Saglabāt produktu',exact:true}).click();await page.getByRole('heading',{name:'Balta arka',exact:true}).waitFor();
 assert.equal(publicData[1].description,'Balta kāzu arka');
 await page.locator('.product-item').filter({has:page.getByRole('heading',{name:'Balta arka',exact:true})}).getByRole('button',{name:'Dzēst produktu'}).click();
 await page.getByRole('heading',{name:'Balta arka',exact:true}).waitFor({state:'detached'});assert.equal(publicData.length,1);
 await page.getByRole('button',{name:'+ Pievienot produktu',exact:true}).click();
 await page.getByLabel('Produkta nosaukums').fill('Galds');await page.getByRole('button',{name:'Atcelt',exact:true}).click();assert.equal(publicData.length,1);
 await page.getByRole('button',{name:'+ Pievienot produktu',exact:true}).click();await page.getByLabel('Produkta nosaukums').fill('Galds');await page.getByRole('button',{name:'Izveidot produktu',exact:true}).click();
 await page.getByRole('heading',{name:'Galds',exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/products-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Rezervāciju kalendārs',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('select[aria-label="Nomas produkts"] option').length===2);
 assert.equal(publicData.length,2);assert.equal(privateData.products.length,2);
 // Stale public snapshots must not trigger a private write.
 ps='concurrent-public-change';const beforeConflict=puts.length;
 await page.getByLabel('Klienta kods').fill('GS-0003');await page.getByRole('button',{name:'Pievienot rezervāciju',exact:true}).click();
 await page.getByRole('status').filter({hasText:'mainīti citā sesijā'}).waitFor();assert.equal(puts.length,beforeConflict);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.calendar-scroll').count(),1);assert.deepEqual(errors,[]);

 await page.reload();
 assert.equal(await page.locator('#token').inputValue(),'');
 await page.locator('#token').fill('test-token');await page.getByRole('button',{name:'Pieslēgties',exact:true}).click();await page.getByRole('button',{name:'Nomas kalendārs',exact:true}).click();
 assert.equal(await page.getByLabel('Privātā repozitorija nosaukums').inputValue(),'private-bookings');
 const stored=await page.evaluate(()=>({...localStorage}));
 assert.equal(stored['gs:rental-repository:WeirdAsHell/weirdashell.github.io'],'private-bookings');
 assert.deepEqual(JSON.parse(stored['gs:rental-repository:WeirdAsHell/weirdashell.github.io:history']),['private-bookings','garazas-studija-reservations']);
 assert(!JSON.stringify(stored).includes('test-token'));
 await page.getByLabel('Saglabātie repozitoriji').selectOption('garazas-studija-reservations');
 assert.equal(await page.getByLabel('Privātā repozitorija nosaukums').inputValue(),'garazas-studija-reservations');
 await page.getByLabel('Saglabātie repozitoriji').selectOption('private-bookings');
 assert.equal(await page.getByLabel('Privātā repozitorija nosaukums').inputValue(),'private-bookings');
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/repository-mobile.png',fullPage:true});
 await page.evaluate(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
 await page.getByRole('button',{name:'Nomas kalendārs',exact:true}).click();
 assert.equal(await page.getByLabel('Privātā repozitorija nosaukums').inputValue(),'garazas-studija-reservations');
 await page.getByLabel('Privātā repozitorija nosaukums').fill('private-bookings');await page.getByRole('button',{name:'Atvērt kalendāru'}).click();await page.getByLabel('Skats',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 if(process.env.SCREENSHOT_DIR){await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:process.env.SCREENSHOT_DIR+'/calendar-desktop.png',fullPage:true});}
 console.log('PASS: booking CRUD/conflicts/sync recovery; distinct status colors; product create/edit/cancel/delete and guarded deletion; saved repository dropdown/reload; no stored token or public code leak; mobile layout; no JS errors.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
