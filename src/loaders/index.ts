import expressLoader from "./express";
import dependencyInjectorLoader from "./dependencyInjector";

export default async ({ expressApp }: { expressApp: any }) => {
  

  // Dependency Injection
  await dependencyInjectorLoader({
    models: [
    ],
  });

  // Start Express App
  await expressLoader({ app: expressApp });
};
