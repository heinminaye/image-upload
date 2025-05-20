import expressLoader from "./express";
import dependencyInjectorLoader from "./dependencyInjector";
import connectDB from '../mongodb'; 

export default async ({ expressApp }: { expressApp: any }) => {

    const imageModel = {
        name: 'imageModel',
        model: require('../models/image').default,
    }

    await connectDB();
    // Dependency Injection
    await dependencyInjectorLoader({
        models: [
            imageModel
        ],
    });

    // Start Express App
    await expressLoader({ app: expressApp });
};
