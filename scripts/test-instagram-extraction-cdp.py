import asyncio
import json
import pathlib
import sys
import urllib.error
import urllib.request

import websockets


async def evaluate(socket, request_id, expression):
    await socket.send(json.dumps({"id": request_id, "method": "Runtime.evaluate", "params": {
        "expression": expression,
        "returnByValue": True,
    }}))
    while True:
        message = json.loads(await socket.recv())
        if message.get("id") == request_id:
            return message


async def extract_profile():
    targets = json.load(urllib.request.urlopen("http://127.0.0.1:9223/json/list"))
    target = next(
        item for item in targets
        if item["type"] == "page" and item["url"].startswith("https://www.instagram.com/instagram/")
    )
    content_script = (pathlib.Path(__file__).parent.parent / "finddex-instagram-extension" / "content.js").read_text(encoding="utf-8")
    async with websockets.connect(target["webSocketDebuggerUrl"], origin="http://localhost:9223") as socket:
        await evaluate(socket, 1, content_script)
        result = await evaluate(socket, 2, "extractProfile()")
        return result["result"]["result"]["value"]


async def main():
    profile = await extract_profile()
    profile["tags"] = ["Instagram Extension"]
    profile["notes"] = "Gerçek Instagram sayfasından Chrome eklentisi çıkarım testi"
    request = urllib.request.Request(
        "http://localhost:12000/api/external/profiles",
        method="POST",
        headers={
            "Authorization": f"Bearer {sys.argv[1]}",
            "Content-Type": "application/json",
        },
        data=json.dumps(profile).encode("utf-8"),
    )
    try:
        with urllib.request.urlopen(request) as response:
            result = json.load(response)
            print(json.dumps({"extracted": profile, "status": response.status, "saved": result}, ensure_ascii=False))
    except urllib.error.HTTPError as error:
        print(json.dumps({"extracted": profile, "status": error.code, "response": json.load(error)}, ensure_ascii=False))
        raise


asyncio.run(main())
