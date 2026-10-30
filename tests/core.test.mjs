import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cloneSeeds, compareAggregates, compareDays, validateCase, validateEntry, validateDay,
  validateModelOutput, parseCsv, buildDraft, safeUrl, validDate, scopeDays, LAKSHMI_QUOTE, PUBLIC_QUOTE
} from '../public/core.mjs';

// Published case values come only from the linked articles. The small in-memory
// rows in validation tests are algorithmic test inputs, not real worker records.
const cases = cloneSeeds();
const lakshmi = () => structuredClone(cases[0]);
const vikas = () => structuredClone(cases[1]);
let n=0; const id=()=>`test-${++n}`;

test('published case calculations preserve provenance and scope',()=>{
  const a=validateCase(lakshmi()), b=validateCase(vikas());
  assert.equal(compareAggregates(a).delta,5);assert.equal(compareAggregates(a).sameSource,true);
  assert.equal(compareAggregates(b).delta,7);assert.equal(compareAggregates(b).sameSource,true);
  assert.equal(a.scopeStart,'2022-05-01');assert.equal(a.scopeEnd,'2022-05-15');
  assert.equal(scopeDays(a.scopeStart,a.scopeEnd,a.period),15);
  assert.equal(a.days.length,0);assert.equal(b.days.length,0);
  const anita=validateCase(cases[2]), kesar=validateCase(cases[3]);
  assert.equal(compareAggregates(anita).delta,2);assert.equal(compareAggregates(anita).sameSource,true);
  assert.equal(compareAggregates(kesar).status,'incomplete');assert.equal(kesar.entries[0].value,13);assert.equal(kesar.days.length,0);
});
test('incomplete aggregates remain unknown, not zero',()=>{
  const c=lakshmi();c.entries.pop();const result=compareAggregates(c);
  assert.equal(result.status,'incomplete');assert.equal('delta' in result,false);
});
test('duplicate source entries are not silently summed or selected',()=>{
  const c=lakshmi();c.entries.push({...c.entries[0],id:id()});
  assert.equal(compareAggregates(c).status,'ambiguous');
  assert.match(buildDraft(c),/no difference was calculated/i);
});
test('day, scope and numeric constraints reject impossible and out-of-range inputs',()=>{
  const c=lakshmi();
  assert.equal(validDate('2022-05-15'),true);assert.equal(validDate('2022-02-30'),false);
  assert.throws(()=>validateDay({id:id(),date:'2022-05-16',side:'worker',status:'worked',source:'unit test'},c.period,c.scopeStart,c.scopeEnd),/case period/i);
  assert.throws(()=>validateEntry({id:id(),kind:'worked',value:16,sourceType:'other',source:'unit test'},c.period,c.scopeStart,c.scopeEnd),/case period/i);
  assert.throws(()=>validateEntry({id:id(),kind:'worked',value:'',sourceType:'other',source:'unit test'},c.period,c.scopeStart,c.scopeEnd),/number of days/i);
  assert.throws(()=>validateCase({...c,scopeEnd:'2022-06-01'}),/same month/i);
});
test('unknown and missing register rows never become an absence',()=>{
  const c=lakshmi();c.days=[
    {id:id(),date:'2022-05-02',side:'worker',status:'worked',source:'algorithmic test'},
    {id:id(),date:'2022-05-03',side:'worker',status:'worked',source:'algorithmic test'},
    {id:id(),date:'2022-05-03',side:'register',status:'unknown',source:'algorithmic test'}
  ];
  assert.deepEqual(compareDays(c).map(x=>x.state),['no-register-entry','unknown']);
  assert.doesNotMatch(buildDraft(c),/2022-05-02:.*absent/i);
});
test('explicit disagreement and internally conflicting register rows remain distinct',()=>{
  const c=lakshmi();c.days=[
    {id:id(),date:'2022-05-02',side:'worker',status:'worked',source:'algorithmic test'},
    {id:id(),date:'2022-05-02',side:'register',status:'absent',source:'algorithmic test'},
    {id:id(),date:'2022-05-03',side:'register',status:'absent',source:'algorithmic test'},
    {id:id(),date:'2022-05-03',side:'register',status:'present',source:'algorithmic test'}
  ];
  assert.deepEqual(compareDays(c).map(x=>x.state),['disagrees','conflicting-register']);
});
test('model grounding verifies verbatim quote and numeric token, but never assigns a category',()=>{
  const raw=JSON.stringify({first:{value:9,quote:'nine days'},second:{value:4,quote:'four days'}});
  const result=validateModelOutput(raw,LAKSHMI_QUOTE,15);
  assert.deepEqual(result.candidates.map(x=>x.value),[9,4]);
  assert.ok(result.candidates.every(x=>!('kind' in x)&&x.requiresReview));
  assert.deepEqual(validateModelOutput(JSON.stringify({first:{value:9,quote:'fabricated nine days'}}),LAKSHMI_QUOTE).candidates,[]);
  assert.deepEqual(validateModelOutput(JSON.stringify({first:{value:7,quote:'four days'}}),LAKSHMI_QUOTE).candidates,[]);
  assert.deepEqual(validateModelOutput(JSON.stringify({first:{value:4,quote:'four days'}}),LAKSHMI_QUOTE,3).candidates,[]);
  for (const quote of ['twenty seven days','سبعة عشر يومًا']) {
    assert.deepEqual(validateModelOutput(JSON.stringify({first:{value:7,quote}}),quote).candidates,[]);
  }
  assert.equal(validateModelOutput(JSON.stringify({first:{value:17,quote:'سبعة عشر يومًا'}}),'سبعة عشر يومًا').candidates[0].value,17);
  assert.deepEqual(validateModelOutput(JSON.stringify({first:{value:14,quote:'14.5 days'}}),'14.5 days').candidates,[]);
  assert.throws(()=>validateModelOutput('not json',PUBLIC_QUOTE),/reviewable format/i);
});
test('a retained context must include the verbatim quotation',()=>{
  const c=lakshmi(), e={id:id(),kind:'worked',value:9,sourceType:'published',source:'Article 14',quote:'nine days',context:LAKSHMI_QUOTE};
  assert.equal(validateEntry(e,c.period,c.scopeStart,c.scopeEnd).context,LAKSHMI_QUOTE);
  assert.throws(()=>validateEntry({...e,context:'Different context'},c.period,c.scopeStart,c.scopeEnd),/quotation must occur/i);
});
test('CSV parsing handles quoting and rejects malformed/out-of-scope rows atomically',()=>{
  const c=lakshmi();
  const rows=parseCsv('date,side,status,source\r\n2022-05-02,worker,worked,"source, quoted"\r\n',c.period,id,c.scopeStart,c.scopeEnd);
  assert.equal(rows.length,1);assert.equal(rows[0].source,'source, quoted');
  assert.throws(()=>parseCsv('date,side,status,source\n2022-05-16,worker,worked,x\n',c.period,id,c.scopeStart,c.scopeEnd),/case period/i);
  assert.throws(()=>parseCsv('date,side,status,source\n2022-05-02,worker,absent,x\n',c.period,id,c.scopeStart,c.scopeEnd),/not valid for the selected side/i);
  assert.throws(()=>parseCsv('date,side,status,source\n2022-05-02,worker,worked,"unterminated',c.period,id,c.scopeStart,c.scopeEnd),/not closed/i);
  const day={...rows[0],sourceFile:'records.csv',sourceHash:'a'.repeat(64)};
  assert.equal(validateDay(day,c.period,c.scopeStart,c.scopeEnd).sourceHash,'a'.repeat(64));
  assert.throws(()=>validateDay({...day,sourceHash:'wrong'},c.period,c.scopeStart,c.scopeEnd),/hash is invalid/i);
});
test('links allow only http/https; draft is clearly a human-reviewed unsent request',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('file:///tmp/a'),'');assert.equal(safeUrl('https://user:password@example.org/'),'');
  const draft=buildDraft(lakshmi());assert.match(draft,/Not sent automatically/i);assert.match(draft,/not legal advice/i);
  assert.match(draft,/both counts come from the same source/i);assert.doesNotMatch(draft,/2022-05-0[1-9]:/);
});
