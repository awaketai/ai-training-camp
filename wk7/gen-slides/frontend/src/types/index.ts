// --- Entity Types ---

export interface Slide {
  index: number;
  text: string;
  images: string[];
  current_image: string | null;
  has_matching_image: boolean;
}

export interface SlidesData {
  sid: string;
  style_image: string | null;
  slides: Slide[];
}

// --- Request Types ---

export interface UpdateSlideTextRequest {
  text: string;
}

export interface ReorderSlidesRequest {
  order: number[];
}

export interface AddSlideRequest {
  text: string;
}

export interface GenerateImageRequest {
  slide_index: number;
}

export interface GenerateStyleRequest {
  description: string;
}

export interface SelectStyleRequest {
  image_hash: string;
}

// --- Response Types ---

export interface UpdateSlideResponse {
  success: boolean;
  has_image: boolean;
}

export interface ReorderResponse {
  success: boolean;
}

export interface GenerateImageResponse {
  task_id: string;
}

export interface ImageStatusResponse {
  generating: boolean;
  latest_hash: string | null;
}

export interface GenerateStyleResponse {
  images: string[];  // base64 encoded images
}

export interface SelectStyleResponse {
  success: boolean;
  style_image: string;
}

export interface AddSlideResponse {
  success: boolean;
  slide: Slide;
}
