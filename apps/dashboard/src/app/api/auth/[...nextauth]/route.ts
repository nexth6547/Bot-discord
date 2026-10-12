import NextAuth from "next-auth";
import { assertDashboardEnvironment, authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

async function validatedHandler(request: Request, context: { params: { nextauth: string[] } }) {
  assertDashboardEnvironment();
  return handler(request, context);
}

export { validatedHandler as GET, validatedHandler as POST };
