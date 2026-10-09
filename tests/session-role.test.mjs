import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

test('account role synchronization replaces stale permissions without discarding tokens', () => {
  const data = new Map();
  const storage = {getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key)};
  const events = [];
  const output = ts.transpileModule(readFileSync(new URL('../src/lib/auth.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const api = {};
  new Function('exports','window','localStorage','Event',output)(api,{dispatchEvent:event=>events.push(event.type)},storage,Event);
  api.setSession({id:'cc',role:'MANAGER',name:'Callcenter'},'access','refresh');
  const before = api.getAuthSessionVersion();
  api.updateSessionUser({id:'cc',role:'CALLCENTER'});
  assert.equal(api.getUser().role,'CALLCENTER');
  assert.equal(api.getUser().name,'Callcenter');
  assert.equal(api.getAccessToken(),'access');
  assert.equal(api.getRefreshToken(),'refresh');
  assert.equal(api.getAuthSessionVersion(),before+1);
  api.updateSessionUser({id:'cc',role:'CALLCENTER',name:'Updated'});
  assert.equal(api.getAuthSessionVersion(),before+1);
  assert.equal(events.at(-1),'crm:session-changed');
});
