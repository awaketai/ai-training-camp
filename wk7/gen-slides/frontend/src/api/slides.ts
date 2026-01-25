import { apiGet, apiPut, apiPost, apiDelete } from "./client";
import type {
  SlidesData,
  UpdateSlideTextRequest,
  UpdateSlideResponse,
  ReorderSlidesRequest,
  AddSlideRequest,
  AddSlideResponse,
  DeleteSlideResponse,
} from "../types";

export async function fetchSlides(sid: string): Promise<SlidesData> {
  return apiGet<SlidesData>(`/slides/${sid}`);
}

export async function updateSlideText(
  sid: string,
  index: number,
  text: string,
): Promise<UpdateSlideResponse> {
  const body: UpdateSlideTextRequest = { text };
  return apiPut<UpdateSlideResponse>(`/slides/${sid}/${index}`, body);
}

export async function reorderSlides(
  sid: string,
  order: number[],
): Promise<SlidesData> {
  const body: ReorderSlidesRequest = { order };
  return apiPut<SlidesData>(`/slides/${sid}/reorder`, body);
}

export async function addSlide(
  sid: string,
  text: string,
  position?: number,
): Promise<AddSlideResponse> {
  const body: AddSlideRequest = { text, position };
  return apiPost<AddSlideResponse>(`/slides/${sid}/add`, body);
}

export async function deleteSlide(
  sid: string,
  index: number,
): Promise<DeleteSlideResponse> {
  return apiDelete<DeleteSlideResponse>(`/slides/${sid}/${index}`);
}
