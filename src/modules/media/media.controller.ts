import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './services/media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaOwnerType } from './enums/media-owner-type.enum';
import { MediaCollection } from './enums/media-collection.enum';
import { MAX_FILE_SIZE } from './constants/media.constants';

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    return this.mediaService.upload(file, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.findOne(id);
  }

  @Get()
  findByModel(
    @Query('modelType', new ParseEnumPipe(MediaOwnerType)) modelType: MediaOwnerType,
    @Query('modelId', ParseIntPipe) modelId: number,
    @Query('collection') collection?: MediaCollection,
  ) {
    return this.mediaService.findByModel(modelType, modelId, collection);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  replace(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.mediaService.replace(id, file);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.delete(id);
  }

  @Delete()
  deleteByModel(
    @Query('modelType', new ParseEnumPipe(MediaOwnerType)) modelType: MediaOwnerType,
    @Query('modelId', ParseIntPipe) modelId: number,
  ) {
    return this.mediaService.deleteByModel(modelType, modelId);
  }
}
