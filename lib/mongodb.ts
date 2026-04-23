import mongoose from "mongoose";

const MONGODB_URI =
  "mongodb+srv://teepukhan729:XcAg7Q6LZwFp2jOE@friendfy.vk41i.mongodb.net/momcare?retryWrites=true&w=majority&appName=peopulse";

declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: typeof import("mongoose") | null; promise: Promise<typeof import("mongoose")> | null };
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
