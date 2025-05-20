import { Document } from 'mongoose';
export interface IImage extends Document {
  title: string;
  description: string;
  filename: string;
  uploadDate: Date;
  size: number;
}