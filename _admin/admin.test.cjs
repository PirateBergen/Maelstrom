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
    for(const action of ['bookings','messages','photos','confirmBooking','cancelBooking','readMessage','approvePhoto','rejectPhoto']) assert.equal(s.call(action).ok,false);
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
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);scripts.forEach(script=>new Function(script));
});

test('the public entry only accepts a Google Apps Script deployment URL',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../admin-entry.js'),'utf8');
  for(const [url,valid] of [['https://evil.example/exec',false],['javascript:alert(1)',false],['https://script.google.com.evil.example/macros/s/abc/exec',false],['https://user:pass@script.google.com/macros/s/abc/exec',false],['https://script.google.com/macros/s/private/exec',true]]) {
    const nodes={adminOpen:{hidden:true},adminSetup:{hidden:false}};
    vm.runInNewContext(code,{URL,window:{MAELSTROM_ADMIN_URL:url},document:{getElementById:id=>nodes[id]}});
    assert.equal(nodes.adminOpen.hidden,!valid);if(valid)assert.match(nodes.adminOpen.href,/action=admin$/);
  }
});
