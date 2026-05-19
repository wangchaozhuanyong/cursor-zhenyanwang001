const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/address.repository');

async function getAddresses(userId) {
  return repo.selectByUser(userId);
}

async function createAddress(userId, body) {
  const { name, phone, address, isDefault } = body;
  if (!name || !phone || !address) return { error: { code: 400, message: '请填写完整地址信息' } };

  const id = generateId();
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await repo.clearDefaultForUserConn(conn, userId);
    }
    const cnt = await repo.countAddresses(conn, userId);
    const isFirst = cnt === 0;
    const def = isDefault || isFirst ? 1 : 0;
    await repo.insertAddress(conn, {
      id, userId, name, phone, address, isDefault: def,
    });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const row = await repo.selectRowByIdAndUser(id, userId);
  return { data: row, message: 'Address created' };
}

async function updateAddress(userId, id, body) {
  const { name, phone, address, isDefault } = body;
  const existing = await repo.selectByIdAndUser(id, userId);
  if (!existing) return { error: { code: 404, message: 'Address not found' } };

  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await repo.clearDefaultForUserConn(conn, userId);
    }
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (isDefault !== undefined) { fields.push('is_default = ?'); values.push(isDefault ? 1 : 0); }
    await repo.updateAddressDynamic(conn, id, userId, fields, values);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const row = await repo.selectRowByIdAndUser(id, userId);
  return { data: row, message: 'Address updated' };
}

async function deleteAddress(userId, id) {
  const existing = await repo.selectWithDefault(id, userId);
  if (!existing) return { error: { code: 404, message: 'Address not found' } };

  await repo.deleteById(id, userId);

  if (existing.is_default) {
    const nextId = await repo.selectLatestRemainingId(userId);
    if (nextId) {
      await repo.setDefaultById(nextId, userId);
    }
  }
  return { message: 'Address deleted' };
}

async function setDefault(userId, id) {
  const existing = await repo.selectByIdAndUser(id, userId);
  if (!existing) return { error: { code: 404, message: 'Address not found' } };

  await repo.clearDefaultForUser(userId);
  await repo.setDefaultById(id, userId);
  return { message: 'Default address set' };
}

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
};




