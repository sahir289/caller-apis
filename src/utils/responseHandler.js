

export const  sendSuccess = (
  res,
  message = "Success",
  data = null,
  status = 200
) => {
  return res.status(status).json({
    message,
    data,
  });
};