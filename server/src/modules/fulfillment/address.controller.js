const addressService = require('./address.service');

exports.getAddresses = async (req, res, next) => {
  try {
    const rows = await addressService.getAddresses(req.user.id);
    res.success(rows);
  } catch (err) { next(err); }
};

exports.createAddress = async (req, res, next) => {
  try {
    const result = await addressService.createAddress(req.user.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const result = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(result.data, result.message);
  } catch (err) { next(err); }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const result = await addressService.deleteAddress(req.user.id, req.params.id);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(null, result.message);
  } catch (err) { next(err); }
};

exports.setDefault = async (req, res, next) => {
  try {
    const result = await addressService.setDefault(req.user.id, req.params.id);
    if (result.error) return res.fail(result.error.code, result.error.message);
    res.success(null, result.message);
  } catch (err) { next(err); }
};
