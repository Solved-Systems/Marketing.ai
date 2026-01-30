import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request access to user's repos
          scope: 'read:user user:email repo',
        },
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = getUserByEmail(email)
        if (!user || !user.password) {
          return null
        }

        const isValid = await verifyPassword(password, user.password)
        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Persist the GitHub access token to the JWT
      if (account) {
        token.accessToken = account.access_token
      }
      // Store user ID for credentials-based auth
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Make the access token available in the session (for GitHub)
      session.accessToken = token.accessToken as string
      // Add user ID to session
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
