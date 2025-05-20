import mongoose from 'mongoose';
import { MongoClient, GridFSBucket } from 'mongodb';
import config from '../config';

let gridFSBucket: GridFSBucket;

const connectDB = async () => {
  try {
    // Connect mongoose as usual
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB connected successfully with Mongoose');

    // Also get the native MongoDB client from mongoose connection
    const client = mongoose.connection.getClient();
    const db = client.db(); // get default DB from URIx

    // Create GridFSBucket instance
    gridFSBucket = new GridFSBucket(db, {
      bucketName: 'images',
    });

    console.log('GridFSBucket is ready');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Export GridFSBucket to use in other files
export default connectDB;
export { gridFSBucket };
