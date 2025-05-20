import { Container } from 'typedi';
import config from '../config';

export default ({ models }: { models: { name: string; model: any }[] }) => {
  try {
    models.forEach(m => {
      Container.set(m.name, m.model);
    });

    return {};
  } catch (e) {
    throw e;
  }
};
