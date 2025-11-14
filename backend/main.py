from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from uuid import uuid4
from pathlib import Path
from datetime import datetime, date, timedelta
import json
import threading

DATA_PATH = Path(__file__).parent / "data.json"
_lock = threading.Lock()

app = FastAPI(title="Food Stability Planner API")

# Allow CORS for development (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ItemIn(BaseModel):
    name: str
    purchaseDate: str  # YYYY-MM-DD
    shelfLife: int

class ItemOut(ItemIn):
    id: str
    expiry: str
    daysLeft: int
    status: str
    statusLabel: str


def read_store() -> List[dict]:
    if not DATA_PATH.exists():
        return []
    with _lock:
        try:
            return json.loads(DATA_PATH.read_text(encoding='utf-8'))
        except Exception:
            return []


def write_store(items: List[dict]):
    with _lock:
        DATA_PATH.write_text(json.dumps(items, indent=2), encoding='utf-8')


def add_days(date_str: str, days: int) -> date:
    dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    return dt + timedelta(days=days)


def days_between(a: date, b: date) -> int:
    return (a - b).days


def compute_status(days_left: int):
    if days_left < 0:
        return ("expired", "Expired")
    if days_left <= 3:
        return ("soon", "Use Soon")
    return ("fresh", "Fresh")


def enrich_item(raw: dict) -> dict:
    # raw contains: id, name, purchaseDate, shelfLife
    expiry_date = add_days(raw['purchaseDate'], int(raw['shelfLife']))
    today = date.today()
    days_left = days_between(expiry_date, today)
    status_key, status_label = compute_status(days_left)
    out = raw.copy()
    out.update({
        'expiry': expiry_date.isoformat(),
        'daysLeft': days_left,
        'status': status_key,
        'statusLabel': status_label,
    })
    return out


@app.get('/api/items', response_model=List[ItemOut])
def get_items():
    items = read_store()
    return [enrich_item(i) for i in items]


@app.post('/api/items', response_model=ItemOut)
def create_item(item: ItemIn):
    data = read_store()
    new_id = str(uuid4())
    obj = {
        'id': new_id,
        'name': item.name,
        'purchaseDate': item.purchaseDate,
        'shelfLife': int(item.shelfLife),
    }
    data.append(obj)
    write_store(data)
    return enrich_item(obj)


@app.delete('/api/items/{item_id}')
def delete_item(item_id: str):
    data = read_store()
    new = [i for i in data if i.get('id') != item_id]
    if len(new) == len(data):
        raise HTTPException(status_code=404, detail='Item not found')
    write_store(new)
    return {"ok": True}


@app.delete('/api/items')
def clear_items():
    write_store([])
    return {"ok": True}
