const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });

// ============== BOOKS ==============

exports.booksGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const category = req.query.category;
      const search = (req.query.search || '').toLowerCase();

      let query = db.collection('books');
      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query.get();
      let books = [];

      snapshot.forEach(doc => {
        const book = { ...doc.data(), id: doc.id };
        if (search && !book.title.toLowerCase().includes(search) && !book.author.toLowerCase().includes(search)) {
          return;
        }
        books.push(book);
      });

      res.json(books);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.bookGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const bookId = req.query.bookId;
      if (!bookId) {
        return res.status(400).json({ error: "'bookId' is required" });
      }

      const doc = await db.collection('books').doc(bookId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }

      res.json({ ...doc.data(), id: doc.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.bookAdd = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const { title, author, price, category, stock, description, image_url } = req.body;

      if (!title || !author || price === undefined || !category) {
        return res.status(400).json({ error: 'Title, author, price, and category are required' });
      }

      const bookRef = await db.collection('books').add({
        title,
        author,
        price: parseFloat(price),
        category,
        stock: parseInt(stock) || 0,
        description: description || '',
        image_url: image_url || ''
      });

      res.status(201).json({ id: bookRef.id, message: 'Book added successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.bookUpdate = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'PUT') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const bookId = req.query.bookId;
      if (!bookId) {
        return res.status(400).json({ error: "'bookId' is required" });
      }

      const doc = await db.collection('books').doc(bookId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }

      await db.collection('books').doc(bookId).update(req.body);
      res.json({ message: 'Book updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.bookDelete = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'DELETE') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const bookId = req.query.bookId;
      if (!bookId) {
        return res.status(400).json({ error: "'bookId' is required" });
      }

      const doc = await db.collection('books').doc(bookId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }

      await db.collection('books').doc(bookId).delete();
      res.json({ message: 'Book deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ============== ORDERS ==============

exports.ordersGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const userId = req.query.user_id;
      let query = db.collection('orders');

      if (userId) {
        query = query.where('user_id', '==', userId);
      }

      const snapshot = await query.get();
      const orders = [];

      snapshot.forEach(doc => {
        orders.push({ ...doc.data(), id: doc.id });
      });

      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.orderGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const orderId = req.query.orderId;
      if (!orderId) {
        return res.status(400).json({ error: "'orderId' is required" });
      }

      const doc = await db.collection('orders').doc(orderId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({ ...doc.data(), id: doc.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.orderPlace = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const { user_id, items } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: "'user_id' is required" });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "'items' must not be empty" });
      }

      let total = 0;
      const orderItems = [];

      for (const item of items) {
        const bookId = item.book_id;
        const quantity = item.quantity || 1;

        if (!bookId) {
          return res.status(400).json({ error: "Each item must have 'book_id'" });
        }

        const bookDoc = await db.collection('books').doc(bookId).get();
        if (!bookDoc.exists) {
          return res.status(404).json({ error: `Book '${bookId}' not found` });
        }

        const bookData = bookDoc.data();
        const price = bookData.price || 0;
        const title = bookData.title || 'Unknown';
        const author = bookData.author || 'Unknown';
        const stock = bookData.stock || 0;

        if (stock < quantity) {
          return res.status(400).json({ error: `Insufficient stock for '${title}'` });
        }

        const subtotal = price * quantity;
        total += subtotal;

        orderItems.push({
          book_id: bookId,
          title,
          author,
          price,
          quantity,
          subtotal
        });

        await db.collection('books').doc(bookId).update({
          stock: admin.firestore.FieldValue.increment(-quantity)
        });
      }

      const orderRef = await db.collection('orders').add({
        user_id,
        items: orderItems,
        total: Math.round(total * 100) / 100,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      res.status(201).json({
        id: orderRef.id,
        message: 'Order placed successfully',
        total: Math.round(total * 100) / 100
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.orderStatusUpdate = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'PATCH') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const orderId = req.query.orderId;
      const { status } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "'orderId' is required" });
      }

      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `'status' must be one of ${validStatuses.join(', ')}` });
      }

      const doc = await db.collection('orders').doc(orderId).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await db.collection('orders').doc(orderId).update({ status });
      res.json({ message: 'Order status updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ============== USERS ==============

exports.userRegister = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const { uid, email, name } = req.body;

      if (!uid || !email) {
        return res.status(400).json({ error: "'uid' and 'email' are required" });
      }

      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        return res.status(409).json({ error: 'User already exists' });
      }

      await userRef.set({
        uid,
        email,
        name: name || '',
        role: 'customer',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({
        message: 'User registered successfully',
        uid
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.userGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const uid = req.query.uid;
      if (!uid) {
        return res.status(400).json({ error: "'uid' is required" });
      }

      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const data = doc.data();
      if (data.created_at) {
        data.created_at = data.created_at.toDate().toISOString();
      }

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.userUpdate = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'PUT') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const uid = req.query.uid;
      if (!uid) {
        return res.status(400).json({ error: "'uid' is required" });
      }

      const allowedFields = ['name', 'address', 'phone'];
      const updateData = {};

      for (const field of allowedFields) {
        if (field in req.body) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRef.update(updateData);
      res.json({ message: 'User updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.userDelete = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'DELETE') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const uid = req.query.uid;
      if (!uid) {
        return res.status(400).json({ error: "'uid' is required" });
      }

      const userRef = db.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRef.delete();

      try {
        await admin.auth().deleteUser(uid);
      } catch (e) {
        // User might not exist in auth, that's ok
      }

      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// ============== WISHLIST ==============

function getBookInfo(docSnapshot) {
  if (!docSnapshot.exists) return null;

  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    title: data.title || 'Unknown title',
    author: data.author || 'Unknown author',
    price: data.price || 0,
    category: data.category || '',
    stock: data.stock || 0,
    description: data.description || '',
    image_url: data.image_url || ''
  };
}

exports.wishlistGet = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const userId = req.query.user_id;
      if (!userId) {
        return res.status(400).json({ error: "'user_id' is required" });
      }

      const snapshot = await db.collection('wishlists').where('user_id', '==', userId).get();
      const items = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const bookDoc = await db.collection('books').doc(data.book_id).get();
        const book = getBookInfo(bookDoc);

        items.push({
          book_id: data.book_id,
          added_at: data.added_at ? data.added_at.toDate().toISOString() : null,
          book
        });
      }

      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.wishlistAdd = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const { user_id, book_id } = req.body;

      if (!user_id || !book_id) {
        return res.status(400).json({ error: "'user_id' and 'book_id' are required" });
      }

      const bookDoc = await db.collection('books').doc(book_id).get();
      if (!bookDoc.exists) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const docId = `${user_id}_${book_id}`;
      const docRef = db.collection('wishlists').doc(docId);
      const existingDoc = await docRef.get();

      if (existingDoc.exists) {
        return res.status(200).json({ message: 'Book already in wishlist' });
      }

      await docRef.set({
        user_id,
        book_id,
        added_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(201).json({ message: 'Book added to wishlist' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

exports.wishlistRemove = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== 'DELETE') {
      return res.status(405).send('Method not allowed');
    }

    try {
      const userId = req.query.user_id;
      const bookId = req.query.book_id;

      if (!userId || !bookId) {
        return res.status(400).json({ error: "'user_id' and 'book_id' are required" });
      }

      const docId = `${userId}_${bookId}`;
      const docRef = db.collection('wishlists').doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Wishlist item not found' });
      }

      await docRef.delete();
      res.json({ message: 'Book removed from wishlist' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});
