'use strict';

const validate = (schema, property = 'body') => {
  return async (req, res, next) => {
    try {
      const options = { abortEarly: false, stripUnknown: true, convert: true };
      const value = await schema.validateAsync(req[property], options);
      req[property] = value;
      return next();
    } catch (err) {
      const details = err.details?.map(d => ({ message: d.message, path: d.path })) || [];
      return res.status(400).json({ success: false, message: 'Validation error', errors: details });
    }
  };
};

module.exports = validate;


