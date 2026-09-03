const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const path=require('node:path');
class Sheet {
  constructor(){this.rows=[Array(15).fill('Header')];}
  getLastRow(){return this.rows.length;}
  appendRow(row){this.rows.push([...row]);}
  deleteRow(row){this.rows.splice(row-1,1);}
  getRange(row,col,height=1,width=1){return {
    getValues:()=>Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>this.rows[row+i-1]?.[col+j-1]??'')),
    setValue:value=>{if(this.failWrite)throw Error('private error');this.rows[row-1][col-1]=value;},
    setValues:values=>values.forEach((cells,i)=>{this.rows[row+i-1]??=[];cells.forEach((v,j)=>this.rows[row+i-1][col+j-1]=v);})
  };}
}
function setup(){
  const active=new Sheet(),archive=new Sheet(),state={email:'owner@test.example',sent:[],created:[],deleted:[],releases:0};
  const props=new Map([['ADMIN_ALLOWED_EMAILS',state.email],['RESERVATIONS_PUBLIC_URL','https://script.google.com/macros/s/public-test/exec']]);
  const triggers=['archivePastReservations','archivePastReservations_','sendReservationReminders','sendReservationReminders_','unrelated'].map(name=>({getHandlerFunction:()=>name}));
  const c=vm.createContext({Date,console:{error(){}},
    Session:{getActiveUser:()=>({getEmail:()=>state.email}),getEffectiveUser:()=>{throw Error('Never use effective user');},getScriptTimeZone:()=> 'Europe/Oslo'},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>props.get(key)||null})},
    LockService:{getScriptLock:()=>({waitLock(){if(state.lockFailure)throw Error('private error');},releaseLock(){state.releases++;}})},
    Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>crypto.createHash('sha256').update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url')},
    ScriptApp:{getProjectTriggers:()=>triggers,deleteTrigger:t=>state.deleted.push(t.getHandlerFunction()),newTrigger:name=>{const builder={timeBased:()=>builder,everyDays:()=>builder,atHour:()=>builder,everyMinutes:()=>builder,create:()=>state.created.push(name)};return builder;}},
    MailApp:{sendEmail:mail=>state.sent.push(mail)}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../Code.gs'),'utf8'),c);
  c.getReservationsSheet_=()=>active;c.getArchiveSheet_=()=>archive;c.json_=value=>value;
  c.isReservationDateAllowed_=()=>true;c.isReservationTimeAllowed_=()=>true;
  c.sendGuestConfirmation_=()=>{state.sent.push('guest');if(state.guestFailure)throw Error('secret error');};
  c.sendOwnerNotification_=()=>state.sent.push('owner');
  const data={name:'Guest',email:'guest@test.example',date:'2026-09-17',time:'19:00',guests:'2',submissionId:'a'.repeat(32)};
  return {c,active,archive,state,props,data,post:(extra={})=>c.doPost({parameter:{...data,...extra}})};
}
test('public maintenance functions fail closed without an allowed active identity',()=>{
  for(const email of ['', 'other@test.example'])for(const name of ['archivePastReservations','installDailyArchiveTrigger','sendReservationReminders','installReservationReminderTrigger']){
    const s=setup();s.state.email=email;assert.throws(()=>s.c[name]({triggerUid:'fake'}));assert.equal(s.state.created.length,0);assert.equal(s.state.sent.length,0);
  }
  const s=setup();s.props.clear();assert.throws(()=>s.c.installDailyArchiveTrigger());
});
test('installers migrate only their own triggers to private callbacks',()=>{
  const s=setup();s.c.installDailyArchiveTrigger();s.c.installReservationReminderTrigger();
  assert.deepEqual(s.state.created,['archivePastReservations_','sendReservationReminders_']);
  assert.equal(s.state.deleted.length,4);assert.ok(!s.state.deleted.includes('unrelated'));
});
test('email failure keeps receipt successful and retry creates no duplicate',()=>{
  const s=setup();s.state.guestFailure=true;
  assert.equal(s.post().notificationStatus,'guest_email_failed');
  s.c.isReservationDateAllowed_=()=>false;
  assert.equal(s.post().duplicate,true);assert.equal(s.active.rows.length,2);
  assert.deepEqual(s.state.sent,['guest','owner']);assert.equal(s.active.rows[1][14],'guest_email_failed');
});
test('same reference with changed details fails; distinct references allow separate bookings',()=>{
  const s=setup();assert.equal(s.post().ok,true);assert.equal(s.post({guests:'3'}).ok,false);
  assert.equal(s.post({submissionId:'b'.repeat(32)}).ok,true);assert.equal(s.active.rows.length,3);
});
test('archived submission cannot be recreated by a retry',()=>{
  const s=setup();s.post();s.archive.appendRow(s.active.rows.pop());
  assert.equal(s.post().duplicate,true);assert.equal(s.active.rows.length,1);
});
test('legacy clients receive a limited ten-minute duplicate safeguard',()=>{
  const s=setup();s.post({submissionId:''});assert.equal(s.post({submissionId:''}).duplicate,true);
  s.active.rows[1][0]=new Date(Date.now()-11*60*1000).toISOString();
  assert.equal(s.post({submissionId:''}).duplicate,undefined);assert.equal(s.active.rows.length,3);
});
test('validation and failures before append do not claim receipt; after append they do',()=>{
  const s=setup();assert.equal(s.post({email:''}).ok,false);assert.equal(s.post({submissionId:'bad'}).ok,false);
  s.state.lockFailure=true;assert.equal(s.post().ok,false);assert.equal(s.state.releases,2);
  s.state.lockFailure=false;s.active.failWrite=true;
  const result=s.post();assert.equal(result.received,true);assert.equal(result.notificationStatus,'unknown');
  assert.ok(!JSON.stringify(result).includes('private'));
});
test('private scheduled reminder works without interactive login but only sends confirmed unsent rows',()=>{
  const s=setup();s.post();const base=s.active.rows[1];
  s.active.rows=[s.active.rows[0],...['New','Confirmed','Cancelled','Confirmed'].map(status=>{const row=[...base];row[1]=status;return row;})];
  s.active.rows[4][11]='already sent';s.state.email='';s.state.sent=[];
  s.c.reservationDateTime_=()=>new Date(Date.now()+24*3600000);
  s.c.sendGuestReminder_=r=>s.state.sent.push(r.email);
  s.c.sendReservationReminders_();assert.equal(s.state.sent.length,1);assert.ok(s.active.rows[2][11]);
  s.c.sendReservationReminders_();assert.equal(s.state.sent.length,1);
});
test('one failed reminder does not prevent another booking reminder',()=>{
  const s=setup();s.post();s.active.rows[1][1]='Confirmed';s.active.appendRow(s.active.rows[1]);
  s.c.reservationDateTime_=()=>new Date(Date.now()+24*3600000);let calls=0;
  s.c.sendGuestReminder_=()=>{if(++calls===1)throw Error('mail failure');};
  s.c.sendReservationReminders_();assert.equal(calls,2);assert.equal(s.active.rows[1][11],'');assert.ok(s.active.rows[2][11]);
});
test('reminder cancellation links use public deployment, not execution context',()=>{
  const s=setup();s.c.sendGuestReminder_({name:'Guest',email:'guest@test.example',cancellationToken:'token'});
  assert.match(s.state.sent[0].htmlBody,/public-test\/exec\?action=cancel/);
  s.props.delete('RESERVATIONS_PUBLIC_URL');assert.throws(()=>s.c.sendGuestReminder_({}));
});
test('archiving preserves all retry and notification columns',()=>{
  const s=setup();s.post({date:'2000-01-01'});const original=[...s.active.rows[1]];
  s.c.archivePastReservations_();assert.equal(s.active.rows.length,1);assert.equal(s.archive.rows[1].length,15);
  assert.deepEqual(s.archive.rows[1].slice(10),original.slice(10));
});
test('admin cancellation with the real backend schema preserves retry protection and keeps private fields off the calendar',()=>{
  const s=setup();s.post();const original=[...s.active.rows[1]];
  s.c.SpreadsheetApp={flush(){}};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'Admin.gs'),'utf8'),s.c);
  const items=s.c.adminCalendar_({start:'2026-09-01',end:'2026-09-30'}).items;
  assert.equal(items.length,1);assert.ok(!JSON.stringify(items).includes(original[13]));
  s.c.adminChangeBooking_({id:items[0].id},'Cancelled by Maelstrom');
  assert.deepEqual(s.archive.rows[1].slice(10),original.slice(10));
  assert.equal(s.post().duplicate,true);assert.equal(s.active.rows.length,1);
});
test('client retry reference survives reload without storing form personal data',async()=>{
  const storage=new Map();const load=()=>{const c=vm.createContext({window:{},crypto:crypto.webcrypto,TextEncoder,Uint8Array,Date,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../reservation-submission.js'),'utf8'),c);return c.window.MaelstromReservationSubmission;};
  const form=new FormData();form.set('email','personal@example.test');form.set('submittedAt','first');
  let client=load();const first=await client.reference(form);assert.match(first,/^[a-f0-9]{32}$/);
  form.set('submittedAt','second');assert.equal(await client.reference(form),first);
  client=load();assert.equal(await client.reference(form),first);assert.ok(![...storage.values()].join('').includes('personal'));
  form.set('guests','4');assert.notEqual(await client.reference(form),first);
  client.clear();assert.equal(storage.size,0);assert.notEqual(await client.reference(form),first);
});
