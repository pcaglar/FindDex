import asyncio
import json
import sys
import urllib.request
import urllib.parse
import websockets


async def evaluate(websocket_url: str, expression: str):
    async with websockets.connect(websocket_url, origin="http://localhost:9223") as socket:
        await socket.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {
            "expression": expression, "awaitPromise": True, "returnByValue": True,
        }}))
        while True:
            message = json.loads(await socket.recv())
            if message.get("id") == 1:
                return message


async def discover_extension_id(page_websocket_url: str):
    async with websockets.connect(page_websocket_url, origin="http://localhost:9223") as socket:
        await socket.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        contexts = []
        while True:
            message = json.loads(await socket.recv())
            if message.get("method") == "Runtime.executionContextCreated":
                contexts.append(message["params"]["context"])
            if message.get("id") == 1:
                break
        for index, context in enumerate(contexts, start=2):
            await socket.send(json.dumps({"id": index, "method": "Runtime.evaluate", "params": {
                "expression": "globalThis.chrome?.runtime?.id || null",
                "contextId": context["id"],
                "returnByValue": True,
            }}))
            while True:
                message = json.loads(await socket.recv())
                if message.get("id") == index:
                    extension_id = message.get("result", {}).get("result", {}).get("value")
                    if extension_id:
                        return extension_id
                    break
    raise RuntimeError("Instagram sekmesinde FindDex content script bağlamı bulunamadı")


async def main():
    api_key = sys.argv[1]
    with urllib.request.urlopen("http://127.0.0.1:9223/json/list") as response:
        targets = json.load(response)
    instagram_target = next(
        target for target in targets
        if target["type"] == "page" and target["url"].startswith("https://www.instagram.com/")
    )
    extension_id = await discover_extension_id(instagram_target["webSocketDebuggerUrl"])
    extension_origin = f"chrome-extension://{extension_id}/"
    extension_target = next(
        (
            target
            for target in targets
            if target["type"] == "service_worker"
            and target["url"].startswith(extension_origin)
            and target["url"].endswith(("/service_worker.js", "/background.js"))
        ),
        None,
    )
    if extension_target is None:
        extension_target = next(
            (
                target
                for target in targets
                if target["type"] == "page"
                and target["url"].startswith(extension_origin)
                and target["url"].endswith("/popup.html")
            ),
            None,
        )
    if extension_target is None:
        popup_url = f"chrome-extension://{extension_id}/popup.html"
        request = urllib.request.Request(
            f"http://127.0.0.1:9223/json/new?{urllib.parse.quote(popup_url, safe='')}",
            method="PUT",
        )
        with urllib.request.urlopen(request) as response:
            extension_target = json.load(response)
    expression = f"""
    (async () => {{
      await chrome.storage.local.set({{serverUrl:'http://localhost:12000', apiKey:{json.dumps(api_key)}}});
      const tabs = await chrome.tabs.query({{url:'*://www.instagram.com/*'}});
      if (!tabs.length) throw new Error('Instagram sekmesi bulunamadı');
      const extracted = await chrome.tabs.sendMessage(tabs[0].id, {{type:'EXTRACT_PROFILE'}});
      if (!extracted?.profile?.username) throw new Error('Profil çıkarılamadı');
      const saved = await chrome.runtime.sendMessage({{type:'SAVE_PROFILE', profile: {{...extracted.profile, tags:['Instagram Extension'], notes:'Gerçek Instagram sayfasından Chrome eklentisi testi'}}}});
      return {{tabUrl:tabs[0].url, extracted:extracted.profile, saved}};
    }})()
    """
    result = await evaluate(extension_target["webSocketDebuggerUrl"], expression)
    print(json.dumps(result, ensure_ascii=False))


asyncio.run(main())
