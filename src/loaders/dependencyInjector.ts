import { Container } from 'typedi';
import mongoose from 'mongoose';
import { getGridFSBucket } from '../mongodb';

export default async ({ models }: { models: { name: string; model: any }[] }) => {
  // Register all your models
  models.forEach(({ name, model }) => {
    Container.set(name, model);
  });

  // Register mongoose connection
  Container.set('mongooseConnection', mongoose.connection);

  // Register GridFSBucket instance (optional, if you want to inject it)
  Container.set('gridFSBucket', getGridFSBucket());
};
