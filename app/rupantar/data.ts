import { founderImage } from "./locked-assets";
import { hero2026 } from "./hero-2026";
import type {
  Category,
  EstimateForm,
  QueryForm,
  Review,
  ReviewForm,
  SiteSettings,
  Work,
  WorkForm,
} from "./types";

export const categories: Category[] = [
  { id: "1", slug: "architect", name: "Architect", desc: "Architectural planning, layouts & design coordination" },
  { id: "2", slug: "modular-kitchen", name: "Modular Kitchen", desc: "Functional & stylish kitchen solutions" },
  { id: "3", slug: "tv-cabinet", name: "TV Cabinet", desc: "Elegant entertainment units & wall panels" },
  { id: "4", slug: "wardrobe", name: "Wardrobe", desc: "Custom storage with premium finishes" },
  { id: "5", slug: "hydraulic-bed", name: "Hydraulic Bed", desc: "Space-saving smart storage beds" },
  { id: "6", slug: "false-ceiling", name: "False Ceiling", desc: "Designer ceilings with ambient lighting" },
  { id: "7", slug: "parqueting", name: "Parqueting", desc: "Premium wooden flooring craftsmanship" },
  { id: "8", slug: "railing", name: "Railing", desc: "Modern staircase & balcony railings" },
  { id: "9", slug: "home-construction", name: "Home Construction", desc: "Complete home construction from structure to finish" },
];

export const initialWorks: Work[] = [
  {
    id: "w1",
    title: "Modern Living Room Makeover",
    slug: "modern-living-room-makeover",
    category: "architect",
    location: "Kathmandu",
    shortDesc: "Warm minimal interior with oak finishes and ambient cove lighting.",
    longDesc: "A complete transformation of a 3BHK apartment in Kathmandu. We focused on warm neutrals, fluted panels, hidden storage and layered lighting. The client wanted a calm, clutter-free home that still feels lived-in. Delivered in 22 days with factory-finished modular elements fabricated at our workshop.",
    featured: true,
    images: [],
  },
  {
    id: "w2",
    title: "Premium L-Shaped Modular Kitchen",
    slug: "premium-l-shaped-modular-kitchen",
    category: "modular-kitchen",
    location: "Sanepa, Kathmandu",
    shortDesc: "High-gloss acrylic with quartz top and soft-close hardware.",
    longDesc: "L-shaped kitchen with tall unit, built-in chimney space and corner optimization. Materials: BWR ply, Hettich hinges, quartz countertop. Includes under-cabinet lights and cutlery organizers. Designed after detailed site measurement and 3D visualization.",
    featured: true,
    images: [],
  },
  {
    id: "w3",
    title: "Floating TV Unit with Marble Finish",
    slug: "floating-tv-unit-marble",
    category: "tv-cabinet",
    location: "Kathmandu",
    shortDesc: "Floating cabinet with fluted louvers and LED backlight.",
    longDesc: "A sleek floating TV cabinet designed to hide wiring and add depth to the living wall. Combination of sintered stone, laminate and open display niches. Integrated warm LED strip adds a premium floating effect in the evening.",
    featured: true,
    images: [],
  },
  {
    id: "w4",
    title: "Sliding Door Wardrobe with Loft",
    slug: "sliding-door-wardrobe-loft",
    category: "wardrobe",
    location: "Kathmandu",
    shortDesc: "Floor-to-ceiling wardrobe with mirror sliding and loft storage.",
    longDesc: "Custom 10ft wardrobe with soft-close sliding doors, internal drawers, and loft box. Optimized for a compact bedroom, maximizing vertical storage without making the room feel heavy.",
    featured: false,
    images: [],
  },
  {
    id: "w5",
    title: "King Hydraulic Storage Bed",
    slug: "king-hydraulic-storage-bed",
    category: "hydraulic-bed",
    location: "Kathmandu",
    shortDesc: "Cushioned headboard with heavy-duty lift-up storage.",
    longDesc: "Upholstered hydraulic bed with premium fabric, teakwood legs and high-capacity storage. Hydraulic mechanism tested for 50k cycles. Paired with matching side tables.",
    featured: false,
    images: [],
  },
  {
    id: "w6",
    title: "Living False Ceiling with Cove",
    slug: "living-false-ceiling-cove",
    category: "false-ceiling",
    location: "Kathmandu",
    shortDesc: "Gypsum ceiling with layered cove and magnetic track lights.",
    longDesc: "Contemporary gypsum false ceiling featuring layered cove, hidden profile lights and magnetic track system. Adds height and drama while concealing wiring and providing soft ambient lighting.",
    featured: false,
    images: [],
  },
];

export const initialReviews: Review[] = [
  { id: "r1", name: "Anil Shrestha", location: "Kathmandu", message: "Rupantar team delivered our kitchen before time. Finish is excellent, hardware smooth. Very professional.", rating: 5, instagramLink: "" },
  { id: "r2", name: "Sarina K.C.", location: "Kathmandu", message: "Loved the 3D design process. What we saw is what we got. Wardrobe storage planning is very smart.", rating: 5, instagramLink: "https://www.instagram.com/reel/example" },
  { id: "r3", name: "Ramesh Neupane", location: "Kathmandu", message: "Workshop visit helped us choose materials confidently. Installation was clean and fast.", rating: 4, instagramLink: "" },
  { id: "r4", name: "Pooja Maharjan", location: "Kathmandu", message: "Our TV unit became the highlight of our home. Guests always compliment it.", rating: 5, instagramLink: "" },
];

export const initialSettings: SiteSettings = {
  slogan: "Transforming Spaces Inspiring Lives",
  phone: "9745941799",
  instagram: "https://www.instagram.com/rupantarhomes_by_gokulkunwar/?hl=en",
  tiktok: "https://www.tiktok.com/@rupantarhomes_by_gokul",
  address: "Kathmandu, Nepal",
  workshopNote: "Workshop visit by appointment only",
};

export const emptyEstimate: EstimateForm = {
  name: "",
  phone: "",
  location: "",
  category: "architect",
  size: "",
  material: "",
  message: "",
  attachment: null,
};

export const emptyQuery: QueryForm = {
  name: "",
  phone: "",
  category: "architect",
  message: "",
  attachment: null,
};

export const emptyWork: WorkForm = {
  title: "",
  slug: "",
  category: "architect",
  location: "",
  shortDesc: "",
  longDesc: "",
  featured: false,
  images: [],
};

export const emptyReview: ReviewForm = {
  name: "",
  location: "",
  message: "",
  rating: 5,
  instagramLink: "",
};

export const brandAssets = {
  logo: "/assets/rupantar-logo.jpg",
  founder: founderImage,
  hero: hero2026,
  favicon: "/assets/rupantar-favicon.png",
} as const;