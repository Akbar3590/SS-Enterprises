import subprocess
import time
import json
import urllib.request
import asyncio
import websockets

with open(r'c:\xampp\htdocs\INVOICE-SS\logo_b64.txt') as f:
    b64 = f.read().strip()

data_uri = 'data:image/png;base64,' + b64

async def test_b64():
    edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    p = subprocess.Popen([
        edge_path,
        '--headless',
        '--remote-debugging-port=9230',
        '--disable-gpu',
        'file:///C:/xampp/htdocs/INVOICE-SS/index.html'
    ])
    await asyncio.sleep(2)
    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9230/json').read().decode())
        ws_url = [t for t in tabs if 'INVOICE-SS' in t.get('url', '')][0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url) as ws:
            test_js = f'''
            (async () => {{
                try {{
                    const el = document.getElementById('invoice-paper');
                    let img = el.querySelector('.test-b64-img');
                    if (!img) {{
                        img = document.createElement('img');
                        img.className = 'test-b64-img';
                        img.src = "{data_uri}";
                        el.appendChild(img);
                        await new Promise(r => {{ img.onload = r; }});
                    }}
                    
                    const canvas = await html2canvas(el, {{
                        scale: 1,
                        useCORS: false,
                        allowTaint: false,
                        backgroundColor: '#ffffff'
                    }});
                    
                    const dataUrl = canvas.toDataURL('image/png');
                    const blob = await new Promise((res, rej) => {{
                        canvas.toBlob(b => b ? res(b) : rej(new Error('null')), 'image/png');
                    }});
                    return {{ success: true, blobSize: blob.size }};
                }} catch(e) {{
                    return {{ success: false, error: e.toString() }};
                }}
            }})()
            '''
            req = {'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': test_js, 'awaitPromise': True, 'returnByValue': True}}
            await ws.send(json.dumps(req))
            resp = json.loads(await ws.recv())
            print('B64 TEST RESULT:', resp.get('result', {}).get('result', {}).get('value'))
    finally:
        p.kill()

asyncio.run(test_b64())
