class Book:
    def __init__(self, title, author, price, description="", stock=0, category="", image_url=""):
        self.title = title
        self.author = author
        self.price = price
        self.description = description
        self.stock = stock
        self.category = category
        self.image_url = image_url

    def to_dict(self):
        return {
            "title": self.title,
            "author": self.author,
            "price": self.price,
            "description": self.description,
            "stock": self.stock,
            "category": self.category,
            "image_url": self.image_url,
        }

    @staticmethod
    def from_dict(data, doc_id=None):
        book = Book(
            title=data.get("title", ""),
            author=data.get("author", ""),
            price=data.get("price", 0.0),
            description=data.get("description", ""),
            stock=data.get("stock", 0),
            category=data.get("category", ""),
            image_url=data.get("image_url", ""),
        )
        if doc_id:
            book.id = doc_id
        return book