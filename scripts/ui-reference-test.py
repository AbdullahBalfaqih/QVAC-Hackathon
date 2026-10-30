"""Reference-inspired interface regression; uses only built-in published reports.
Generated images are decorative and explicitly disclosed. No mock worker records are created.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

ROOT = Path(__file__).resolve().parent.parent
BASE = 'http://127.0.0.1:4174'
checks = []

def check(value, description):
    if not value:
        raise AssertionError(description)
    checks.append(description)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1200, 'height': 853}, device_scale_factor=1)
    page = context.new_page()
    errors, bad, external = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: bad.append((response.url, response.status)) if response.status >= 400 else None)
    page.on('request', lambda request: external.append(request.url) if not request.url.startswith(BASE) else None)
    page.goto(BASE + '/', wait_until='networkidle')
    page.locator('.status-dot.ready').wait_for(timeout=120000)
    check(page.locator('h1').inner_text() == 'Workspace.', 'Sentence-case workspace heading')
    check('Inter' in page.locator('body').evaluate('(el) => getComputedStyle(el).fontFamily'), 'Inter is the active body font')
    check(page.evaluate("document.fonts.check('400 14px Inter')"), 'Inter font is loaded')
    check(page.locator('.case-tile').count() == 4, 'Four published cases appear in the reference layout')
    check('not the people named' in page.locator('.portrait-note').inner_text(), 'Generated portraits disclosed in the dashboard')
    check(page.locator('img').count() >= 9 and page.locator('img').evaluate_all('(nodes) => nodes.every(n => n.complete && n.naturalWidth > 0)'), 'Locally served generated portraits load')
    page.screenshot(path=str(ROOT / 'evidence' / 'overview-reference-desktop.png'), full_page=True)
    page.locator('[data-action="filter-cases"][data-filter="differences"]').click()
    check(page.locator('.case-tile').count() == 3, 'Differences filter derives from entered figures')
    page.locator('[data-action="filter-cases"][data-filter="incomplete"]').click()
    check(page.locator('.case-tile').count() == 1 and 'Kesar' in page.locator('.case-tile').inner_text(), 'Incomplete filter keeps an unknown recorded count unknown')
    page.locator('.case-tile').click()
    check(page.locator('.metric-number').all_text_contents() == ['13', '—', '—'], 'Kesar has 13 reported; recorded count and difference are unknown')
    page.locator('[data-action="filter-cases"][data-filter="all"]').click()
    page.locator('[data-action="select-case"][data-case-id="published-anita-2023"]').click()
    check(page.locator('.metric-number').all_text_contents() == ['6', '4', '2'], 'Anita has the Slate-reported 6 and 4, arithmetic difference 2')
    page.locator('[data-action="toggle-search"]').click()
    page.locator('#case-search').fill('Slate')
    check(page.locator('.case-tile').count() == 1 and 'Anita' in page.locator('.case-tile').inner_text(), 'Search filters by actual source')
    page.locator('#case-search').fill('<script>')
    check(page.locator('.case-tile').count() == 0 and page.locator('.case-empty').is_visible(), 'Search treats markup as text and shows an empty state')
    page.locator('[data-action="toggle-search"]').click()
    page.locator('[data-action="sort-cases"]').click()
    check('Anita' in page.locator('.case-tile').first.inner_text(), 'Sort by name reorders the actual cases')
    page.locator('[data-action="sort-cases"]').click()
    check('Lakshmi' in page.locator('.case-tile').first.inner_text(), 'Original case order can be restored')
    page.locator('[data-action="about-portraits"]').click()
    check('not photographs of the people' in page.locator('#modal').inner_text(), 'Image disclosure also available from the header')
    page.locator('#modal [data-action="close-modal"]').first.click()
    page.locator('[data-view="records"]').first.click()
    page.locator('[data-action="back"]').click()
    check(page.locator('h1').inner_text() == 'Workspace.', 'Back control returns to the preceding view')
    check(not errors and not bad and not external, 'No JavaScript errors, failed assets or external requests')
    for i in range(1, 7):
        response = page.request.get(f'{BASE}/avatars/portrait-{i:02}.jpg')
        check(response.ok and response.headers.get('content-type') == 'image/jpeg', f'Portrait {i} is allowlisted')
    context.close()
    for width, height in [(320,740), (375,812), (768,1024), (1024,768), (1200,853), (1440,900)]:
        ctx = browser.new_context(viewport={'width':width, 'height':height}, device_scale_factor=1)
        mobile = ctx.new_page(); mobile.goto(BASE + '/', wait_until='networkidle')
        for view in ['overview','records','assistant','report','method']:
            mobile.locator(f'[data-view="{view}"]').first.click()
            size = mobile.evaluate('({scroll:document.documentElement.scrollWidth, inner:window.innerWidth})')
            check(size['scroll'] <= size['inner'] + 1, f'{view} has no horizontal overflow at {width}px')
        mobile.locator('[data-view="overview"]').first.click()
        if width == 375: mobile.screenshot(path=str(ROOT / 'evidence' / 'overview-reference-mobile.png'), full_page=True)
        ctx.close()
    browser.close()
result = {'checks': checks, 'browser_errors': errors, 'bad_responses': bad, 'external_requests': external, 'pass': True}
(ROOT / 'evidence' / 'ui-reference-test.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
