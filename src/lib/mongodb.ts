import mongoose from "mongoose";

// const { MONGODB_URI } = process.env;
const MONGODB_URI =
  "mongodb+srv://mahadi-hasan:624234@cluster0.unc8a23.mongodb.net/?appName=Cluster0";

if (!MONGODB_URI) {
  throw new Error(
    "Missing MONGODB_URI. Please add it to your environment configuration."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalWithMongoose = global as typeof global & {
  mongooseConnection?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

let cached = globalWithMongoose.mongooseConnection;

if (!cached) {
  cached = { conn: null, promise: null };
  globalWithMongoose.mongooseConnection = cached;
}

export async function connectToDatabase() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
