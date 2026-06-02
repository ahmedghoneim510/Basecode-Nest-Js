export interface MediaResponseDto {
  id: number;
  uuid: string;
  fileName: string;
  originalName: string;
  extension: string;
  mimeType: string;
  size: number;
  disk: string;
  collectionName: string;
  modelType: string;
  modelId: number;
  url: string;
  conversions: ConversionResponseDto[];
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface ConversionResponseDto {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}
