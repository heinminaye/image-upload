import mongoose, { Document } from 'mongoose';

export interface IImage extends Document {
  title: string;
  description: string;
  filename: string;
  uploadDate: Date;
  size: number;
  contentType: string;
  fileId: mongoose.Types.ObjectId;
  width?: number;
  height?: number;
  url?: string; // Virtual property for access URL
}
