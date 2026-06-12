import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../src/config/firebase';

const categories = [
  'Fruits & Vegetables',
  'Grocery & Staples',
  'Dairy & Bread',
  'Beverages',
  'Branded Foods'
];

const adjectives = ['Fresh', 'Organic', 'Premium', 'Local', 'Imported', 'Extra Large', 'Natural', 'Healthy', 'Farm', 'Sweet', 'Spicy', 'Tangy', 'Crunchy'];
const baseItems = {
  'Fruits & Vegetables': ['Apple', 'Banana', 'Tomato', 'Potato', 'Onion', 'Mango', 'Orange', 'Spinach', 'Cabbage', 'Carrot'],
  'Grocery & Staples': ['Rice', 'Dal', 'Flour', 'Sugar', 'Salt', 'Cooking Oil', 'Oats', 'Poha', 'Peanuts', 'Chana'],
  'Dairy & Bread': ['Milk', 'Bread', 'Butter', 'Cheese', 'Paneer', 'Yogurt', 'Curd', 'Eggs', 'Cream', 'Lassi'],
  'Beverages': ['Tea', 'Coffee', 'Juice', 'Cold Drink', 'Soda', 'Energy Drink', 'Water', 'Smoothie', 'Milkshake', 'Lemonade'],
  'Branded Foods': ['Biscuits', 'Noodles', 'Chips', 'Chocolates', 'Cereals', 'Pasta', 'Sauce', 'Jam', 'Pickle', 'Namkeen']
};

const categoryImages = {
  'Fruits & Vegetables': [
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80', // veggies
    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80', // bananas
    'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=400&q=80', // bananas 2
    'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80', // carrots
  ],
  'Grocery & Staples': [
    'https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=400&q=80', // rice/grains
    'https://images.unsplash.com/photo-1508061461528-ce2556ebd8c3?auto=format&fit=crop&w=400&q=80', // flour
  ],
  'Dairy & Bread': [
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80', // milk
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80', // bread
  ],
  'Beverages': [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', // soda/cola
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80', // juice
  ],
  'Branded Foods': [
    'https://images.unsplash.com/photo-1621415715975-ce4fa2674eb9?auto=format&fit=crop&w=400&q=80', // chips
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80', // cookies
  ]
};

export const seed500Products = async () => {
  try {
    const productsRef = collection(db, 'products');
    let generatedProducts = [];
    
    // Generate exactly 500 products
    for (let i = 1; i <= 500; i++) {
        // pick random category
        const category = categories[Math.floor(Math.random() * categories.length)];
        const possibleItems = baseItems[category];
        const baseName = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        
        const price = Math.floor(Math.random() * 500) + 20; // 20 to 520
        const hasDiscount = Math.random() > 0.6;
        const oldPrice = hasDiscount ? price + Math.floor(Math.random() * 100) + 10 : null;
        
        const catImgs = categoryImages[category];
        const imgUrl = catImgs[Math.floor(Math.random() * catImgs.length)];
        
        generatedProducts.push({
            id: `prod_${i}`, 
            name: `${adjective} ${baseName} - Variant ${i}`,
            price: price,
            oldPrice: oldPrice,
            category: category,
            discount: hasDiscount ? `${Math.floor(10 + Math.random() * 40)}% OFF` : null,
            imgUrl: imgUrl, 
            quantity: 1
        });
    }

    console.log(`Prepared ${generatedProducts.length} items. Writing in batches of 500...`);
    
    // Firestore batch supports max 500 writes, perfect fit.
    const batch = writeBatch(db);
    
    generatedProducts.forEach(prod => {
        const itemRef = doc(productsRef); // auto-generating ID
        batch.set(itemRef, { ...prod, dbId: itemRef.id }); 
    });

    await batch.commit();
    console.log("Successfully seeded 500 items to Firestore!");
    return true;
  } catch (error) {
    console.error("Error seeding products:", error);
    throw error;
  }
};
