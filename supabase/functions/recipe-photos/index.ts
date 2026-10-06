// Edge Function "recipe-photos": stock photos (Magnific) + user uploads for recipe cards.
// Independent from make-server-b709b97b so photo work can never break the shared-state/AI routes.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { registerPhotos } from "./photos.tsx";

const app = new Hono();
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  maxAge: 600,
}));

registerPhotos(app, "/recipe-photos");

Deno.serve(app.fetch);
