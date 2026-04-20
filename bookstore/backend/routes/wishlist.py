from flask import Blueprint, request, jsonify
from firebase_config import db
from firebase_admin import firestore

wishlist_bp = Blueprint("wishlist", __name__)

WISHLIST_COL = "wishlists"
BOOKS_COL = "books"


def get_book_info(book_id):
    doc = db.collection(BOOKS_COL).document(book_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict() or {}
    return {
        "id": doc.id,
        "title": data.get("title", "Unknown title"),
        "author": data.get("author", "Unknown author"),
        "price": data.get("price", 0),
        "category": data.get("category", ""),
        "stock": data.get("stock", 0),
        "description": data.get("description", ""),
        "image_url": data.get("image_url", "")
    }


@wishlist_bp.route("/", methods=["GET"])
def get_wishlist():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "'user_id' is required"}), 400

    docs = db.collection(WISHLIST_COL).where("user_id", "==", user_id).stream()
    items = []

    for doc in docs:
        data = doc.to_dict() or {}
        book = get_book_info(data.get("book_id"))
        item = {
            "book_id": data.get("book_id"),
            "added_at": data.get("added_at"),
            "book": book
        }
        items.append(item)

    return jsonify(items), 200


@wishlist_bp.route("/", methods=["POST"])
def add_to_wishlist():
    body = request.get_json()
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    user_id = body.get("user_id")
    book_id = body.get("book_id")

    if not user_id or not book_id:
        return jsonify({"error": "'user_id' and 'book_id' are required"}), 400

    book_doc = db.collection(BOOKS_COL).document(book_id).get()
    if not book_doc.exists:
        return jsonify({"error": "Book not found"}), 404

    doc_ref = db.collection(WISHLIST_COL).document(f"{user_id}_{book_id}")
    if doc_ref.get().exists:
        return jsonify({"message": "Book already in wishlist"}), 200

    doc_ref.set({
        "user_id": user_id,
        "book_id": book_id,
        "added_at": firestore.SERVER_TIMESTAMP
    })

    return jsonify({"message": "Book added to wishlist"}), 201


@wishlist_bp.route("/", methods=["DELETE"])
def remove_from_wishlist():
    user_id = request.args.get("user_id")
    book_id = request.args.get("book_id")

    if not user_id or not book_id:
        return jsonify({"error": "'user_id' and 'book_id' are required"}), 400

    doc_ref = db.collection(WISHLIST_COL).document(f"{user_id}_{book_id}")
    if not doc_ref.get().exists:
        return jsonify({"error": "Wishlist item not found"}), 404

    doc_ref.delete()
    return jsonify({"message": "Book removed from wishlist"}), 200
