"""
Sanjay Karyana Store — FastAPI Backend (JSON format — Fast!)
Run: uvicorn main:app --reload
"""

import os
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Sanjay Karyana Store API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Constants ────────────────────────────────────────────────────────────────
INVENTORY_FILE = "inventory.json"
ORDERS_FILE    = "orders.json"
OWNER_PIN      = os.environ.get("OWNER_PIN", "1969")

DUMMY_INVENTORY = [
    {"item_name": "Rice",          "category": "Pulses",   "price": 60,  "barcode": ""},
    {"item_name": "Chana Dal",     "category": "Pulses",   "price": 105, "barcode": ""},
    {"item_name": "Moong Dal",     "category": "Pulses",   "price": 120, "barcode": ""},
    {"item_name": "Masoor Dal",    "category": "Pulses",   "price": 95,  "barcode": ""},
    {"item_name": "Toor Dal",      "category": "Pulses",   "price": 110, "barcode": ""},
    {"item_name": "Soap",          "category": "Cleaning", "price": 30,  "barcode": ""},
    {"item_name": "Detergent",     "category": "Cleaning", "price": 85,  "barcode": ""},
    {"item_name": "Floor Cleaner", "category": "Cleaning", "price": 120, "barcode": ""},
    {"item_name": "Sugar",         "category": "Grocery",  "price": 45,  "barcode": ""},
    {"item_name": "Salt",          "category": "Grocery",  "price": 20,  "barcode": ""},
    {"item_name": "Tea Powder",    "category": "Grocery",  "price": 250, "barcode": ""},
    {"item_name": "Biscuits",      "category": "Snacks",   "price": 40,  "barcode": ""},
    {"item_name": "Chips",         "category": "Snacks",   "price": 20,  "barcode": ""},
]


# ─── In-Memory Cache ────────────────────────────────────────────────────────
_inventory_cache: list = []
_orders_cache: list = []


# ─── JSON File Helpers ───────────────────────────────────────────────────────

def read_json(filepath: str, default=None):
    """Read a JSON file, return default if not found."""
    if not os.path.exists(filepath):
        return default if default is not None else []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(filepath: str, data):
    """Write data to a JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def ensure_inventory():
    """Create inventory.json with dummy data if it doesn't exist."""
    if not os.path.exists(INVENTORY_FILE):
        write_json(INVENTORY_FILE, DUMMY_INVENTORY)


# ─── Load data into memory on startup ────────────────────────────────────────
@app.on_event("startup")
def startup():
    global _inventory_cache, _orders_cache

    ensure_inventory()
    _inventory_cache = read_json(INVENTORY_FILE)
    _orders_cache = read_json(ORDERS_FILE, [])

    print(f"✅ Loaded {len(_inventory_cache)} inventory items (JSON)")
    print(f"✅ Loaded {len(_orders_cache)} orders (JSON)")


# ─── Models ───────────────────────────────────────────────────────────────────

class CartItem(BaseModel):
    item_name: str
    category:  str
    price:     float
    qty:       Optional[int] = None
    weightG:   Optional[float] = None
    unit:      Optional[str] = None
    amount:    Optional[float] = None

class OrderRequest(BaseModel):
    customer:    str
    cart:        List[CartItem]
    total:       float
    paymentMode: Optional[str] = ""

class InventoryItem(BaseModel):
    item_name: str
    category:  str
    price:     float
    barcode:   Optional[str] = ""

class PinRequest(BaseModel):
    pin: str

class OrderEdit(BaseModel):
    cart:     List[CartItem]
    total:    float


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "store": "Sanjay Karyana Store"}


@app.get("/api/health")
def health():
    return {"status": "alive", "inventory": len(_inventory_cache), "orders": len(_orders_cache)}


# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/verify")
def verify_pin(req: PinRequest):
    if req.pin == OWNER_PIN:
        return {"success": True}
    raise HTTPException(status_code=401, detail="Wrong PIN")


# ── Inventory ─────────────────────────────────────────────────────────────────
@app.get("/api/inventory")
def get_inventory():
    return _inventory_cache


@app.get("/api/inventory/barcode/{barcode}")
def get_by_barcode(barcode: str):
    for item in _inventory_cache:
        if item["barcode"] and item["barcode"] == barcode.strip():
            return item
    raise HTTPException(status_code=404, detail="No item found for this barcode")


@app.post("/api/inventory")
def add_item(item: InventoryItem):
    names = [i["item_name"].lower() for i in _inventory_cache]
    if item.item_name.strip().lower() in names:
        raise HTTPException(status_code=400, detail="Item already exists")
    new_item = item.dict()
    _inventory_cache.append(new_item)
    write_json(INVENTORY_FILE, _inventory_cache)
    return {"success": True, "item": new_item}


@app.put("/api/inventory/{item_name}")
def update_item(item_name: str, item: InventoryItem):
    for i, row in enumerate(_inventory_cache):
        if row["item_name"].lower() == item_name.lower():
            _inventory_cache[i] = item.dict()
            write_json(INVENTORY_FILE, _inventory_cache)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Item not found")


@app.delete("/api/inventory/{item_name}")
def delete_item(item_name: str):
    new_items = [i for i in _inventory_cache if i["item_name"].lower() != item_name.lower()]
    if len(new_items) == len(_inventory_cache):
        raise HTTPException(status_code=404, detail="Item not found")
    _inventory_cache.clear()
    _inventory_cache.extend(new_items)
    write_json(INVENTORY_FILE, _inventory_cache)
    return {"success": True}


# ── Orders ────────────────────────────────────────────────────────────────────
@app.get("/api/orders")
def get_orders():
    return _orders_cache


@app.post("/api/orders")
def place_order(req: OrderRequest):
    items_str = ", ".join(
        f"{int(ci.weightG)}g {ci.item_name} (@₹{ci.price}/kg)" if ci.weightG
        else f"{ci.qty}x {ci.item_name} (@₹{ci.price})"
        for ci in req.cart
    )
    cart_list = [ci.dict() for ci in req.cart]

    order = {
        "time":        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "customer":    req.customer.strip() or "Guest",
        "items":       items_str,
        "total":       req.total,
        "paymentMode": req.paymentMode or "",
        "cart":        cart_list,
    }
    _orders_cache.append(order)
    write_json(ORDERS_FILE, _orders_cache)
    return {"success": True, "order": order}


@app.put("/api/orders/{order_idx}")
def edit_order(order_idx: int, edit: OrderEdit):
    if order_idx < 0 or order_idx >= len(_orders_cache):
        raise HTTPException(status_code=404, detail="Order not found")
    items_str = ", ".join(
        f"{ci.qty}x {ci.item_name} (@₹{ci.price})" for ci in edit.cart
    )
    cart_list = [ci.dict() for ci in edit.cart]
    _orders_cache[order_idx]["items"] = items_str
    _orders_cache[order_idx]["total"] = edit.total
    _orders_cache[order_idx]["cart"] = cart_list
    write_json(ORDERS_FILE, _orders_cache)
    return {"success": True}


@app.delete("/api/orders/{order_idx}")
def delete_order(order_idx: int):
    if order_idx < 0 or order_idx >= len(_orders_cache):
        raise HTTPException(status_code=404, detail="Order not found")
    _orders_cache.pop(order_idx)
    write_json(ORDERS_FILE, _orders_cache)
    return {"success": True}


@app.delete("/api/orders")
def clear_orders():
    _orders_cache.clear()
    write_json(ORDERS_FILE, [])
    return {"success": True}


# ── CSV → JSON Migration (run once) ─────────────────────────────────────────
@app.post("/api/migrate/csv-to-json")
def migrate_csv_to_json():
    """
    One-time migration: Convert existing CSV files to JSON.
    Call this endpoint once after deploying, then never again.
    """
    import csv

    # Migrate inventory
    if os.path.exists("inventory.csv") and not os.path.exists("inventory.json"):
        items = []
        with open("inventory.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("item_name", "").strip()
                if not name:
                    continue
                items.append({
                    "item_name": name,
                    "category":  row.get("category", "Uncategorised").strip(),
                    "price":     float(row.get("price", 0) or 0),
                    "barcode":   row.get("barcode", "").strip(),
                })
        write_json(INVENTORY_FILE, items)
        global _inventory_cache
        _inventory_cache = items

    # Migrate orders
    if os.path.exists("orders.csv") and not os.path.exists("orders.json"):
        orders = []
        with open("orders.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                order = {
                    "time":        row.get("time", ""),
                    "customer":    row.get("customer", ""),
                    "items":       row.get("items", ""),
                    "total":       row.get("total", "0"),
                    "paymentMode": row.get("paymentMode", ""),
                    "cart":        None,
                }
                orders.append(order)
        write_json(ORDERS_FILE, orders)
        global _orders_cache
        _orders_cache = orders

    return {
        "success": True,
        "message": "Migration complete! CSV → JSON done.",
        "inventory_count": len(_inventory_cache),
        "orders_count": len(_orders_cache),
    }
