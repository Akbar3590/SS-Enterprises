import subprocess
import time
import json
import urllib.request
import asyncio
import websockets

async def check():
    edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    p = subprocess.Popen([
        edge_path,
        '--headless',
        '--remote-debugging-port=9232',
        '--disable-gpu',
        'file:///C:/xampp/htdocs/INVOICE-SS/index.html'
    ])
    await asyncio.sleep(2)
    try:
        tabs = json.loads(urllib.request.urlopen('http://localhost:9232/json').read().decode())
        ws_url = [t for t in tabs if 'INVOICE-SS' in t.get('url', '')][0]['webSocketDebuggerUrl']
        async with websockets.connect(ws_url) as ws:
            # Enable Console & Runtime
            await ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
            await ws.send(json.dumps({'id': 2, 'method': 'Log.enable'}))
            
            # Check for any parse/syntax error
            test_parse = {
                'id': 10,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': 'window.onerror = (msg, url, line) => console.log("WINDOW_ERROR", msg, line); "ok"'
                }
            }
            await ws.send(json.dumps(test_parse))

            # Run downloadPNG directly
            test_download = {
                'id': 20,
                'method': 'Runtime.evaluate',
                'params': {
                    'expression': '''
                    (async () => {
                        try {
                            console.log("STARTING DOWNLOAD PNG TEST");
                            await downloadPNG();
                            console.log("PNG DOWNLOAD FINISHED");
                            return "SUCCESS";
                        } catch(e) {
                            console.log("DOWNLOAD PNG FAILED:", e.toString());
                            return "FAILED: " + e.toString();
                        }
                    })()
                    ''',
                    'awaitPromise': True,
                    'returnByValue': True
                }
            }
            await ws.send(json.dumps(test_download))

            # Gather all messages
            start = time.time()
            while time.time() - start < 5:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    data = json.loads(msg)
                    if data.get('id') == 20:
                        print('Evaluate response:', data.get('result'))
                    elif data.get('method') == 'Runtime.consoleAPICalled':
                        args = [str(a.get('value', '')) for a in data['params']['args']]
                        print('CONSOLE:', ' '.join(args))
                    elif data.get('method') == 'Runtime.exceptionThrown':
                        print('EXCEPTION THROWN:', data)
                except asyncio.TimeoutError:
                    pass

    finally:
        p.kill()

asyncio.run(check())
