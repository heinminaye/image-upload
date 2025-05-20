
import mongoose, { Schema } from 'mongoose';
import { IImage } from '../interfaces/Image';
const ImageSchema: Schema = new Schema<IImage>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default mongoose.model<IImage>('Image', ImageSchema);
