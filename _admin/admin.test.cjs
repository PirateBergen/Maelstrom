const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

class Sheet {
  constructor(rows=[]) { this.rows=rows.map(row=>row.slice()); }
  getLastRow() { return this.rows.length; }
  appendRow(row) { this.rows.push(row.slice()); }
  setFrozenRows() {}
  deleteRow(row) { this.rows.splice(row-1,1); }
  getRange(row,column,height=1,width=1) {
    return {
      getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>this.rows[row+i-1]?.[column+j-1]??'')),
      setValue:value=>{this.rows[row-1][column-1]=value;},
      setValues:values=>values.forEach((cells,i)=>{this.rows[row+i-1]??=[];cells.forEach((value,j)=>this.rows[row+i-1][column+j-1]=value);}),
    };
  }
}

function setup() {
  const owner='owner@example.test';
  const props=new Map([['ADMIN_ALLOWED_EMAILS',owner],['CLOUDINARY_API_KEY','test-key'],['CLOUDINARY_API_SECRET','test-secret'],['RESERVATIONS_PUBLIC_URL','https://script.google.com/macros/s/public-deployment/exec']]);
  const cache=new Map(), mail=[], remote=[];
  const sheets=new Map([
    ['Reservations',new Sheet([Array(12).fill('Header'),['2026-09-03','New','Test Guest','guest@example.test','+47 123','2026-09-17','19:00','2','Test note','website','a'.repeat(32),'']])],
    ['Archive',new Sheet([Array(12).fill('Header')])],
  ]);
  const state={email:owner,accesses:0,emailFailure:false,asset:{public_id:'test-photo',resource_type:'image',type:'upload',asset_folder:'maelstrom/gallery-submissions',tags:['maelstrom-gallery-pending','keep-this-tag'],context:{custom:{submission_id:'MS-TEST'}}}};
  const book={getSheetByName:name=>sheets.get(name),insertSheet:name=>{const sheet=new Sheet();sheets.set(name,sheet);return sheet;}};
  const context=vm.createContext({
    Date, console, RESERVATION_HEADERS:Array(12).fill('Header'),BAR_NAME:'Maelstrom',REPLY_TO_EMAIL:'contact@example.test',
    Session:{getActiveUser:()=>({getEmail:()=>state.email}),getEffectiveUser:()=>{throw new Error('SECURITY: effective user must never be used');}},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props.get(key)||null})},
    CacheService:{getScriptCache:()=>({get:key=>cache.get(key)||null,put:(key,value)=>cache.set(key,value)})},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>{state.accesses++;return book;},flush(){}},
    getReservationsSheet_:()=>{state.accesses++;return sheets.get('Reservations');},
    getArchiveSheet_:()=>{state.accesses++;return sheets.get('Archive');},
    Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>crypto.createHash('sha256').update(value).digest(),base64EncodeWebSafe:value=>Buffer.from(value).toString('base64url'),base64Encode:value=>Buffer.from(value).toString('base64'),getUuid:()=>crypto.randomUUID(),formatDate:date=>date.toISOString()},
    MailApp:{sendEmail:message=>{if(state.emailFailure)throw new Error('mail unavailable');mail.push(message);}},
    escapeHtml_:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
    HtmlService:{createHtmlOutput:html=>({html}),createHtmlOutputFromFile:()=>({setTitle(){return this;},addMetaTag(){return this;}})},
    UrlFetchApp:{fetch:(url,options)=>{
      remote.push({url,options});
      if(state.remoteFailure)throw new Error('network detail test-secret');
      if(options.method==='post')return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(state.asset)};
      return {getResponseCode:()=>state.remoteStatus||200,getContentText:()=>JSON.stringify(url.includes('/tags/')||url.includes('/moderations/')?{resources:[state.asset],next_cursor:null}:state.asset)};
    }},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'Admin.gs'),'utf8'),context);
  const session=context.adminBootstrap();
  const call=(action,extra={})=>context.adminDispatch({action,csrf:session.csrf,requestId:crypto.randomUUID(),...extra});
  return {context,props,cache,mail,remote,sheets,state,session,call};
}

test('every operation rejects anonymous/wrong users before reading data or contacting Cloudinary',()=>{
  const s=setup();
  for(const email of ['', 'attacker@example.test']) {
    s.state.email=email;
    for(const action of ['bookings','calendar','messages','photos','confirmBooking','cancelBooking','readMessage','approvePhoto','rejectPhoto']) assert.equal(s.call(action).ok,false);
    assert.throws(()=>s.context.adminBootstrap(),/Accès refusé/);
    assert.match(s.context.renderAdminPage_().html,/Accès réservé/);
  }
  assert.equal(s.state.accesses,0);assert.equal(s.remote.length,0);assert.equal(s.mail.length,0);
});

test('empty allowlist and expired/mismatched sessions fail closed',()=>{
  const s=setup();s.props.delete('ADMIN_ALLOWED_EMAILS');assert.equal(s.call('bookings').ok,false);
  s.props.set('ADMIN_ALLOWED_EMAILS','owner@example.test');s.cache.clear();assert.match(s.call('bookings').error,/Session expirée/);
  assert.equal(s.state.accesses,0);
});

test('booking list returns pagination and no cancellation credentials',()=>{
  const s=setup();const result=s.call('bookings');assert.equal(result.ok,true);assert.equal(result.data.total,1);
  assert.equal(result.data.items[0].name,'Test Guest');assert.ok(!JSON.stringify(result).includes('a'.repeat(32)));
  assert.equal(s.call('bookings',{date:'2026-09-18'}).data.items.length,0);
});

test('confirmation is idempotent and its email uses the public cancellation URL',()=>{
  const s=setup();const id=s.call('bookings').data.items[0].id;
  assert.equal(s.call('confirmBooking',{id}).ok,true);assert.equal(s.mail.length,1);
  assert.equal(s.sheets.get('Reservations').rows[1][1],'Confirmed');assert.match(s.mail[0].htmlBody,/public-deployment\/exec/);
  assert.equal(s.call('confirmBooking',{id}).ok,true);assert.equal(s.mail.length,1);
});

test('cancellation archives before deleting and a repeat does not send another email',()=>{
  const s=setup();const id=s.call('bookings').data.items[0].id;
  assert.equal(s.call('cancelBooking',{id}).ok,true);assert.equal(s.sheets.get('Reservations').rows.length,1);
  assert.equal(s.sheets.get('Archive').rows[1][1],'Cancelled by Maelstrom');assert.equal(s.mail.length,1);
  assert.equal(s.call('cancelBooking',{id}).ok,true);assert.equal(s.mail.length,1);
});

test('mail failure reports a warning without rolling back a confirmed booking',()=>{
  const s=setup();s.state.emailFailure=true;const id=s.call('bookings').data.items[0].id;
  const result=s.call('confirmBooking',{id});assert.equal(result.ok,true);assert.match(result.data.warning,/manuellement/);
  assert.equal(s.sheets.get('Reservations').rows[1][1],'Confirmed');
});

test('archiving failure never deletes an active booking',()=>{
  const s=setup();const id=s.call('bookings').data.items[0].id;
  s.sheets.get('Archive').getRange=()=>({setValues(){throw new Error('archive offline');}});
  assert.equal(s.call('cancelBooking',{id}).ok,false);assert.equal(s.sheets.get('Reservations').rows.length,2);assert.equal(s.mail.length,0);
});

test('old bookings without cancellation tokens retain stable admin ids after status changes',()=>{
  const s=setup();s.sheets.get('Reservations').rows[1][10]='';const id=s.call('bookings').data.items[0].id;
  s.call('confirmBooking',{id});assert.equal(s.call('bookings').data.items[0].id,id);
});

test('contact capture prevents spreadsheet formulas and read status is persistent',()=>{
  const s=setup();s.context.saveContactMessageForAdmin_({name:'=HYPERLINK("bad")',email:'test@example.test',subject:'Photo removal',body:'Please remove MS-TEST'});
  assert.equal(s.sheets.get('Messages').rows[1][3][0],"'");
  const message=s.call('messages').data.items[0];assert.equal(message.status,'New');
  s.call('readMessage',{id:message.id});assert.equal(s.call('messages').data.items[0].status,'Read');
});

test('gallery mutations preserve unrelated tags and update moderation plus publication tag',()=>{
  const s=setup();assert.equal(s.call('approvePhoto',{publicId:'test-photo'}).ok,true);
  const update=s.remote.find(item=>item.options.method==='post').options.payload;
  assert.equal(update.moderation_status,'approved');assert.equal(update.tags,'keep-this-tag,maelstrom-gallery');
  assert.ok(!JSON.stringify(s.call('photos',{filter:'pending'})).includes('test-secret'));
});

test('refusing never deletes resources and assets outside the gallery cannot be changed',()=>{
  const s=setup();assert.equal(s.call('rejectPhoto',{publicId:'test-photo'}).ok,true);
  assert.equal(s.remote.find(item=>item.options.method==='post').options.payload.moderation_status,'rejected');
  assert.ok(s.remote.every(item=>item.options.method!=='delete'));
  s.remote.length=0;s.state.asset.asset_folder='unrelated';s.state.asset.tags=['other'];
  assert.equal(s.call('approvePhoto',{publicId:'test-photo'}).ok,false);assert.equal(s.remote.length,1);
});

test('missing credentials and provider quota errors are understandable, not raw provider responses',()=>{
  const s=setup();s.props.delete('CLOUDINARY_API_SECRET');assert.match(s.call('photos',{filter:'pending'}).error,/pas encore connecté/);assert.equal(s.remote.length,0);
  s.props.set('CLOUDINARY_API_SECRET','test-secret');s.state.remoteStatus=429;assert.match(s.call('photos',{filter:'pending'}).error,/Limite Cloudinary/);
});

test('a repeated mutation request id is replayed without another mutation',()=>{
  const s=setup();const id=s.call('bookings').data.items[0].id;const requestId=crypto.randomUUID();
  s.call('confirmBooking',{id,requestId});s.call('confirmBooking',{id,requestId});assert.equal(s.mail.length,1);
});

test('provider exceptions never expose credentials in an administration error',()=>{
  const s=setup();s.state.remoteFailure=true;const result=s.call('photos',{filter:'pending'});
  assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes('test-secret'));assert.match(result.error,/indisponible/);
});

test('ambiguous legacy bookings are not mutated',()=>{
  const s=setup();s.sheets.get('Reservations').rows[1][10]='';s.sheets.get('Reservations').appendRow(s.sheets.get('Reservations').rows[1]);
  const id=s.call('bookings').data.items[0].id;assert.equal(s.call('cancelBooking',{id}).ok,false);
  assert.equal(s.sheets.get('Reservations').rows.length,3);assert.equal(s.mail.length,0);
});

test('unknown actions cannot call arbitrary Apps Script functions',()=>{
  const s=setup();for(const action of ['constructor','__proto__','installDailyArchiveTrigger','doPost'])assert.equal(s.call(action).ok,false);
  assert.equal(s.state.accesses,0);
});

test('private UI renders visitor content as text, with no third-party scripts',()=>{
  const html=fs.readFileSync(path.join(__dirname,'Admin.html'),'utf8');
  assert.ok(!html.includes('innerHTML'));assert.ok(!/<script[^>]+src=/.test(html));
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match=>match[1]);scripts.forEach(script=>new Function(script));
});

test('calendar returns entire visible range including archives, excluding cancellations, without mutation',()=>{
  const s=setup(),base=s.sheets.get('Reservations').rows[1];
  for(let i=0;i<85;i++){const row=base.slice();row[2]='Guest '+i;row[10]='token-'+i;row[6]=i%2?'19:15':'19:30';s.sheets.get('Reservations').appendRow(row);}
  const past=base.slice();past[1]='Archived';past[5]='2026-09-16';past[10]='past-token';s.sheets.get('Archive').appendRow(past);
  const cancelled=base.slice();cancelled[1]='Cancelled by guest';cancelled[10]='cancel-token';s.sheets.get('Archive').appendRow(cancelled);
  s.sheets.get('Archive').appendRow(base); // transient archive duplicate must not count twice
  const result=s.call('calendar',{start:'2026-09-14',end:'2026-09-20'});
  assert.equal(result.ok,true);assert.equal(result.data.items.length,87);assert.equal(result.data.items[0].archive,true);
  assert.equal(result.data.items.filter(item=>item.archive).length,1);
  assert.ok(!JSON.stringify(result).includes('past-token'));assert.equal(s.mail.length,0);assert.equal(s.remote.length,0);
  assert.ok(!s.sheets.has('Admin log'));assert.equal(s.call('calendar',{start:'2026-10-01',end:'2026-10-31'}).data.items.length,0);
});

test('calendar validates ranges before reading sheets, requires session, and preserves duplicate legacy bookings',()=>{
  const s=setup();
  for(const [start,end] of [['2026-02-30','2026-03-01'],['2026-09-20','2026-09-01'],['2026-01-01','2026-12-31'],['',''],['<script>','2026-09-01']])assert.equal(s.call('calendar',{start,end}).ok,false);
  assert.equal(s.state.accesses,0);
  const row=s.sheets.get('Reservations').rows[1];row[10]='';s.sheets.get('Reservations').appendRow(row);
  assert.equal(s.call('calendar',{start:'2026-09-17',end:'2026-09-17'}).data.items.length,2);
  s.cache.clear();assert.match(s.call('calendar',{start:'2026-09-17',end:'2026-09-17'}).error,/Session expirée/);
});

function calendarModel() {
  const html=fs.readFileSync(path.join(__dirname,'Admin.html'),'utf8');
  return vm.runInNewContext(html.match(/<script id="calendarMath">([\s\S]*?)<\/script>/)[1]+'\nCalendar;', {Intl,Date});
}

test('calendar handles Monday weeks, leap years, 42-day months and year boundaries',()=>{
  const c=calendarModel();
  assert.equal(c.range('2026-09-06','week').start,'2026-08-31');
  assert.equal(c.range('2026-12-31','week').end,'2027-01-03');
  assert.equal(c.range('2026-03-01','month').days.length,42);
  assert.ok(c.range('2028-02-10','month').days.includes('2028-02-29'));
  assert.equal(c.move('2026-01-31','month',1),'2026-02-01');
  assert.equal(c.move('2026-12-31','month',1),'2027-01-01');
  assert.equal(c.move('2026-01-01','day',-1),'2025-12-31');
  assert.equal(c.valid('2026-02-30'),false);assert.equal(c.valid('2028-02-29'),true);
});

test('calendar uses Bergen day regardless of browser timezone and keeps exact arrival hours',()=>{
  const c=calendarModel();
  assert.equal(c.today(new Date('2026-09-03T22:30:00Z')),'2026-09-04');
  assert.equal(c.today(new Date('2026-01-03T22:30:00Z')),'2026-01-03');
  assert.equal(c.range('2026-03-29','week').days.length,7);
  assert.equal(c.range('2026-10-25','week').days.length,7);
  assert.equal(c.hour('00:15'),0);assert.equal(c.hour('19:45'),19);assert.equal(c.hour('25:00'),null);
  assert.equal(c.kind({status:'New'}),'pending');assert.equal(c.kind({status:'Confirmed'}),'confirmed');assert.equal(c.kind({archive:true,status:'Confirmed'}),'archived');
  assert.equal(c.guests([{guests:'2'},{guests:'4'},{guests:'invalid'}]),6);
});

// Lightweight DOM doubles exercise rendering and navigation without opening a browser
// or connecting to real Google Sheets / customer data.
function calendarUI() {
  class Element {
    constructor(tag='div') {this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.value='';this.hidden=false;this.open=false;this.offsetTop=0;this.offsetHeight=0;this.className='';this.textContent='';this.classList={toggle:()=>{}};}
    append(...nodes){this.children.push(...nodes);}
    prepend(...nodes){this.children.unshift(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(event,callback){this.listeners[event]=callback;}
    showModal(){this.open=true;}
    close(){this.open=false;this.listeners.close?.();}
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    querySelectorAll(selector){const all=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);return all.filter(node=>selector==='*'||node.tagName===selector||selector===`[data-hour="${node.dataset.hour}"]`);}
  }
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  get('bookingScope').value='active';get('photoScope').value='pending';
  const tabs=['bookings','calendar','photos','messages'].map(tab=>{const node=new Element('button');node.dataset.tab=tab;return node;});
  const views=['day','week','month'].map(view=>{const node=new Element('button');node.dataset.view=view;return node;});
  const document={getElementById:get,createElement:tag=>new Element(tag),addEventListener(){},querySelectorAll:selector=>selector==='[data-tab]'?tabs:selector==='[data-view]'?views:[...nodes.values(),...tabs,...views]};
  const context=vm.createContext({document,window:{addEventListener(){}},Intl,Date,crypto,console,setTimeout,clearTimeout});
  const html=fs.readFileSync(path.join(__dirname,'Admin.html'),'utf8');
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))vm.runInContext(script[1],context);
  const run=code=>vm.runInContext(code,context);
  run("state.csrf='test-session';state.tab='calendar';state.calendarDate='2026-09-17';");
  return {get,run,context,tabs,views};
}

test('calendar renders all simultaneous arrivals, opens details, and month overflow opens day',()=>{
  const ui=calendarUI();
  ui.context.items=Array.from({length:7},(_,i)=>({id:String(i),name:i===0?'<img onerror=alert(1)>':'Guest '+i,date:'2026-09-17',time:i===6?'00:15':'19:15',guests:'2',status:'New',archive:false,email:'test@example.test',notes:'Notes'}));
  ui.run("renderCalendar(items,Calendar.range(state.calendarDate,'day'));");
  let events=ui.get('calendarGrid').querySelectorAll('button').filter(node=>node.className.startsWith('calendar-event'));
  assert.equal(events.length,7);assert.equal(ui.get('calendarSummary').children[1].textContent,'14 personne(s)');
  assert.equal(ui.get('calendarGrid').querySelectorAll('img').length,0);
  events[0].listeners.click();assert.equal(ui.get('calendarDetail').open,true);
  assert.equal(ui.get('calendarDetailBody').querySelector('details').open,true);
  ui.get('closeCalendarDetail').onclick();assert.equal(ui.get('calendarDetail').open,false);
  ui.run("state.calendarView='week';renderCalendar(items,Calendar.range(state.calendarDate,'week'));");
  assert.equal(ui.get('calendarGrid').querySelector('thead').querySelectorAll('th').length,8);
  ui.run("state.calendarView='month';renderCalendar(items,Calendar.range(state.calendarDate,'month'));");
  events=ui.get('calendarGrid').querySelectorAll('button').filter(node=>node.className.startsWith('calendar-event'));
  assert.equal(events.length,3);
  const more=ui.get('calendarGrid').querySelectorAll('button').find(node=>node.className==='calendar-more');assert.equal(more.textContent,'+ 4 autres');
  ui.run('load=()=>{};');more.listeners.click();assert.equal(ui.run('state.calendarView'),'day');assert.equal(ui.run('state.calendarDate'),'2026-09-17');
});

test('calendar load uses authenticated range and clears records on failure or tab change',async()=>{
  const ui=calendarUI();
  ui.run("rpc=async(method,query)=>{globalThis.lastQuery=query;return {ok:true,data:{items:[]}};};");
  await ui.run('load(true)');assert.equal(ui.context.lastQuery.action,'calendar');assert.equal(ui.context.lastQuery.start,'2026-09-17');
  assert.equal(ui.get('records').hidden,true);assert.equal(ui.get('next').hidden,true);assert.equal(ui.get('calendarGrid').attributes['aria-busy'],'false');
  assert.match(ui.get('feedback').textContent,/Aucune réservation/);
  ui.run("rpc=async()=>({ok:false,error:'Session expirée'});");await ui.run('load(true)');
  assert.equal(ui.get('calendarGrid').children.length,0);assert.equal(ui.get('calendarSummary').children.length,0);assert.equal(ui.get('feedback').textContent,'Session expirée');
  ui.run("state.tab='messages';rpc=async()=>({ok:true,data:{items:[],total:0,next:null}});");await ui.run('load(true)');
  assert.equal(ui.get('calendarPanel').hidden,true);assert.equal(ui.get('records').hidden,false);
});

test('the public entry only accepts a Google Apps Script deployment URL',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../admin-entry.js'),'utf8');
  for(const [url,valid] of [['https://evil.example/exec',false],['javascript:alert(1)',false],['https://script.google.com.evil.example/macros/s/abc/exec',false],['https://user:pass@script.google.com/macros/s/abc/exec',false],['https://script.google.com/macros/s/private/exec',true]]) {
    const nodes={adminOpen:{hidden:true},adminSetup:{hidden:false}};
    vm.runInNewContext(code,{URL,window:{MAELSTROM_ADMIN_URL:url},document:{getElementById:id=>nodes[id]}});
    assert.equal(nodes.adminOpen.hidden,!valid);if(valid)assert.match(nodes.adminOpen.href,/action=admin$/);
  }
});
