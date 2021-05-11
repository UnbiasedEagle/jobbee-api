export const sendToken = (user, statusCode, res) => {
  const token = user.generateAuthToken();

  const config = {
    httpOnly: true,
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_TIME * 1000 * 60 * 60 * 24
    ),
  };

  // if (process.env.NODE_ENV === 'production') {
  //   config.secure = true;
  // }

  res.cookie('token', token, config);

  return res.status(statusCode).json({
    success: true,
    token,
  });
};
