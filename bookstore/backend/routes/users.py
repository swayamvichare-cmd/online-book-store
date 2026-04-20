from flask import Blueprint, request, jsonify
from firebase_config import db
from firebase_admin import auth, firestore   # ✅ FIXED IMPORT

users_bp = Blueprint("users", __name__)

COLLECTION = "users"


def verify_token(req):
    """Extract and verify Firebase ID token from Authorization header."""
    auth_header = req.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        return None, "Missing or invalid Authorization header"

    token = auth_header.split("Bearer ")[1]

    try:
        decoded = auth.verify_id_token(token)
        return decoded, None
    except Exception as e:
        return None, str(e)


@users_bp.route("/register", methods=["POST"])
def register():
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    uid = body.get("uid")
    email = body.get("email")
    name = body.get("name", "")

    if not uid or not email:
        return jsonify({"error": "'uid' and 'email' are required"}), 400

    user_ref = db.collection(COLLECTION).document(uid)

    if user_ref.get().exists:
        return jsonify({"error": "User already exists"}), 409

    user_data = {
        "uid": uid,
        "email": email,
        "name": name,
        "role": "customer",
        "created_at": firestore.SERVER_TIMESTAMP,   # ✅ now works
    }

    user_ref.set(user_data)

    return jsonify({
        "message": "User registered successfully",
        "uid": uid
    }), 201


@users_bp.route("/<uid>", methods=["GET"])
def get_user(uid):
    doc = db.collection(COLLECTION).document(uid).get()

    if not doc.exists:
        return jsonify({"error": "User not found"}), 404

    data = doc.to_dict()

    if "created_at" in data:
        data["created_at"] = str(data["created_at"])

    return jsonify(data), 200


@users_bp.route("/<uid>", methods=["PUT"])
def update_user(uid):
    body = request.get_json()

    if not body:
        return jsonify({"error": "Request body is required"}), 400

    allowed_fields = {"name", "address", "phone"}
    update_data = {k: v for k, v in body.items() if k in allowed_fields}

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    doc_ref = db.collection(COLLECTION).document(uid)

    if not doc_ref.get().exists:
        return jsonify({"error": "User not found"}), 404

    doc_ref.update(update_data)

    return jsonify({"message": "User updated successfully"}), 200


@users_bp.route("/<uid>", methods=["DELETE"])
def delete_user(uid):
    doc_ref = db.collection(COLLECTION).document(uid)

    if not doc_ref.get().exists:
        return jsonify({"error": "User not found"}), 404

    doc_ref.delete()

    try:
        auth.delete_user(uid)
    except Exception:
        pass

    return jsonify({"message": "User deleted successfully"}), 200