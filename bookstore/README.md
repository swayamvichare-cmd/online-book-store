curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "price": 299,
    "category": "Fiction",
    "stock": 10,
    "description": "A story of wealth, love, and the American Dream in the 1920s."
  }'