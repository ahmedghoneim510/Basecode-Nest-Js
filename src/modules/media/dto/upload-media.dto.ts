import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaOwnerType } from '../enums/media-owner-type.enum';
import { MediaCollection } from '../enums/media-collection.enum';

export class UploadMediaDto {
  @IsEnum(MediaOwnerType)
  modelType: MediaOwnerType;

  @Type(() => Number)
  @IsInt()
  modelId: number;

  @IsEnum(MediaCollection)
  @IsOptional()
  collectionName?: MediaCollection = MediaCollection.DEFAULT;

  @IsString()
  @IsOptional()
  directory?: string;
}
