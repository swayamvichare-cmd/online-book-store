from flask import Blueprint, request, jsonify
from firebase_config import db
from firebase_admin import firestore
from datetime import datetime

orders_bp = Blueprint("orders", __name__)

ORDERS_COL = "orders"
BOOKS_COL = "books"


# 📦 Get all orders (optionally by user)
@orders_bp.route("/", methods=["GET"])
def get_orders():
    user_id = request.args.get("user_id")
    ref = db.collection(ORDERS_COL)

    if user_id:
        ref = ref.where("user_id", "==", user_id)

    docs = ref.stream()

    orders = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        orders.append(data)

    return jsonify(orders), 200


# 📦 Get single order
@orders_bp.route("/<order_id>", methods=["GET"])
def get_order(order_id):
    doc = db.collection(ORDERS_COL).document(order_id).get()

    if not doc.exists:
        return jsonify({"error": "Order not found"}), 404

    data = doc.to_dict()
    data["id"] = doc.id

    return jsonify(data), 200


# 🛒 Place order
@orders_bp.route("/", methods=["POST"])
def place_order():
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    user_id = body.get("user_id")
    items = body.get("items", [])

    if not user_id:
        return jsonify({"error": "'user_id' is required"}), 400

    if not items:
        return jsonify({"error": "'items' must not be empty"}), 400

    total = 0.0
    order_items = []

    for item in items:
        book_id = item.get("book_id")
        quantity = item.get("quantity", 1)

        if not book_id:
            return jsonify({"error": "Each item must have 'book_id'"}), 400

        book_doc = db.collection(BOOKS_COL).document(book_id).get()

        if not book_doc.exists:
            return jsonify({"error": f"Book '{book_id}' not found"}), 404

        book_data = book_doc.to_dict()

        price = book_data.get("price", 0)
        title = book_data.get("title", "Unknown")
        author = book_data.get("author", "Unknown")
        stock = book_data.get("stock", 0)

        if stock < quantity:
            return jsonify({"error": f"Insufficient stock for '{title}'"}), 400

        subtotal = price * quantity
        total += subtotal

        order_items.append({
            "book_id": book_id,
            "title": title,
            "author": author,
            "price": price,
            "quantity": quantity,
            "subtotal": subtotal,
        })

        # 🔽 Reduce stock
        db.collection(BOOKS_COL).document(book_id).update({
            "stock": firestore.Increment(-quantity)
        })

    order = {
        "user_id": user_id,
        "items": order_items,
        "total": round(total, 2),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }

    doc_ref = db.collection(ORDERS_COL).add(order)

    return jsonify({
        "id": doc_ref[1].id,
        "message": "Order placed successfully",
        "total": order["total"]
    }), 201


# 🔄 Update order status
@orders_bp.route("/<order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    status = body.get("status")

    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

    if status not in valid_statuses:
        return jsonify({"error": f"'status' must be one of {valid_statuses}"}), 400

    doc_ref = db.collection(ORDERS_COL).document(order_id)

    if not doc_ref.get().exists:
        return jsonify({"error": "Order not found"}), 404

    doc_ref.update({"status": status})

    return jsonify({"message": "Order status updated"}), 200