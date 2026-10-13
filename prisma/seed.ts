import { PrismaClient } from "../node_modules/.prisma/wachira-client";

const db = new PrismaClient();

const WOMEN = "S,M,L,XL,XXL";
const MEN = "S,M,L,XL,XXL";

const SUIT = "Chest,Shoulder width,Sleeve length,Jacket length,Waist,Hips,Inseam,Trouser length";
const LADIES_SUIT = "Bust,Waist,Hips,Shoulder width,Sleeve length,Jacket length,Trouser length";
const SKIRT_SUIT = "Bust,Waist,Hips,Shoulder width,Sleeve length,Jacket length,Skirt length";
const TUNIC_SET = "Bust,Waist,Hips,Sleeve length,Top length,Trouser length";

// `photos` is how many images exist in public/products: 2 = <key>-1.jpg and <key>-2.jpg (hover).
const products = [
  {
    slug: "baraka-three-piece-suit", name: "Baraka Three-Piece Suit", category: "men", photos: 2,
    description: "Jacket, waistcoat and trousers, with a contrast waistcoat and matching tie. Made for weddings and big days.",
    price: 18500, sizes: MEN, measureFields: SUIT,
    badge: "New", colors: "#D8CBA8,#2F6B3F,#D9622B", featured: true,
  },
  {
    slug: "amani-double-breasted-suit", name: "Amani Double-Breasted Suit", category: "women", photos: 2,
    description: "Long double-breasted blazer with peak lapels and straight trousers.",
    price: 12500, sizes: WOMEN, measureFields: LADIES_SUIT,
    badge: "New", colors: "#2B4FBF,#4A2340",
  },
  {
    slug: "jabali-double-breasted-suit", name: "Jabali Double-Breasted Suit", category: "men", photos: 2,
    description: "Six-button double-breasted jacket with slim trousers. Sharp for the office or an evening out.",
    price: 15500, sizes: MEN, measureFields: SUIT,
    colors: "#27336B,#6FA3D6",
  },
  {
    slug: "neema-skirt-suit", name: "Neema Skirt Suit", category: "women", photos: 2,
    description: "Fitted blazer with a knee-length pencil skirt.",
    price: 11000, sizes: WOMEN, measureFields: SKIRT_SUIT,
    colors: "#D4B99A,#6E6E70",
  },
  {
    slug: "juma-utility-jacket-set", name: "Juma Utility Jacket Set", category: "men", photos: 2,
    description: "Shirt jacket with contrast patch pockets and matching trousers.",
    price: 9500, sizes: MEN, measureFields: SUIT,
    colors: "#F2EFE6,#27336B,#7A4E3F",
  },
  {
    slug: "wanjiru-trouser-suit", name: "Wanjiru Trouser Suit", category: "women", photos: 2,
    description: "Single-breasted blazer with tailored trousers. Office ready.",
    price: 11500, sizes: WOMEN, measureFields: LADIES_SUIT,
    colors: "#1B1D30,#27336B",
  },
  {
    slug: "nia-colour-block-set", name: "Nia Colour-Block Set", category: "women", photos: 2,
    description: "Two-tone tunic with a chevron panel, worn over slim trousers.",
    price: 6500, sizes: WOMEN, measureFields: TUNIC_SET,
    badge: "New", colors: "#1F7A5A,#E7C33B",
  },
  {
    slug: "imani-shirt-suit", name: "Imani Shirt Suit", category: "men", photos: 2,
    description: "Button-up shirt jacket with matching trousers. Smart without a tie.",
    price: 8500, sizes: MEN, measureFields: SUIT,
    colors: "#1B1B1B,#7C7F86",
  },
  {
    slug: "zawadi-panel-tunic-set", name: "Zawadi Panel Tunic Set", category: "women", photos: 2,
    description: "Long tunic with contrast front panels and matching trousers.",
    price: 6800, sizes: WOMEN, measureFields: TUNIC_SET,
    colors: "#8BB4DE,#3B3E7A,#D9622B",
  },
  {
    slug: "halima-tunic-set", name: "Halima Tunic Set", category: "women", photos: 2,
    description: "Long-sleeve tunic with a yoke detail and matching trousers.",
    price: 6000, sizes: WOMEN, measureFields: TUNIC_SET,
    colors: "#3A9BB5,#D9B632",
  },
  {
    slug: "tumaini-safari-suit", name: "Tumaini Safari Suit", category: "men", photos: 1,
    description: "Short-sleeve safari jacket with chest pockets and matching trousers.",
    price: 7500, sizes: MEN, measureFields: SUIT,
    colors: "#262B5E",
  },
  {
    slug: "njeri-blazer-dress", name: "Njeri Blazer Dress", category: "women", photos: 1,
    description: "Fitted shift dress with a matching longline blazer.",
    price: 10500, sizes: WOMEN, measureFields: "Bust,Waist,Hips,Shoulder width,Sleeve length,Dress length",
    colors: "#2B4FBF",
  },
  {
    slug: "shiku-shirt-suit", name: "Shiku Shirt Suit", category: "women", photos: 1,
    description: "Relaxed shirt jacket and straight trousers in grey suiting.",
    price: 8500, sizes: WOMEN, measureFields: LADIES_SUIT,
    colors: "#7C7F86",
  },
  {
    slug: "makena-vest-set", name: "Makena Vest Set", category: "women", photos: 1,
    description: "Sleeveless wrap vest with cropped trousers.",
    price: 7000, sizes: WOMEN, measureFields: "Bust,Waist,Hips,Top length,Trouser length",
    colors: "#E0622A",
  },
  {
    slug: "wambui-two-piece", name: "Wambui Two-Piece", category: "women", photos: 1,
    description: "Embellished tee and slim trousers in one bold colour.",
    price: 5500, sizes: WOMEN, measureFields: TUNIC_SET,
    colors: "#D63A2F",
  },
  {
    slug: "kendi-panel-set", name: "Kendi Panel Set", category: "women", photos: 1,
    description: "Short-sleeve top with a contrast chevron panel and cropped trousers.",
    price: 6000, sizes: WOMEN, measureFields: TUNIC_SET,
    colors: "#7A4E3F,#CDB38A",
  },
];

async function main() {
  for (const [i, { photos, ...p }] of products.entries()) {
    const key = p.slug.split("-")[0];
    const data = {
      ...p,
      active: true,
      allowCustom: true,
      image: `/products/${key}-1.jpg`,
      image2: photos > 1 ? `/products/${key}-2.jpg` : null,
      // Stagger createdAt so "newest first" keeps this order.
      createdAt: new Date(Date.now() - i * 60_000),
    };
    // Populate missing outfits without overwriting prices or edits made in Admin.
    await db.product.upsert({ where: { slug: p.slug }, update: {}, create: data });
  }
  console.log(`Ensured ${products.length} sample products exist; existing products were preserved.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
