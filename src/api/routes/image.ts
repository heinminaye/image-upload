import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { Container } from 'typedi';
import Joi from 'joi';
import middlewares from '../middlewares';
import ImageService from '../../services/Image';

const route = Router();

// Enhanced Multer configuration with file filtering
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'));
        }
    }
}).single('image');

const UploadImageSchema = Joi.object({
    title: Joi.string().max(100).required(),
    description: Joi.string().max(500).required(),
    width: Joi.number().integer().positive().optional(),
    height: Joi.number().integer().positive().optional(),
});

export default (app: Router) => {
    app.use('/images', route);

    route.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const imageService = Container.get(ImageService);
    const cursor = req.query.cursor as string || null;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || null;

    try {
        const result = await imageService.getAllImages(cursor, limit, search);

        res.status(200).json({
            returncode: '200',
            message: 'Images retrieved successfully',
            data: {
                images: result.images,
                pagination: {
                    next_cursor: result.nextCursor,
                    has_more: result.hasMore
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving images:', error);
        next(error);
    }
});


    route.post(
        '/upload',
        (req: Request, res: Response, next: NextFunction) => {
            upload(req, res, (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return res.status(413).json({
                                returncode: '413',
                                message: 'File too large. Maximum size is 5MB'
                            });
                        }
                        return res.status(400).json({
                            returncode: '400',
                            message: err.message
                        });
                    }
                    return res.status(400).json({
                        returncode: '400',
                        message: err.message
                    });
                }

                if (!req.file) {
                    return res.status(400).json({
                        returncode: '400',
                        message: 'Image file is required'
                    });
                }
                next();
            });
        },
        middlewares.validation(UploadImageSchema),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const file = req.file!;
                const { title, description, width, height } = req.body;

                const imageService = Container.get(ImageService);

                const isImageValid = await imageService.validateImageFile(file.buffer);
                if (!isImageValid) {
                    res.status(400).json({
                        returncode: '400',
                        message: 'Invalid image file'
                    });
                }

                const image = await imageService.uploadImage(
                    file.buffer,
                    file.originalname,
                    file.mimetype,
                    {
                        title,
                        description,
                        width: width ? Number(width) : undefined,
                        height: height ? Number(height) : undefined,
                    }
                );

                res.status(201).json({ returncode: '200', message: 'Upload successful', image });
            } catch (error) {
                console.error(error);
                next(error);
            }
        }
    );

    route.get('/:fileId', async (req: Request, res: Response, next: NextFunction) => {
        const imageService = Container.get(ImageService);
        const fileId = req.params.fileId;

        try {
            const imageDoc = await imageService.getImageDocument(fileId);
            if (imageDoc) {
                res.setHeader('Content-Type', imageDoc.contentType);
            }
            else {
                res.status(404).json({
                    returncode: '404',
                    message: 'Image not found'
                });
            }

            const stream = await imageService.getImageFileStream(fileId);
            if (stream) {
                stream.on('error', (err) => {
                    console.error('Stream error:', err);
                    if (!res.headersSent) {
                        res.status(500).json({
                            returncode: '500',
                            message: 'Error streaming image'
                        });
                    }
                });

                stream.on('end', () => {
                    console.log('Image stream completed');
                });

                stream.pipe(res);
            }
            else {
                res.status(404).json({
                    returncode: '404',
                    message: 'Image not found'
                });
            }
        } catch (error) {
            console.error('Error retrieving image:', error);
            next(error);
        }
    });
};