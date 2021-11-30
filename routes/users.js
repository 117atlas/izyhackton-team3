let express = require('express');
let router = express.Router();

const Auth = require('./auth/auth');

const UsersController = require('../modules/users/usersmodule');

const Router = require('./router/Router');

router.post('/register', Auth.verifyAuthSA, async (req, res, next) => {
  let response = await Router(UsersController.register,
      {username: req.body.username, email: req.body.email, password: req.body.password, role: req.body.role});
  res.send(response);
})

router.post('/login', async (req, res, next) => {
  let response = await Router(UsersController.login,
      {login: req.body.login, password: req.body.password});
  res.send(response);
});

router.get('/refresh-token', Auth.verifyAuth, async function (req, res, next) {
  let response = await Router(UsersController.refreshToken, {user_id: req.user});
  res.send(response);
});

router.get('/', Auth.verifyAuth, async function (req, res, next) {
  let response = await Router(UsersController.getUser, {user_id: req.user});
  res.send(response);
});

router.patch('/update-account', Auth.verifyAuth, async function (req, res, next) {
  let response = await Router(UsersController.updateUser,
      {user_id: req.user, field: req.body.field, value: req.body.value, password: req.body.password},
      {password: true});
  res.send(response);
});

router.patch('/change-password', Auth.verifyAuth, async function (req, res, next) {
  let response = await Router(UsersController.updatePassword,
      {user_id: req.user, old_password: req.body.old_password, new_password: req.body.new_password});
  res.send(response);
});

router.delete('/:userid', Auth.verifyAuthSA, async function (req, res, next) {
  let response = await Router(UsersController.deleteAccount, {user_id: req.params.userid});
  res.send(response);
});

module.exports = router;
