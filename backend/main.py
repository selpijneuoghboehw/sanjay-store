"""
Sanjay Karyana Store — FastAPI Backend
Run: uvicorn main:app --reload
"""

import os
import csv
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
INVENTORY_FILE = "inventory.csv"
ORDERS_FILE    = "orders.csv"
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

INVENTORY_FIELDS = ["item_name", "category", "price", "barcode"]

# ─── CSV Helpers ──────────────────────────────────────────────────────────────

def ensure_inventory():
    if not os.path.exists(INVENTORY_FILE):
        with open(INVENTORY_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=INVENTORY_FIELDS)
            writer.writeheader()
            writer.writerows(DUMMY_INVENTORY)


def read_inventory() -> list:
    ensure_inventory()
    with open(INVENTORY_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        items = []
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
    return items


def write_inventory(items: list):
    with open(INVENTORY_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=INVENTORY_FIELDS)
        writer.writeheader()
        for item in items:
            writer.writerow({
                "item_name": item.get("item_name", ""),
                "category":  item.get("category", ""),
                "price":     item.get("price", 0),
                "barcode":   item.get("barcode", ""),
            })


def read_orders() -> list:
    if not os.path.exists(ORDERS_FILE):
        return []
    with open(ORDERS_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def append_order(order: dict):
    exists = os.path.exists(ORDERS_FILE)
    with open(ORDERS_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["time", "customer", "items", "total"])
        if not exists:
            writer.writeheader()
        writer.writerow(order)


def write_orders(orders: list):
    with open(ORDERS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["time", "customer", "items", "total"])
        writer.writeheader()
        writer.writerows(orders)

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
    customer: str
    cart:     List[CartItem]
    total:    float

class InventoryItem(BaseModel):
    item_name: str
    category:  str
    price:     float
    barcode:   Optional[str] = ""

class PinRequest(BaseModel):
    pin: str

class OrderEdit(BaseModel):
    cart:  List[CartItem]
    total: float

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "store": "Sanjay Karyana Store"}

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/verify")
def verify_pin(req: PinRequest):
    if req.pin == OWNER_PIN:
        return {"success": True}
    raise HTTPException(status_code=401, detail="Wrong PIN")

# ── Inventory ─────────────────────────────────────────────────────────────────
@app.get("/api/inventory")
def get_inventory():
    return read_inventory()


@app.get("/api/inventory/barcode/{barcode}")
def get_by_barcode(barcode: str):
    items = read_inventory()
    for item in items:
        if item["barcode"] and item["barcode"] == barcode.strip():
            return item
    raise HTTPException(status_code=404, detail="No item found for this barcode")


@app.post("/api/inventory")
def add_item(item: InventoryItem):
    items = read_inventory()
    names = [i["item_name"].lower() for i in items]
    if item.item_name.strip().lower() in names:
        raise HTTPException(status_code=400, detail="Item already exists")
    items.append(item.dict())
    write_inventory(items)
    return {"success": True, "item": item}


@app.put("/api/inventory/{item_name}")
def update_item(item_name: str, item: InventoryItem):
    items = read_inventory()
    for i, row in enumerate(items):
        if row["item_name"].lower() == item_name.lower():
            items[i] = item.dict()
            write_inventory(items)
            return {"success": True}
    raise HTTPException(status_code=404, detail="Item not found")


@app.delete("/api/inventory/{item_name}")
def delete_item(item_name: str):
    items = read_inventory()
    new_items = [i for i in items if i["item_name"].lower() != item_name.lower()]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Item not found")
    write_inventory(new_items)
    return {"success": True}

# ── Orders ────────────────────────────────────────────────────────────────────
@app.get("/api/orders")
def get_orders():
    return read_orders()


@app.post("/api/orders")
def place_order(req: OrderRequest):
    items_str = ", ".join(
        f"{ci.weightG}g {ci.item_name} (@₹{ci.price}/kg)" if ci.weightG
        else f"{ci.qty}x {ci.item_name} (@₹{ci.price})"
        for ci in req.cart
    )
    order = {
        "time":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "customer": req.customer.strip() or "Guest",
        "items":    items_str,
        "total":    req.total,
    }
    append_order(order)
    return {"success": True, "order": order}


@app.put("/api/orders/{order_idx}")
def edit_order(order_idx: int, edit: OrderEdit):
    orders = read_orders()
    if order_idx < 0 or order_idx >= len(orders):
        raise HTTPException(status_code=404, detail="Order not found")
    items_str = ", ".join(
        f"{ci.qty}x {ci.item_name} (@₹{ci.price})" for ci in edit.cart
    )
    orders[order_idx]["items"] = items_str
    orders[order_idx]["total"] = edit.total
    write_orders(orders)
    return {"success": True}


@app.delete("/api/orders/{order_idx}")
def delete_order(order_idx: int):
    orders = read_orders()
    if order_idx < 0 or order_idx >= len(orders):
        raise HTTPException(status_code=404, detail="Order not found")
    orders.pop(order_idx)
    write_orders(orders)
    return {"success": True}


@app.delete("/api/orders")
def clear_orders():
    write_orders([])
    return {"success": True}