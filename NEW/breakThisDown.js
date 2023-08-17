const { ApolloServer } = require('apollo-server-express');
const { User } = require('../models');
const { signToken } = require('../utils/auth');
const express = require('express');

const typeDefs = `
  type User {
    _id: ID
    username: String
    email: String
    savedBooks: [Book]
  }

  type Book {
    bookId: String
    title: String
    authors: [String]
    description: String
    image: String
    link: String
  }

  type AuthPayload {
    token: String
    user: User
  }

  type Query {
    getUser(id: ID, username: String): User
  }

  type Mutation {
    createUser(input: CreateUserInput): AuthPayload
    loginUser(usernameOrEmail: String, password: String): AuthPayload
    saveBook(input: SaveBookInput): User
    deleteBook(bookId: String): User
  }

  input CreateUserInput {
    username: String
    email: String
    password: String
  }

  input SaveBookInput {
    bookId: String
    title: String
    authors: [String]
    description: String
    image: String
    link: String
  }
`;

const resolvers = {
  Query: {
    getUser: async (_, { id, username }) => {
      const foundUser = await User.findOne({
        $or: [{ _id: id }, { username }],
      });
      return foundUser;
    },
  },
  Mutation: {
    createUser: async (_, { input }) => {
      const user = await User.create(input);
      const token = signToken(user);
      return { token, user };
    },
    loginUser: async (_, { usernameOrEmail, password }) => {
      const user = await User.findOne({
        $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      });

      if (!user || !user.isCorrectPassword(password)) {
        throw new Error("Invalid credentials");
      }

      const token = signToken(user);
      return { token, user };
    },
    saveBook: async (_, { input }, { user }) => {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $addToSet: { savedBooks: input } },
        { new: true, runValidators: true }
      );
      return updatedUser;
    },
    deleteBook: async (_, { bookId }, { user }) => {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id },
        { $pull: { savedBooks: { bookId } } },
        { new: true }
      );
      return updatedUser;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const app = express();
server.applyMiddleware({ app });

// Start the server
app.listen({ port: 4000 }, () =>
  console.log(`Server running at http://localhost:4000${server.graphqlPath}`)
);
