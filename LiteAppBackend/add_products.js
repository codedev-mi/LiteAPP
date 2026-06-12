const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const productsData = {
  'Fruits': [
    {
      name: 'Organic Strawberries',
      brand: 'Farm Fresh',
      description: 'Sweet, juicy, and handpicked organic strawberries.',
      img: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=400&auto=format&fit=crop',
      subTag: 'Fruits',
      packSize: '250g',
      price: 150,
      variants: [
        { packSize: '250g', price: 150, stockQuantity: 100 },
        { packSize: '500g', price: 280, stockQuantity: 50 }
      ]
    },
    {
      name: 'Robusta Bananas',
      brand: 'Daily Pick',
      description: 'Fresh and nutritious Robusta bananas.',
      img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=400&auto=format&fit=crop',
      subTag: 'Fruits',
      packSize: '1 Dozen',
      price: 40,
      variants: [
        { packSize: '1 Dozen', price: 40, stockQuantity: 150 }
      ]
    },
    {
      name: 'Shimla Apples',
      brand: 'Royal Fresh',
      description: 'Crisp and sweet premium red Shimla apples.',
      img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=400&auto=format&fit=crop',
      subTag: 'Fruits',
      packSize: '1 kg',
      price: 180,
      variants: [
        { packSize: '1 kg', price: 180, stockQuantity: 120 },
        { packSize: '2 kg', price: 340, stockQuantity: 60 }
      ]
    },
    {
      name: 'Nagpur Oranges',
      brand: 'Local Orchard',
      description: 'Tangy and juicy fresh Nagpur oranges.',
      img: 'https://images.unsplash.com/photo-1547514701-42782101795e?q=80&w=400&auto=format&fit=crop',
      subTag: 'Fruits',
      packSize: '1 kg',
      price: 120,
      variants: [
        { packSize: '1 kg', price: 120, stockQuantity: 80 }
      ]
    },
    {
      name: 'Fresh Blueberries',
      brand: 'Berry Delight',
      description: 'Antioxidant-rich fresh and premium blueberries.',
      img: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?q=80&w=400&auto=format&fit=crop',
      subTag: 'Fruits',
      packSize: '125g',
      price: 299,
      variants: [
        { packSize: '125g', price: 299, stockQuantity: 40 }
      ]
    }
  ],
  'Vegetables': [
    {
      name: 'Hybrid Tomatoes',
      brand: 'Veggie Farm',
      description: 'Firm and red tomatoes perfect for curries and salads.',
      img: 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=400&auto=format&fit=crop',
      subTag: 'Vegetables',
      packSize: '1 kg',
      price: 30,
      variants: [
        { packSize: '1 kg', price: 30, stockQuantity: 200 },
        { packSize: '500g', price: 18, stockQuantity: 150 }
      ]
    },
    {
      name: 'Fresh Spinach (Palak)',
      brand: 'Green Leaf',
      description: 'Cleaned and sorted nutrient-rich green spinach leaves.',
      img: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400&auto=format&fit=crop',
      subTag: 'Vegetables',
      packSize: '250g',
      price: 20,
      variants: [
        { packSize: '250g', price: 20, stockQuantity: 90 }
      ]
    },
    {
      name: 'Orange Carrots',
      brand: 'Root Veggies',
      description: 'Sweet and crunchy orange carrots.',
      img: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=400&auto=format&fit=crop',
      subTag: 'Vegetables',
      packSize: '500g',
      price: 45,
      variants: [
        { packSize: '500g', price: 45, stockQuantity: 110 }
      ]
    },
    {
      name: 'Green Broccoli',
      brand: 'Premium Farm',
      description: 'Fresh and vitamin-packed green broccoli head.',
      img: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?q=80&w=400&auto=format&fit=crop',
      subTag: 'Vegetables',
      packSize: '1 pc',
      price: 90,
      variants: [
        { packSize: '1 pc', price: 90, stockQuantity: 60 }
      ]
    },
    {
      name: 'Organic Garlic',
      brand: 'Spice Roots',
      description: 'Strong-flavoured fresh organic garlic bulbs.',
      img: 'https://images.unsplash.com/photo-1564767609342-620cb19b2357?q=80&w=400&auto=format&fit=crop',
      subTag: 'Vegetables',
      packSize: '250g',
      price: 60,
      variants: [
        { packSize: '250g', price: 60, stockQuantity: 100 }
      ]
    }
  ],
  'Grocery': [
    {
      name: 'Premium Basmati Rice',
      brand: 'India Gate',
      description: 'Long grain, aromatic classic Basmati rice.',
      img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '1 kg',
      price: 110,
      variants: [
        { packSize: '1 kg', price: 110, stockQuantity: 150 },
        { packSize: '5 kg', price: 520, stockQuantity: 80 }
      ]
    },
    {
      name: 'Extra Virgin Olive Oil',
      brand: 'Borges',
      description: '100% pure extra virgin olive oil for healthy cooking.',
      img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '1L',
      price: 850,
      variants: [
        { packSize: '1L', price: 850, stockQuantity: 50 }
      ]
    },
    {
      name: 'Whole Wheat Flour (Atta)',
      brand: 'Aashirvaad',
      description: 'Superior quality whole wheat atta for soft rotis.',
      img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '5 kg',
      price: 260,
      variants: [
        { packSize: '5 kg', price: 260, stockQuantity: 100 },
        { packSize: '10 kg', price: 499, stockQuantity: 60 }
      ]
    },
    {
      name: 'Red Lentils (Masoor Dal)',
      brand: 'Tata Sampann',
      description: 'Unpolished, protein-rich red split lentils.',
      img: 'https://images.unsplash.com/photo-1547058881-aa0edd92aab3?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '1 kg',
      price: 140,
      variants: [
        { packSize: '1 kg', price: 140, stockQuantity: 120 }
      ]
    },
    {
      name: 'Iodized Table Salt',
      brand: 'Tata',
      description: 'Vacuum evaporated iodized table salt.',
      img: 'https://images.unsplash.com/photo-1618035515578-9e5cf0a37356?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '1 kg',
      price: 28,
      variants: [
        { packSize: '1 kg', price: 28, stockQuantity: 300 }
      ]
    }
  ],
  'Dairy': [
    {
      name: 'Fresh Paneer (Cottage Cheese)',
      brand: 'Amul',
      description: 'Soft, hygienic, and fresh cottage cheese blocks.',
      img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '200g',
      price: 90,
      variants: [
        { packSize: '200g', price: 90, stockQuantity: 100 },
        { packSize: '500g', price: 210, stockQuantity: 40 }
      ]
    },
    {
      name: 'Salted Butter',
      brand: 'Amul',
      description: 'Deliciously creamy salted table butter.',
      img: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '100g',
      price: 56,
      variants: [
        { packSize: '100g', price: 56, stockQuantity: 200 },
        { packSize: '500g', price: 265, stockQuantity: 80 }
      ]
    },
    {
      name: 'Greek Plain Yogurt',
      brand: 'Epigamia',
      description: 'Thick, creamy, and high-protein strained plain yogurt.',
      img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '90g',
      price: 45,
      variants: [
        { packSize: '90g', price: 45, stockQuantity: 80 }
      ]
    },
    {
      name: 'Fresh Cream',
      brand: 'Amul',
      description: 'Low-fat fresh cream for enhancing cooking and desserts.',
      img: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '250ml',
      price: 67,
      variants: [
        { packSize: '250ml', price: 67, stockQuantity: 120 }
      ]
    },
    {
      name: 'Cheddar Cheese Blocks',
      brand: 'Britannia',
      description: 'Rich and pasteurized processed cheddar cheese block.',
      img: 'https://images.unsplash.com/photo-1618067424218-45f94c1d634b?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '200g',
      price: 165,
      variants: [
        { packSize: '200g', price: 165, stockQuantity: 70 }
      ]
    }
  ],
  'Meat / Seafood': [
    {
      name: 'Boneless Chicken Breast',
      brand: 'Zorabian',
      description: 'Fresh, cleaned, and antibiotic-free boneless chicken breast.',
      img: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '500g',
      price: 290,
      variants: [
        { packSize: '500g', price: 290, stockQuantity: 60 }
      ]
    },
    {
      name: 'Fresh Salmon Fillet',
      brand: 'Sea Fresh',
      description: 'Premium Quality Norwegian Salmon Fillet with skin-on.',
      img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '250g',
      price: 950,
      variants: [
        { packSize: '250g', price: 950, stockQuantity: 30 }
      ]
    },
    {
      name: 'Mutton Curry Cut',
      brand: 'Zappfresh',
      description: 'Fresh and tender goat meat curry cut pieces.',
      img: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '1 kg',
      price: 680,
      variants: [
        { packSize: '1 kg', price: 680, stockQuantity: 40 }
      ]
    },
    {
      name: 'Tiger Prawns (Cleaned)',
      brand: 'Sea Catch',
      description: 'Freshly caught, cleaned, deveined, and tail-on tiger prawns.',
      img: 'https://images.unsplash.com/photo-1559737225-33d1a957f856?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '250g',
      price: 340,
      variants: [
        { packSize: '250g', price: 340, stockQuantity: 50 }
      ]
    },
    {
      name: 'Premium Pork Ribs',
      brand: 'Meat Masters',
      description: 'Meaty, tender pork ribs cut for easy grilling or baking.',
      img: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop',
      subTag: 'General',
      packSize: '500g',
      price: 490,
      variants: [
        { packSize: '500g', price: 490, stockQuantity: 35 }
      ]
    }
  ]
};

async function main() {
  console.log('Beginning database synchronization...');

  // 1. Check if Veggies category exists and migrate it to Vegetables
  const veggiesCategory = await prisma.category.findFirst({ where: { name: 'Veggies' } });
  if (veggiesCategory) {
    console.log('Found category "Veggies". Migrating to "Vegetables"...');
    let vegetablesCategory = await prisma.category.findFirst({ where: { name: 'Vegetables' } });
    if (!vegetablesCategory) {
      vegetablesCategory = await prisma.category.create({ data: { name: 'Vegetables' } });
    }
    // Update products pointing to Veggies
    await prisma.product.updateMany({
      where: { categoryId: veggiesCategory.id },
      data: { categoryId: vegetablesCategory.id, cat: 'Vegetables' }
    });
    // Delete Veggies
    await prisma.category.delete({ where: { id: veggiesCategory.id } });
    console.log('Successfully migrated "Veggies" category.');
  }

  // 2. Ensure all required categories exist
  const categoriesToEnsure = ['Fruits', 'Vegetables', 'Grocery', 'Dairy', 'Meat / Seafood'];
  const categoryMap = new Map();

  for (const catName of categoriesToEnsure) {
    let cat = await prisma.category.findFirst({ where: { name: catName } });
    if (!cat) {
      cat = await prisma.category.create({ data: { name: catName } });
      console.log(`Created Category: "${catName}"`);
    } else {
      console.log(`Category "${catName}" already exists.`);
    }
    categoryMap.set(catName, cat);
  }

  // 3. Upsert products and variants
  for (const [catName, productsList] of Object.entries(productsData)) {
    const category = categoryMap.get(catName);
    console.log(`Seeding products for category: "${catName}"`);

    for (const productData of productsList) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name, categoryId: category.id }
      });

      if (existingProduct) {
        console.log(`  Updating product: "${productData.name}"`);
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            description: productData.description,
            brand: productData.brand,
            img: productData.img,
            cat: category.name,
            subTag: productData.subTag,
            price: productData.price,
            packSize: productData.packSize,
          }
        });

        // Upsert variants
        for (const variant of productData.variants) {
          const existingVariant = await prisma.productVariant.findFirst({
            where: { productId: existingProduct.id, packSize: variant.packSize }
          });
          if (existingVariant) {
            await prisma.productVariant.update({
              where: { id: existingVariant.id },
              data: { price: variant.price, stockQuantity: variant.stockQuantity }
            });
          } else {
            await prisma.productVariant.create({
              data: {
                productId: existingProduct.id,
                packSize: variant.packSize,
                price: variant.price,
                stockQuantity: variant.stockQuantity
              }
            });
          }
        }
      } else {
        console.log(`  Creating product: "${productData.name}"`);
        await prisma.product.create({
          data: {
            categoryId: category.id,
            name: productData.name,
            brand: productData.brand,
            description: productData.description,
            img: productData.img,
            cat: category.name,
            subTag: productData.subTag,
            price: productData.price,
            packSize: productData.packSize,
            variants: {
              create: productData.variants
            }
          }
        });
      }
    }
  }

  console.log('Database synchronization completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error running sync script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
