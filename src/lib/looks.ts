export type Look = {
  image: string;
  name: string;
  category: "women" | "men" | "weddings";
  productSlug?: string;
};

// Original supplied photographs; different colourways are shown as separate looks.
export const LOOKS: Look[] = [
  { image: "nia-1.jpg", name: "Emerald & gold matching set", category: "women", productSlug: "nia-colour-block-set" },
  { image: "jabali-1.jpg", name: "Royal blue pinstripe suit", category: "men", productSlug: "jabali-double-breasted-suit" },
  { image: "makena-1.jpg", name: "Tangerine vest & trousers", category: "women", productSlug: "makena-vest-set" },
  { image: "juma-2.jpg", name: "Cocoa utility set", category: "men", productSlug: "juma-utility-jacket-set" },
  { image: "neema-1.jpg", name: "Sand double-breasted skirt suit", category: "women", productSlug: "neema-skirt-suit" },
  { image: "baraka-2.jpg", name: "Emerald occasion suit", category: "men", productSlug: "baraka-three-piece-suit" },
  { image: "njeri-1.jpg", name: "Blue pinstripe dress & blazer", category: "women", productSlug: "njeri-blazer-dress" },
  { image: "wedding-party.jpg", name: "Coordinated wedding party", category: "weddings" },
  { image: "amani-1.jpg", name: "Cobalt double-breasted suit", category: "women", productSlug: "amani-double-breasted-suit" },
  { image: "imani-1.jpg", name: "Black shirt suit", category: "men", productSlug: "imani-shirt-suit" },
  { image: "shiku-1.jpg", name: "Grey shirt & trouser suit", category: "women", productSlug: "shiku-shirt-suit" },
  { image: "jabali-2.jpg", name: "Sky blue occasion suit", category: "men", productSlug: "jabali-double-breasted-suit" },
  { image: "amani-2.jpg", name: "Plum tailored blazer", category: "women", productSlug: "amani-double-breasted-suit" },
  { image: "neema-2.jpg", name: "Charcoal skirt suit", category: "women", productSlug: "neema-skirt-suit" },
  { image: "wanjiru-1.jpg", name: "Midnight trouser suit", category: "women", productSlug: "wanjiru-trouser-suit" },
  { image: "juma-1.jpg", name: "White jacket with navy pockets", category: "men", productSlug: "juma-utility-jacket-set" },
  { image: "tumaini-1.jpg", name: "Indigo short-sleeve safari suit", category: "men", productSlug: "tumaini-safari-suit" },
  { image: "imani-2.jpg", name: "Grey shirt suit", category: "men", productSlug: "imani-shirt-suit" },
  { image: "wanjiru-2.jpg", name: "Navy shirt & trouser set", category: "women", productSlug: "wanjiru-trouser-suit" },
  { image: "halima-1.jpg", name: "Turquoise tunic set", category: "women", productSlug: "halima-tunic-set" },
  { image: "monochrome-tunic.jpg", name: "Black & white panel tunic", category: "women" },
  { image: "wambui-1.jpg", name: "Red embellished two-piece", category: "women", productSlug: "wambui-two-piece" },
  { image: "baraka-1.jpg", name: "Cream suit with orange waistcoat", category: "men", productSlug: "baraka-three-piece-suit" },
  { image: "nia-2.jpg", name: "Olive & mustard asymmetric set", category: "women", productSlug: "nia-colour-block-set" },
  { image: "halima-2.jpg", name: "Mustard tunic set", category: "women", productSlug: "halima-tunic-set" },
  { image: "zawadi-1.jpg", name: "Navy & sky blue panel set", category: "women", productSlug: "zawadi-panel-tunic-set" },
  { image: "kendi-1.jpg", name: "Chocolate & sand chevron set", category: "women", productSlug: "kendi-panel-set" },
  { image: "zawadi-2.jpg", name: "Purple & orange panel set", category: "women", productSlug: "zawadi-panel-tunic-set" },
];
