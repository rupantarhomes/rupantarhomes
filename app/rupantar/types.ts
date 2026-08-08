export type PublicPage = "home" | "works" | "work-detail" | "about";

export type AdminPage =
  | "admin-login"
  | "admin-dashboard"
  | "admin-works"
  | "admin-reviews"
  | "admin-settings";

export type Page = PublicPage | AdminPage;

export type Category = {
  id: string;
  slug: string;
  name: string;
  desc: string;
};

export type Work = {
  id: string;
  title: string;
  slug: string;
  category: string;
  location: string;
  shortDesc: string;
  longDesc: string;
  featured: boolean;
  images: WorkImage[];
};

export type WorkImage = {
  id: string;
  workId?: string;
  url: string;
  publicId: string;
  altText: string;
  sortOrder: number;
  width?: number;
  height?: number;
  bytes?: number;
};

export type Review = {
  id: string;
  name: string;
  location: string;
  message: string;
  rating: number;
  instagramLink?: string;
};

export type SiteSettings = {
  slogan: string;
  phone: string;
  instagram: string;
  tiktok: string;
  address: string;
  workshopNote: string;
};

export type AdminStats = {
  queries: number;
  estimates: number;
};

export type EstimateForm = {
  name: string;
  phone: string;
  location: string;
  category: string;
  size: string;
  material: string;
  message: string;
};

export type QueryForm = {
  name: string;
  phone: string;
  category: string;
  message: string;
};

export type WorkForm = Omit<Work, "id">;

export type ReviewForm = Omit<Review, "id">;
