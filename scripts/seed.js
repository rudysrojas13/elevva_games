const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando la siembra (seeding) de la base de datos del panel...');

  // 1. Limpiar base de datos
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Crear administrador por defecto (admin@panel.com / admin123)
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador del Panel',
      email: 'admin@panel.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      balance: 0.0,
    },
  });
  console.log('Administrador creado:', admin.email);

  // 3. Crear cliente revendedor por defecto (cliente@panel.com / cliente123)
  const clientPasswordHash = bcrypt.hashSync('cliente123', 10);
  const client = await prisma.user.create({
    data: {
      name: 'Revendedor de Prueba',
      email: 'cliente@panel.com',
      passwordHash: clientPasswordHash,
      role: 'user',
      balance: 500.0, // Representa $500.000 COP en nuestra escala
    },
  });
  console.log('Cliente revendedor creado:', client.email, 'con saldo:', client.balance);

  // 4. Crear productos de prueba
  const products = [
    {
      name: "Call of Duty: Modern Warfare 4 EXCLUSIVO PS5 (preventa)",
      description: "Adquiere el juego del año en preventa exclusiva. Recibe la cuenta primaria de inmediato para precarga y juega desde el primer minuto de lanzamiento en PS5.",
      price: 199.00, // $199.000 COP
      category: "PS5",
      imageUrl: "/covers/cod_mw4.png",
      stock: 15,
      active: true,
    },
    {
      name: "EA SPORTS FC 26 (Cuenta Primaria)",
      description: "Siente el fútbol total en PlayStation 5 con la nueva entrega de EA Sports. Gráficos mejorados, modos de juego exclusivos y actualización de plantillas en tiempo real.",
      price: 185.00, // $185.000 COP
      category: "PS5",
      imageUrl: "/covers/fc26.png",
      stock: 8,
      active: true,
    },
    {
      name: "Elden Ring (Código Digital)",
      description: "Álzate, Sinluz, y déjate guiar por la gracia para esgrimir el poder del Círculo de Elden en las Tierras Intermedias para PS4.",
      price: 45.00, // $45.000 COP
      category: "PS4",
      imageUrl: "https://images.unsplash.com/photo-1655821888788-6107699e173b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stock: 12,
      active: true,
    },
    {
      name: "GTA V: Premium Edition (Cuenta Secundaria)",
      description: "Vive las vidas de tres criminales muy diferentes en Los Santos con acceso a GTA Online para PS4.",
      price: 20.00, // $20.000 COP
      category: "PS4",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stock: 20,
      active: true,
    },
    {
      name: "PlayStation Plus Extra - 12 Meses",
      description: "Accede al catálogo de juegos con cientos de títulos descargables de PS4 y PS5, multijugador online y más.",
      price: 100.00, // $100.000 COP
      category: "Suscripciones",
      imageUrl: "https://images.unsplash.com/photo-1592155977687-3c58253a6db9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stock: 50,
      active: true,
    },
    {
      name: "EA Play - 1 Mes (Código Digital)",
      description: "Consigue acceso instantáneo a una colección de los mejores títulos de EA, pruebas de juego antes del lanzamiento y un 10% de descuento en compras digitales de EA.",
      price: 6.00, // $6.000 COP
      category: "Suscripciones",
      imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      stock: 100,
      active: true,
    }
  ];

  for (const prod of products) {
    const createdProduct = await prisma.product.create({
      data: prod,
    });
    console.log(`Producto creado: ${createdProduct.name} (${createdProduct.category})`);
  }

  // 5. Crear un pedido de ejemplo en estado completado con credenciales entregadas
  const demoProduct = await prisma.product.findFirst({ where: { category: "PS5" } });
  if (demoProduct) {
    await prisma.order.create({
      data: {
        userId: client.id,
        productId: demoProduct.id,
        total: demoProduct.price,
        status: "Completado",
        credentials: "correo_ejemplo@gmail.com:clave123 | Instrucciones: 1. Agrega el perfil en tu PS5. 2. Activa como primaria. 3. Descarga el juego y disfrútalo desde tu usuario.",
      }
    });
    console.log('Pedido de ejemplo con credenciales creado.');
  }

  console.log('Seeding completado con éxito.');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
