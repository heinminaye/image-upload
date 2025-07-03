import { Service, Inject } from 'typedi';
import { Model } from 'mongoose';
import { IImage } from '../interfaces/Image';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import sharp from 'sharp';
@Service()
export default class ImageService {
    private bucket: GridFSBucket;

    constructor(
        @Inject('imageModel') private imageModel: Model<IImage>,
        @Inject('mongooseConnection') private connection: mongoose.Connection
    ) {
        if (!this.connection.db) {
            throw new Error('Mongo connection is not ready');
        }
        this.bucket = new mongoose.mongo.GridFSBucket(this.connection.db, {
            bucketName: 'images',
        });
    }

    public async getAllImages(
        cursor: string | null = null,
        limit: number,
        search: string | null = null
    ): Promise<{
        images: IImage[];
        nextCursor: string | null;
        hasMore: boolean;
    }> {
        try {
            let query: any = {};

            if (cursor) {
                query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
            }

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { title: searchRegex },
                    { description: searchRegex }
                ];
            }

            const images = await this.imageModel.find(query)
                .sort({ uploadDate: -1 })
                .limit(limit + 1)
                .select('-__v -createdAt -updatedAt')
                .lean()
                .exec();

            let hasMore = false;
            let nextCursor = null;

            if (images.length > limit) {
                hasMore = true;
                images.pop();
            }

            if (images.length > 0) {
                nextCursor = images[images.length - 1]._id.toString();
            }
            return {
                images,
                nextCursor,
                hasMore
            };
        } catch (error) {
            console.error('Error fetching paginated images:', error);
            return {
                images: [],
                nextCursor: null,
                hasMore: false
            };
        }
    }

    async uploadImage(
        fileBuffer: Buffer,
        filename: string,
        contentType: string,
        metadata: { title: string; description: string; width?: number; height?: number }
    ): Promise<IImage> {
        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(filename, {
                contentType,
                metadata,
            });

            uploadStream.end(fileBuffer);

            uploadStream.on('finish', async (file: any) => {
                try {
                    const fileId = uploadStream.id;
                    const size = fileBuffer.length;
                    const imageDoc = await this.imageModel.create({
                        title: metadata.title,
                        description: metadata.description,
                        filename,
                        size: size,
                        contentType,
                        fileId,
                        width: metadata.width,
                        height: metadata.height,
                    });
                    resolve(imageDoc);
                } catch (err) {
                    reject(err);
                }
            });

            uploadStream.on('error', (err) => reject(err));
        });
    }

    async getImageFileStream(fileId: string): Promise<NodeJS.ReadableStream | null> {
        try {
            const _id = new ObjectId(fileId);
            return this.bucket.openDownloadStream(_id);
        } catch {
            return null;
        }
    }

    async getImageDocument(fileId: string): Promise<IImage | null> {
        try {
            if (!mongoose.Types.ObjectId.isValid(fileId)) {
                return null;
            }
            return await this.imageModel.findOne({ fileId });
        } catch (error) {
            console.error('Error getting image document:', error);
            return null;
        }
    }

    public async validateImageFile(buffer: Buffer): Promise<boolean> {
        try {
            const metadata = await sharp(buffer).metadata();

            const allowedFormats = ['jpeg', 'png', 'webp'];

            if (!metadata.format || !allowedFormats.includes(metadata.format)) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    public async updateImageWithFile(
        fileId: string,
        fileBuffer: Buffer,
        filename: string,
        contentType: string,
        metadata: { title: string; description: string; width?: number; height?: number }
    ): Promise<IImage | null> {
        try {
            const _id = new mongoose.Types.ObjectId(fileId);

            // Step 1: Find existing image
            const existingImage = await this.imageModel.findOne({ fileId: _id });
            if (!existingImage) return null;

            // Step 2: Delete previous image file from GridFS
            try {
                await this.bucket.delete(existingImage.fileId);
            } catch (error) {
                console.warn('Failed to delete previous GridFS file:', error);
            }

            // Step 3: Remove old metadata
            await this.imageModel.deleteOne({ fileId: _id });

            // Step 4: Upload new image file
            const uploadStream = this.bucket.openUploadStream(filename, {
                contentType,
                metadata,
            });

            uploadStream.end(fileBuffer);

            return new Promise((resolve, reject) => {
                uploadStream.on('finish', async (file: any) => {
                    try {
                        const newFileId = uploadStream.id;
                        const size = fileBuffer.length;

                        const updatedDoc = await this.imageModel.create({
                            title: metadata.title,
                            description: metadata.description,
                            filename,
                            size,
                            contentType,
                            fileId: newFileId,
                            width: metadata.width,
                            height: metadata.height,
                        });

                        resolve(updatedDoc);
                    } catch (err) {
                        reject(err);
                    }
                });

                uploadStream.on('error', (err) => reject(err));
            });
        } catch (error) {
            console.error('Error updating image:', error);
            return null;
        }
    }

    public async updateImageMetadata(
  fileId: string,
  metadata: { title: string; description: string; width?: number; height?: number }
): Promise<IImage | null> {
  try {
    const _id = new mongoose.Types.ObjectId(fileId);

    const image = await this.imageModel.findOneAndUpdate(
      { fileId: _id },
      {
        title: metadata.title,
        description: metadata.description,
        width: metadata.width,
        height: metadata.height,
      },
      { new: true }
    ).lean();

    return image;
  } catch (error) {
    console.error('Error updating metadata:', error);
    return null;
  }
}


    public async deleteImage(fileId: string): Promise<boolean> {
    try {
        const _id = new mongoose.Types.ObjectId(fileId);

        // Step 1: Find metadata document
        const imageDoc = await this.imageModel.findOne({ fileId: _id });
        if (!imageDoc) {
            console.warn('No image metadata found');
            return false;
        }

        // Step 2: Delete file from GridFS
        await this.bucket.delete(_id);

        // Step 3: Delete metadata document
        await this.imageModel.deleteOne({ fileId: _id });

        console.log(`Image and metadata deleted: ${fileId}`);
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
}

}
