import { Service, Inject } from 'typedi';
import { Model } from 'mongoose';
import { IImage } from '../interfaces/Image';
import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { fileTypeFromBuffer } from 'file-type';
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
            // First check with file-type to verify the actual file signature
            const fileType = await fileTypeFromBuffer(buffer);
            if (!fileType) return false;

            // List of allowed image MIME types
            const allowedMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml'
            ];

            // Check if the detected type is in our allowed list
            if (!allowedMimeTypes.includes(fileType.mime)) {
                return false;
            }

            // Additional verification with sharp to ensure it's actually processable
            try {
                await sharp(buffer).metadata();
                return true;
            } catch (sharpError) {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
}
