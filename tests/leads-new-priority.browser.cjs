// Isolated UI regression: all API requests are intercepted; no messages or live mutations.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 try {
  const context = await browser.newContext({ viewport: {width:1600,height:1000}, serviceWorkers:'block' });
  await context.addInitScript(() => {
   localStorage.setItem('accessToken','isolated-priority-test');
   localStorage.setItem('user',JSON.stringify({id:'callcenter',name:'Fixture',role:'CALLCENTER'}));
   localStorage.setItem('crm-locale','tr');
  });
  await context.routeWebSocket('**/*',s=>s.close());
  let listRequests=0;
  const rows=[
   {id:'hot-fixture',fullName:'Yeni Lagoon Başvurusu',phone:'+905000000000',status:'NEW',source:'Lagoon Verde',newPriorityAt:'2026-10-23T09:00:00Z'},
   {id:'overdue-fixture',fullName:'Gecikmiş Takip',phone:'+905000000001',status:'WORKING',nextFollowUpAt:'2026-01-01T09:00:00Z',newPriorityAt:null},
  ];
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===origin && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/__nextjs') || !['fetch','xhr'].includes(req.resourceType()) || req.headers().rsc==='1')) return route.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,OPTIONS'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   assert.equal(req.method(),'GET','UI test must never mutate data');
   const pathname=url.pathname.replace(/^\/api(?=\/)/,'');
   let data={};
   if(pathname==='/leads'){listRequests++;data={items:rows,total:2,totalPages:1,page:1,pageSize:25};}
   else if(pathname==='/notifications')data=[];
   else if(pathname==='/notifications/unread-count')data={unread:0};
   return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();
  await page.goto(origin+'/leads');
  await page.getByRole('link',{name:'Yeni Lagoon Başvurusu',exact:true}).waitFor();
  assert.ok(listRequests>0);
  assert.equal(await page.getByTestId('new-lead-badge').count(),1);
  assert.equal(await page.getByTestId('new-lead-badge').innerText(),'Yeni');
  const bodyRows=page.locator('tbody tr');
  assert.match(await bodyRows.nth(0).innerText(),/Yeni Lagoon Başvurusu/);
  assert.match(await bodyRows.nth(1).innerText(),/Gecikmiş Takip/);
  console.log('PASS: callcenter sees a distinct Yeni badge only on the priority lead; server row order retained.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
