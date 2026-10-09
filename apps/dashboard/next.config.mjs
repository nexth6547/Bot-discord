import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dashboardDirectory, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
