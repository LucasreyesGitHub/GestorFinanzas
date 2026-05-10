import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60,
  },

  pages: {
    signIn:  "/login",
    signOut: "/login",
    error:   "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) token.id = user.id ?? (token.sub as string)
      if (account?.providerAccountId) token.googleId = account.providerAccountId
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const id = (token.id as string | undefined) ?? (token.sub as string | undefined)
        ;(session.user as { id?: string; googleId?: string }).id = id
        ;(session.user as { id?: string; googleId?: string }).googleId = token.googleId as string
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
