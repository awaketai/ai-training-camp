import { apiPost } from "./client";
import type {
  GenerateStyleRequest,
  GenerateStyleResponse,
  SelectStyleResponse,
} from "../types";

export async function generateStyleOptions(
  sid: string,
  description: string,
): Promise<GenerateStyleResponse> {
  const body: GenerateStyleRequest = { description };
  return apiPost<GenerateStyleResponse>(`/slides/${sid}/style/generate`, body);
}

export async function selectStyle(
  sid: string,
  imageIndex: number,
): Promise<SelectStyleResponse> {
  return apiPost<SelectStyleResponse>(`/slides/${sid}/style/select`, { image_index: imageIndex });
}
