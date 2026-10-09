import test from 'node:test';
import assert from 'node:assert/strict';
import {companyFromCommand} from './companyCommand.js';

test('extracts company names from supported search commands',()=>{
  for(const [command,company] of [
    ['Find alumni who work at Microsoft','Microsoft'],
    ['Search Tata Consultancy Services alumni','Tata Consultancy Services'],
    ['Find alumni at Godrej and invite them','Godrej'],
    ['  Infosys!  ','Infosys'],
  ]) assert.equal(companyFromCommand(command),company);
});
test('rejects empty input and unsupported action commands',()=>{
  for(const command of ['', 'Find everyone','Send invitations','Invite all alumni','x'.repeat(101)])
    assert.equal(companyFromCommand(command),null);
});
