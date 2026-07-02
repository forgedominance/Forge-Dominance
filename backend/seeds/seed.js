const supabase = require('../config/supabase');
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { isMissingTableError } = require('../lib/dbUtils');

async function safeMaybeSingle(query) {
  const result = await query;
  if (result?.error && !isMissingTableError(result.error)) {
    throw result.error;
  }
  const data = result?.data;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}

async function seedDatabase() {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Seed admin user
    console.log('Creating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-before-production';
    
    const existingAdmin = await User.findByEmail(adminEmail);
    if (!existingAdmin) {
      await User.create(adminEmail, adminPassword, 'superadmin');
      console.log(`✅ Admin created: ${adminEmail}`);
    } else {
      console.log(`✅ Admin already exists: ${adminEmail}`);
    }

    // Seed products
    console.log('Creating sample products...');
    const products = [
      {
        name: 'Classic Hunting Knife',
        sku: 'BL-001',
        price: 99.99,
        compare_price: 129.99,
        stock: 50,
        category: 'Hunters',
        description: 'Premium hunting knife with sharp blade',
        featured: true
      },
      {
        name: 'Combat Survival Knife',
        sku: 'BL-002',
        price: 149.99,
        compare_price: 199.99,
        stock: 30,
        category: 'Hunters',
        description: 'Heavy-duty survival blade',
        featured: true
      },
      {
        name: 'Precision Skinning Knife',
        sku: 'BL-003',
        price: 79.99,
        compare_price: 99.99,
        stock: 75,
        category: 'Skinning Knives',
        description: 'Perfect for precision work',
        featured: false
      }
    ];

    for (const product of products) {
      const existing = await safeMaybeSingle(supabase.from('products').select('id').eq('sku', product.sku).limit(1));
      if (!existing) {
        await Product.create(product);
        console.log(`✅ Product created: ${product.name}`);
      }
    }

    // Seed customers
    console.log('Creating sample customers...');
    const customers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001'
      }
    ];

    for (const customer of customers) {
      const existing = await Customer.findByEmail(customer.email);
      if (!existing) {
        await Customer.create(customer);
        console.log(`✅ Customer created: ${customer.name}`);
      }
    }

    // Seed sample orders
    console.log('Creating sample orders...');
    const customersList = await Customer.findAll(1, 0);
    if (customersList && customersList.length > 0) {
      const customerId = customersList[0].id;
      
      const orders = [
        {
          customer_id: customerId,
          status: 'completed',
          total: 299.98,
          items: JSON.stringify([
            { productId: 1, quantity: 2, price: 99.99 }
          ])
        },
        {
          customer_id: customerId,
          status: 'pending',
          total: 149.99,
          items: JSON.stringify([
            { productId: 2, quantity: 1, price: 149.99 }
          ])
        }
      ];

      for (const order of orders) {
        await Order.create(order);
        console.log(`✅ Order created: ${order.status}`);
      }
    }

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();


