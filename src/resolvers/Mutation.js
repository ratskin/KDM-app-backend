const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET, getUserId } = require('../utils');

async function createEvent(parent, args, context, info) {
  const userId = getUserId(context);
  const newArgs = args;
  newArgs.data.people = newArgs.data.people || {};
  // newArgs.data.people.create = [];
  newArgs.data.people.create = [{
    status: 'Waiting',
    user: { connect: { id: userId } },
    role: { connect: { name: 'Organiser', category: 'Defaults' } },
  }, ...newArgs.data.people.create || []];
  return context.db.mutation.createEvent(newArgs, info);
}

async function signUp(parent, args, context) {
  const password = await bcrypt.hash(args.password, 10);
  const user = await context.db.mutation.createUser({
    data: { ...args, password },
  }, '{ id }');

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user,
  };
}

async function signIn(parent, args, context) {
  const user = await context.db.query.user({ where: { email: args.email } }, '{ id password }');
  if (!user) {
    throw new Error('Wrong email or password');
  }

  const valid = await bcrypt.compare(args.password, user.password);
  if (!valid) {
    throw new Error('Wrong email or password');
  }

  return {
    token: jwt.sign({ userId: user.id }, APP_SECRET),
    user,
  };
}

async function vote(parent, args, context, info) {
  const userId = getUserId(context);
  const linkExists = await context.db.exists.Vote({
    user: { id: userId },
    link: { id: args.linkId },
  });
  if (linkExists) {
    throw new Error(`Already voted for link: ${args.linkId}`);
  }

  return context.db.mutation.createVote(
    {
      data: {
        user: { connect: { id: userId } },
        link: { connect: { id: args.linkId } },
      },
    },
    info,
  );
}

module.exports = {
  createEvent,
  signUp,
  signIn,
  // vote
};
