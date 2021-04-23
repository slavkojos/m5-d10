const checkFileType = (types) => (req, res, next) => {
  const acceptedMimeType = types.includes(req.file.mimetype);
  if (!acceptedMimeType) {
    res.status(400).send({
      message: `Only ${types.join(",")} mime-types are accepted!.You sent ${req.file.mimetype}`,
    });
  } else {
    next();
  }
};

export default checkFileType;
