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

}
