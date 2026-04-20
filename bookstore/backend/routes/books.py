from flask import Blueprint, request, jsonify
from models.book_model import Book   # ✅ FIXED IMPORT
from firebase_config import db       # ✅ USE SHARED DB

books_bp = Blueprint("books", __name__)
COLLECTION = "books"


@books_bp.route("/", methods=["GET"])
def get_books():
    """Get all books, with optional filters: category, search query."""
    category = request.args.get("category")
    search = request.args.get("search", "").lower()

    ref = db.collection(COLLECTION)
    if category:
        ref = ref.where("category", "==", category)

    docs = ref.stream()
    books = []

    for doc in docs:
        book = Book.from_dict(doc.to_dict(), doc_id=doc.id)

        if search and search not in book.title.lower() and search not in book.author.lower():
            continue

        data = book.to_dict()
        data["id"] = doc.id
        books.append(data)

    return jsonify(books), 200


@books_bp.route("/<book_id>", methods=["GET"])
def get_book(book_id):
    """Get a single book by ID."""
    doc = db.collection(COLLECTION).document(book_id).get()

    if not doc.exists:
        return jsonify({"error": "Book not found"}), 404

    book = Book.from_dict(doc.to_dict(), doc_id=doc.id)
    data = book.to_dict()
    data["id"] = doc.id

    return jsonify(data), 200


@books_bp.route("/", methods=["POST"])
def add_book():
    """Add a new book."""
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    required = ["title", "author", "price"]
    for field in required:
        if field not in body:
            return jsonify({"error": f"'{field}' is required"}), 400

    book = Book(
        title=body["title"],
        author=body["author"],
        price=body["price"],
        description=body.get("description", ""),
        stock=body.get("stock", 0),
        category=body.get("category", ""),
        image_url=body.get("image_url", ""),
    )

    doc_ref = db.collection(COLLECTION).add(book.to_dict())

    return jsonify({
        "id": doc_ref[1].id,
        "message": "Book added successfully"
    }), 201


@books_bp.route("/<book_id>", methods=["PUT"])
def update_book(book_id):
    """Update an existing book."""
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    doc_ref = db.collection(COLLECTION).document(book_id)

    if not doc_ref.get().exists:
        return jsonify({"error": "Book not found"}), 404

    doc_ref.update(body)

    return jsonify({"message": "Book updated successfully"}), 200


@books_bp.route("/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    """Delete a book."""
    doc_ref = db.collection(COLLECTION).document(book_id)

    if not doc_ref.get().exists:
        return jsonify({"error": "Book not found"}), 404

    doc_ref.delete()

    return jsonify({"message": "Book deleted successfully"}), 200