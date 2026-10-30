"""Additional real-case UI checks: English navigation, backup round trip and responsive views."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parent.parent;base='http://127.0.0.1:4174'
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
    page=context.new_page();errors=[];bad=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:bad.append((r.url,r.status)) if r.status>=400 else None)
    page.on('dialog',lambda d:d.accept())
    page.goto(base+'/',wait_until='networkidle')
    for view in ['overview','records','assistant','report','method']:
        page.locator(f'[data-view="{view}"]').first.click()
        text=page.locator('body').inner_text()
        assert not re.search(r'[\u0600-\u06ff]',text),f'Unexpected Arabic UI in {view}'
        assert page.locator('h1').count()==1
        checks.append(f'{view} renders in English')
    with page.expect_download() as info:page.locator('[data-action="export-case"]').click()
    saved=info.value.path();data=json.loads(saved.read_text())
    assert data['schema']=='athar.case.v1'
    assert [e['value'] for e in data['case']['entries']]==[9,4]
    checks.append('Export contains the actual published counts and schema')
    page.locator('#json-file').set_input_files({'name':'public-case.json','mimeType':'application/json','buffer':saved.read_bytes()})
    page.get_by_text('A new copy of the case was imported. Review its sources.').wait_for(timeout=5000)
    stored=page.evaluate("JSON.parse(localStorage.getItem('athar.attendance.v1'))")
    copied=next(c for c in stored['cases'] if c['id']==stored['currentId'])
    assert copied['published'] is False and [e['value'] for e in copied['entries']]==[9,4]
    checks.append('Import creates a local copy without claiming independent verification')
    assert not errors and not bad,(errors,bad)
    context.close()
    for width,height in [(320,740),(375,812),(768,1024),(1024,768),(1440,900)]:
        ctx=browser.new_context(viewport={'width':width,'height':height})
        pg=ctx.new_page();pg.goto(base+'/',wait_until='networkidle')
        for view in ['overview','records','assistant','report','method']:
            pg.locator(f'[data-view="{view}"]').first.click()
            sizes=pg.evaluate('({scroll:document.documentElement.scrollWidth,inner:window.innerWidth})')
            assert sizes['scroll']<=sizes['inner']+1,(width,view,sizes)
        checks.append(f'No horizontal overflow at {width}px in all five views')
        ctx.close()
    browser.close()
result={'checks':checks,'browser_errors':errors,'bad_responses':bad,'pass':True}
(root/'evidence'/'ui-local-workflows-en.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
