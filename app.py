from flask import Flask
from flask_cors import CORS

from firebase_config import db

from routes.books import books_bp
from routes.orders import orders_bp
from routes.users import users_bp
from routes.wishlist import wishlist_bp

app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app)

# Register Blueprints
app.register_blueprint(books_bp, url_prefix="/api/books")
app.register_blueprint(orders_bp, url_prefix="/api/orders")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")

DEFAULT_BOOKS = [
    {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "price": 299,
        "category": "Fiction",
        "stock": 10,
        "description": "A story of wealth, love, and the American Dream in the 1920s."
    },
    {
        "title": "The Midnight Library",
        "author": "Matt Haig",
        "price": 249,
        "category": "Fiction",
        "stock": 10,
        "description": "A magical library lets a woman explore alternate lives she could have led."
    },
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "price": 399,
        "category": "Non-Fiction",
        "stock": 8,
        "description": "Practical strategies for building better habits and improving your life."
    },
    {
        "title": "Educated",
        "author": "Tara Westover",
        "price": 349,
        "category": "Non-Fiction",
        "stock": 8,
        "description": "A memoir about growing up in a strict family and pursuing education against all odds."
    },
    {
        "title": "A Brief History of Time",
        "author": "Stephen Hawking",
        "price": 429,
        "category": "Science",
        "stock": 6,
        "description": "A landmark book that explains cosmology and black holes for general readers."
    },
    {
        "title": "The Gene",
        "author": "Siddhartha Mukherjee",
        "price": 449,
        "category": "Science",
        "stock": 6,
        "description": "An exploration of the history and science of genetics."
    },
    {
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "price": 379,
        "category": "History",
        "stock": 7,
        "description": "A concise history of humankind from the Stone Age to the 21st century."
    },
    {
        "title": "The Silk Roads",
        "author": "Peter Frankopan",
        "price": 359,
        "category": "History",
        "stock": 7,
        "description": "A new history of the world centered around the trade routes of the Silk Road."
    },
    {
        "title": "The Innovators",
        "author": "Walter Isaacson",
        "price": 389,
        "category": "Technology",
        "stock": 5,
        "description": "The story of the pioneers who created the digital revolution."
    },
    {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "price": 429,
        "category": "Technology",
        "stock": 5,
        "description": "A handbook of agile software craftsmanship and best programming practices."
    }
]


def seed_books():
    existing_books = list(db.collection("books").limit(1).stream())
    if existing_books:
        return

    for book in DEFAULT_BOOKS:
        db.collection("books").add(book)


@app.route("/")
def home():
    return {"status": "ok", "message": "API running"}

# 🔥 ADD THIS (DEBUG ROUTES)
@app.route("/routes")
def show_routes():
    return {
        "routes": [str(rule) for rule in app.url_map.iter_rules()]
    }

if __name__ == "__main__":
    seed_books()
    app.run(debug=True, host="0.0.0.0")
