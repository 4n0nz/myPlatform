#!/usr/bin/env python3
"""Purge presence docs whose lastSeen is older than 1h (or missing). Run daily via cron."""
import json, datetime, urllib.request
P = "myplateform-792dd"
base = f"https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents/presence"
now = datetime.datetime.now(datetime.timezone.utc)
deleted = scanned = 0
token = None
while True:
    url = base + "?pageSize=300" + (f"&pageToken={token}" if token else "")
    data = json.load(urllib.request.urlopen(url, timeout=20))
    for d in data.get("documents", []):
        scanned += 1
        name = d["name"].split("/")[-1]
        ls = d.get("fields", {}).get("lastSeen", {}).get("timestampValue")
        age = (now - datetime.datetime.fromisoformat(ls.replace("Z", "+00:00"))).total_seconds() if ls else None
        if age is None or age > 3600:
            try:
                urllib.request.urlopen(urllib.request.Request(f"{base}/{name}", method="DELETE"), timeout=20)
                deleted += 1
            except Exception:
                pass
    token = data.get("nextPageToken")
    if not token:
        break
print(f"{datetime.datetime.now().isoformat()} scanned={scanned} deleted={deleted}")
