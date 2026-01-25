import { apiPost, apiGet } from "./client";
import type {
  GenerateImageResponse,
  ImageStatusResponse,
} from "../types";

export async function generateImage(
  sid: string,
  slideIndex: number,
): Promise<GenerateImageResponse> {
  return apiPost<GenerateImageResponse>(`/slides/${sid}/${slideIndex}/generate`, {});
}

export async function getImageStatus(
  sid: string,
  slideIndex: number,
): Promise<ImageStatusResponse> {
  return apiGet<ImageStatusResponse>(`/slides/${sid}/${slideIndex}/status`);
}
