/**
 * setup-atlas-schema.js
 * Connects to MongoDB Atlas and creates all collections with
 * JSON Schema validators + indexes for Nansai Organics.
 * Run: node seeders/setup-atlas-schema.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  console.log('✅ Connected to Atlas:', db.databaseName);

  const existing = (await db.listCollections().toArray()).map(c => c.name);
  console.log('Existing collections:', existing.length ? existing.join(', ') : 'none');

  /* ─────────────────────────────────────────
     Helper
  ───────────────────────────────────────── */
  async function createCol(name, validator, indexes = []) {
    if (existing.includes(name)) {
      // Update validator on existing collection
      await db.command({ collMod: name, validator, validationLevel: 'moderate', validationAction: 'warn' });
      console.log(`  ↻  ${name} — validator updated`);
    } else {
      await db.createCollection(name, { validator, validationLevel: 'moderate', validationAction: 'warn' });
      console.log(`  ✚  ${name} — created`);
    }
    const col = db.collection(name);
    const existingIdxNames = (await col.indexes()).map(i => i.name);
    let created = 0;
    for (const idx of indexes) {
      const idxName = idx.options?.name;
      if (idxName && existingIdxNames.includes(idxName)) continue; // already exists
      try {
        await col.createIndex(idx.key, idx.options || {});
        created++;
      } catch(e) {
        // index exists with same key but different name — skip
        if (!e.message.includes('already exists')) throw e;
      }
    }
    if (created) console.log(`     └─ ${created} new index(es) created`);
  }

  /* ═══════════════════════════════════════
     1. users
  ═══════════════════════════════════════ */
  await createCol('users', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email'],
      properties: {
        name:               { bsonType: 'string', maxLength: 50 },
        email:              { bsonType: 'string' },
        password:           { bsonType: 'string' },
        phone:              { bsonType: 'string' },
        role:               { bsonType: 'string', enum: ['user', 'admin'] },
        avatar:             { bsonType: 'string' },
        isVerified:         { bsonType: 'bool' },
        emailVerified:      { bsonType: 'bool' },
        emailOtp:           { bsonType: 'string' },
        emailOtpExpire:     { bsonType: 'date' },
        phoneVerified:      { bsonType: 'bool' },
        phoneOtp:           { bsonType: 'string' },
        phoneOtpExpire:     { bsonType: 'date' },
        otpAttempts:        { bsonType: 'int' },
        otpAttemptsExpire:  { bsonType: 'date' },
        otpDailyCount:      { bsonType: 'int' },
        otpDailyReset:      { bsonType: 'date' },
        googleId:           { bsonType: 'string' },
        facebookId:         { bsonType: 'string' },
        resetPasswordToken: { bsonType: 'string' },
        resetPasswordExpire:{ bsonType: 'date' },
        addresses:          { bsonType: 'array', items: { bsonType: 'objectId' } },
        wishlist:           { bsonType: 'array', items: { bsonType: 'objectId' } },
        cart:               { bsonType: 'objectId' },
        activityHistory: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['type'],
            properties: {
              type:        { bsonType: 'string' },
              description: { bsonType: 'string' },
              createdAt:   { bsonType: 'date' }
            }
          }
        }
      }
    }
  }, [
    { key: { email: 1 },              options: { unique: true, name: 'email_1' } },
    { key: { phone: 1 },              options: { sparse: true, name: 'phone_sparse' } },
    { key: { role: 1 },               options: { name: 'role_1' } },
    { key: { googleId: 1 },           options: { sparse: true, name: 'googleId_sparse' } },
    { key: { resetPasswordToken: 1 }, options: { sparse: true, name: 'resetToken_sparse' } }
  ]);

  /* ═══════════════════════════════════════
     2. products
  ═══════════════════════════════════════ */
  await createCol('products', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'description', 'price', 'category', 'stock', 'unit', 'weight'],
      properties: {
        name:        { bsonType: 'string', maxLength: 200 },
        description: { bsonType: 'string', maxLength: 2000 },
        price:       { bsonType: 'number', minimum: 0 },
        oldPrice:    { bsonType: 'number', minimum: 0 },
        category:    { bsonType: 'string', enum: ['rice','flowers','beverages','flour','other'] },
        images: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['url'],
            properties: { url: { bsonType: 'string' }, public_id: { bsonType: 'string' } }
          }
        },
        stock:       { bsonType: 'number', minimum: 0 },
        unit:        { bsonType: 'string', enum: ['kg','g','l','ml','piece','pack'] },
        weight:      { bsonType: 'number' },
        badge:       { bsonType: 'string', enum: ['new','hot','sale','bestseller'] },
        section:     { bsonType: 'string', enum: ['new','bestseller','category'] },
        rating:      { bsonType: 'number', minimum: 0, maximum: 5 },
        numReviews:  { bsonType: 'number' },
        reviews:     { bsonType: 'array', items: { bsonType: 'objectId' } },
        certifications: { bsonType: 'array', items: { bsonType: 'string' } },
        ingredients:    { bsonType: 'array', items: { bsonType: 'string' } },
        nutritionalInfo: {
          bsonType: 'object',
          properties: {
            calories: { bsonType: 'number' }, protein: { bsonType: 'number' },
            carbs:    { bsonType: 'number' }, fat:     { bsonType: 'number' },
            fiber:    { bsonType: 'number' }
          }
        },
        benefits:    { bsonType: 'array', items: { bsonType: 'string' } },
        howToUse:    { bsonType: 'string' },
        shelfLife:   { bsonType: 'string' },
        isFeatured:  { bsonType: 'bool' },
        isActive:    { bsonType: 'bool' },
        tags:        { bsonType: 'array', items: { bsonType: 'string' } },
        tagline:     { bsonType: 'string', maxLength: 200 },
        slug:        { bsonType: 'string' },
        metaTitle:   { bsonType: 'string' },
        metaDescription: { bsonType: 'string' }
      }
    }
  }, [
    { key: { slug: 1 },                          options: { unique: true, sparse: true, name: 'slug_unique' } },
    { key: { isActive: 1, createdAt: -1 },        options: { name: 'active_date' } },
    { key: { isActive: 1, category: 1, createdAt: -1 }, options: { name: 'active_cat_date' } },
    { key: { isActive: 1, badge: 1 },             options: { name: 'active_badge' } },
    { key: { isActive: 1, section: 1 },           options: { name: 'active_section' } },
    { key: { isActive: 1, isFeatured: 1 },        options: { name: 'active_featured' } },
    { key: { isActive: 1, rating: -1 },           options: { name: 'active_rating' } },
    { key: { isActive: 1, price: 1 },             options: { name: 'active_price' } },
    { key: { name: 'text', description: 'text', tags: 'text' }, options: { name: 'text_search' } }
  ]);

  /* ═══════════════════════════════════════
     3. orders
  ═══════════════════════════════════════ */
  await createCol('orders', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user', 'items', 'shippingAddress', 'paymentMethod', 'totalPrice'],
      properties: {
        user:        { bsonType: 'objectId' },
        orderNumber: { bsonType: 'string' },
        items: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['name', 'quantity', 'price'],
            properties: {
              name:     { bsonType: 'string' },
              image:    { bsonType: 'string' },
              quantity: { bsonType: 'number', minimum: 1 },
              price:    { bsonType: 'number', minimum: 0 }
            }
          }
        },
        shippingAddress: {
          bsonType: 'object',
          required: ['fullName','phone','addressLine1','city','state','pincode'],
          properties: {
            fullName:     { bsonType: 'string' },
            phone:        { bsonType: 'string' },
            addressLine1: { bsonType: 'string' },
            addressLine2: { bsonType: 'string' },
            city:         { bsonType: 'string' },
            state:        { bsonType: 'string' },
            pincode:      { bsonType: 'string' },
            country:      { bsonType: 'string' }
          }
        },
        paymentMethod: { bsonType: 'string', enum: ['COD','Razorpay','PayU','Stripe','UPI'] },
        paymentInfo: {
          bsonType: 'object',
          properties: {
            id: { bsonType: 'string' }, status: { bsonType: 'string' }, paidAt: { bsonType: 'date' }
          }
        },
        itemsPrice:    { bsonType: 'number' },
        taxPrice:      { bsonType: 'number' },
        shippingPrice: { bsonType: 'number' },
        discount:      { bsonType: 'number' },
        totalPrice:    { bsonType: 'number' },
        orderStatus:   { bsonType: 'string', enum: ['Pending','Processing','Packed','Shipped','Delivered','Cancelled','Refunded'] },
        isPaid:        { bsonType: 'bool' },
        paidAt:        { bsonType: 'date' },
        isDelivered:   { bsonType: 'bool' },
        deliveredAt:   { bsonType: 'date' },
        cancelledAt:   { bsonType: 'date' },
        cancellationReason: { bsonType: 'string' },
        trackingNumber:     { bsonType: 'string' },
        courierService:     { bsonType: 'string' },
        estimatedDelivery:  { bsonType: 'date' },
        couponCode:         { bsonType: 'string' },
        notes:              { bsonType: 'string' }
      }
    }
  }, [
    { key: { orderNumber: 1 },           options: { unique: true, sparse: true, name: 'orderNumber_unique' } },
    { key: { user: 1, createdAt: -1 },   options: { name: 'user_date' } },
    { key: { orderStatus: 1, createdAt: -1 }, options: { name: 'status_date' } },
    { key: { createdAt: -1 },            options: { name: 'date_desc' } }
  ]);

  /* ═══════════════════════════════════════
     4. carts
  ═══════════════════════════════════════ */
  await createCol('carts', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user'],
      properties: {
        user: { bsonType: 'objectId' },
        items: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['product','quantity','price'],
            properties: {
              product:  { bsonType: 'objectId' },
              quantity: { bsonType: 'number', minimum: 1 },
              price:    { bsonType: 'number', minimum: 0 }
            }
          }
        },
        totalPrice: { bsonType: 'number' },
        totalItems: { bsonType: 'number' }
      }
    }
  }, [
    { key: { user: 1 }, options: { unique: true, name: 'user_unique' } }
  ]);

  /* ═══════════════════════════════════════
     5. reviews
  ═══════════════════════════════════════ */
  await createCol('reviews', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user','product','rating','comment'],
      properties: {
        user:               { bsonType: 'objectId' },
        product:            { bsonType: 'objectId' },
        rating:             { bsonType: 'number', minimum: 1, maximum: 5 },
        title:              { bsonType: 'string', maxLength: 100 },
        comment:            { bsonType: 'string', maxLength: 1000 },
        images: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: { url: { bsonType: 'string' }, public_id: { bsonType: 'string' } }
          }
        },
        isVerifiedPurchase: { bsonType: 'bool' },
        helpfulCount:       { bsonType: 'number' },
        isApproved:         { bsonType: 'bool' }
      }
    }
  }, [
    { key: { user: 1, product: 1 }, options: { unique: true, name: 'user_product_unique' } },
    { key: { product: 1, createdAt: -1 }, options: { name: 'product_date' } },
    { key: { isApproved: 1 },            options: { name: 'approved_1' } }
  ]);

  /* ═══════════════════════════════════════
     6. addresses
  ═══════════════════════════════════════ */
  await createCol('addresses', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user','fullName','phone','addressLine1','city','state','pincode'],
      properties: {
        user:         { bsonType: 'objectId' },
        fullName:     { bsonType: 'string' },
        phone:        { bsonType: 'string' },
        addressLine1: { bsonType: 'string' },
        addressLine2: { bsonType: 'string' },
        city:         { bsonType: 'string' },
        state:        { bsonType: 'string' },
        pincode:      { bsonType: 'string' },
        country:      { bsonType: 'string' },
        addressType:  { bsonType: 'string', enum: ['Home','Work','Other'] },
        isDefault:    { bsonType: 'bool' }
      }
    }
  }, [
    { key: { user: 1 },              options: { name: 'user_1' } },
    { key: { user: 1, isDefault: 1 }, options: { name: 'user_default' } }
  ]);

  /* ═══════════════════════════════════════
     7. coupons
  ═══════════════════════════════════════ */
  await createCol('coupons', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['code','description','discountType','discountValue','validFrom','validUntil'],
      properties: {
        code:          { bsonType: 'string' },
        description:   { bsonType: 'string' },
        discountType:  { bsonType: 'string', enum: ['percentage','fixed'] },
        discountValue: { bsonType: 'number', minimum: 0 },
        minOrderAmount:{ bsonType: 'number' },
        maxDiscount:   { bsonType: 'number' },
        validFrom:     { bsonType: 'date' },
        validUntil:    { bsonType: 'date' },
        usageLimit:    { bsonType: ['number','null'] },
        usedCount:     { bsonType: 'number' },
        isActive:      { bsonType: 'bool' },
        applicableCategories: { bsonType: 'array', items: { bsonType: 'string' } },
        applicableProducts:   { bsonType: 'array', items: { bsonType: 'objectId' } }
      }
    }
  }, [
    { key: { code: 1 },                    options: { unique: true, name: 'code_unique' } },
    { key: { isActive: 1, validUntil: 1 }, options: { name: 'active_expiry' } }
  ]);

  /* ═══════════════════════════════════════
     8. blogs
  ═══════════════════════════════════════ */
  await createCol('blogs', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title','category','excerpt','content'],
      properties: {
        title:      { bsonType: 'string' },
        category:   { bsonType: 'string' },
        catLabel:   { bsonType: 'string' },
        catColor:   { bsonType: 'string' },
        catBg:      { bsonType: 'string' },
        author:     { bsonType: 'string' },
        readTime:   { bsonType: 'string' },
        image:      { bsonType: 'string' },
        excerpt:    { bsonType: 'string' },
        content:    { bsonType: 'string' },
        rawContent: { bsonType: 'string' },
        featured:   { bsonType: 'bool' },
        isActive:   { bsonType: 'bool' }
      }
    }
  }, [
    { key: { isActive: 1, createdAt: -1 }, options: { name: 'active_date' } },
    { key: { category: 1 },               options: { name: 'category_1' } },
    { key: { featured: 1 },               options: { name: 'featured_1' } },
    { key: { title: 'text', excerpt: 'text' }, options: { name: 'text_search' } }
  ]);

  /* ═══════════════════════════════════════
     9. news
  ═══════════════════════════════════════ */
  await createCol('news', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title','category','content'],
      properties: {
        title:      { bsonType: 'string' },
        category:   { bsonType: 'string' },
        catLabel:   { bsonType: 'string' },
        catColor:   { bsonType: 'string' },
        catBg:      { bsonType: 'string' },
        readTime:   { bsonType: 'string' },
        image:      { bsonType: 'string' },
        excerpt:    { bsonType: 'string' },
        content:    { bsonType: 'string' },
        rawContent: { bsonType: 'string' },
        pinned:     { bsonType: 'bool' },
        featured:   { bsonType: 'bool' },
        isActive:   { bsonType: 'bool' }
      }
    }
  }, [
    { key: { isActive: 1, createdAt: -1 }, options: { name: 'active_date' } },
    { key: { category: 1 },               options: { name: 'category_1' } },
    { key: { pinned: 1 },                 options: { name: 'pinned_1' } },
    { key: { title: 'text', excerpt: 'text' }, options: { name: 'text_search' } }
  ]);

  /* ═══════════════════════════════════════
     10. categories
  ═══════════════════════════════════════ */
  await createCol('categories', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name'],
      properties: {
        name:        { bsonType: 'string' },
        slug:        { bsonType: 'string' },
        description: { bsonType: 'string', maxLength: 500 },
        icon:        { bsonType: 'string' },
        image: {
          bsonType: 'object',
          properties: { url: { bsonType: 'string' }, public_id: { bsonType: 'string' } }
        },
        isActive: { bsonType: 'bool' },
        order:    { bsonType: 'number' }
      }
    }
  }, [
    { key: { name: 1 }, options: { unique: true, name: 'name_unique' } },
    { key: { slug: 1 }, options: { unique: true, sparse: true, name: 'slug_unique' } },
    { key: { isActive: 1, order: 1 }, options: { name: 'active_order' } }
  ]);

  /* ═══════════════════════════════════════
     11. combos
  ═══════════════════════════════════════ */
  await createCol('combos', {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name','description','products','price','originalPrice'],
      properties: {
        name:          { bsonType: 'string' },
        description:   { bsonType: 'string' },
        products: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['product','quantity'],
            properties: {
              product:  { bsonType: 'objectId' },
              quantity: { bsonType: 'number', minimum: 1 }
            }
          }
        },
        image: {
          bsonType: 'object',
          required: ['url'],
          properties: { url: { bsonType: 'string' }, public_id: { bsonType: 'string' } }
        },
        price:         { bsonType: 'number', minimum: 0 },
        originalPrice: { bsonType: 'number', minimum: 0 },
        badge:         { bsonType: 'string', enum: ['Bestseller','Hot Deal','Wellness','New'] },
        isActive:      { bsonType: 'bool' },
        stock:         { bsonType: 'number' }
      }
    }
  }, [
    { key: { isActive: 1 },    options: { name: 'active_1' } },
    { key: { badge: 1 },       options: { name: 'badge_1' } }
  ]);

  /* ═══════════════════════════════════════
     Done
  ═══════════════════════════════════════ */
  const final = (await db.listCollections().toArray()).map(c => c.name).sort();
  console.log('\n✅ Schema setup complete!');
  console.log('Collections in Atlas:', final.join(', '));
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
