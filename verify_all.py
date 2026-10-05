import subprocess
import time
import json
import urllib.request
import asyncio
import websockets

async def verify():
    edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    p = subprocess.Popen([
        edge_path,
        '--headless',
        '--remote-debugging-port=9231',
        '--disable-gpu',
        'file:///C:/xampp/htdocs/INVOICE-SS/index.html'
    ])
    await asyncio.sleep(2)
    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9231/json').read().decode())
        ws_url = [t for t in tabs if 'INVOICE-SS' in t.get('url', '')][0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url) as ws:
            # Check for any console syntax errors on load
            await ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
            await ws.send(json.dumps({'id': 2, 'method': 'Console.enable'}))
            
            # Test clicking download PNG
            click_png = {
                'id': 10,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': '''
                    (async () => {
                        const btn = document.getElementById('btn-download-png');
                        btn.click();
                        return 'png clicked';
                    })()
                    ''',
                    'awaitPromise': True,
                    'returnByValue': True
                }
            }
            await ws.send(json.dumps(click_png))
            r = json.loads(await ws.recv())
            print('PNG click result:', r)

            # Wait 2 seconds for html2canvas to finish and toast to appear
            await asyncio.sleep(2.5)

            # Check toast
            check_toast = {
                'id': 11,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': 'document.getElementById("toast-message").textContent',
                    'returnByValue': True
                }
            }
            await ws.send(json.dumps(check_toast))
            r = json.loads(await ws.recv())
            toast_text = r.get('result', {}).get('result', {}).get('value')
            print('Toast after PNG download:', toast_text)

            # Test clicking download PDF
            click_pdf = {
                'id': 20,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': '''
                    (async () => {
                        const btn = document.getElementById('btn-download-pdf');
                        btn.click();
                        return 'pdf clicked';
                    })()
                    ''',
                    'awaitPromise': True,
                    'returnByValue': True
                }
            }
            await ws.send(json.dumps(click_pdf))
            r = json.loads(await ws.recv())
            print('PDF click result:', r)

            await asyncio.sleep(2.5)

            await ws.send(json.dumps(check_toast))
            r = json.loads(await ws.recv())
            toast_pdf = r.get('result', {}).get('result', {}).get('value')
            print('Toast after PDF download:', toast_pdf)

    finally:
        p.kill()

asyncio.run(verify())
