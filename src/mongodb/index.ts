import mongoose from 'mongoose';
import { MongoClient, GridFSBucket } from 'mongodb';
import config from '../config';

let gridFSBucket: GridFSBucket | null = null;

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB connected successfully with Mongoose');

    const client = mongoose.connection.getClient();
    const db = client.db(); // Get DB from URI

    gridFSBucket = new GridFSBucket(db, {
      bucketName: 'images',
    });

    console.log('GridFSBucket is ready');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Safely get GridFSBucket after initialization
const getGridFSBucket = (): GridFSBucket => {
  if (!gridFSBucket) {
    throw new Error('GridFSBucket has not been initialized yet');
  }
  return gridFSBucket;
};

export default connectDB;
export { getGridFSBucket };
