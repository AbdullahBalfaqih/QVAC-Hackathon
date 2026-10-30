"""Real QVAC race check: switch between the two published cases during inference."""
from playwright.sync_api import sync_playwright
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    page.goto('http://127.0.0.1:4174/',wait_until='networkidle')
    page.locator('.status-dot.ready').wait_for(timeout=90000)
    page.locator('[data-view="assistant"]').first.click()
    with page.expect_response(lambda r:r.url.endswith('/api/extract'),timeout=120000) as info:
        page.locator('[data-action="run-ai"]').click()
        page.locator('#case-select').select_option('published-vikas-2023')
    response=info.value
    assert response.status==200, response.status
    page.get_by_text('The case or source changed during analysis; the old result was discarded.').wait_for(timeout=10000)
    assert page.locator('.candidate').count()==0
    assert '14 days' in page.locator('#ai-text').input_value()
    browser.close()
result={'test':'Switch to published Vikas case while a real QVAC request for published Lakshmi is in flight','http_status':response.status,'stale_candidates_shown':False,'pass':True}
(root/'evidence'/'ui-race-test-en.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
