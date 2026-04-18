const db = require('../../config/db');
const { generateId } = require('../../utils/helpers');
const repo = require('./address.repository');

async function getAddresses(userId) {
  return repo.selectByUser(userId);
}

async function createAddress(userId, body) {
  const { name, phone, address, isDefault } = body;
  if (!name || !phone || !address) return { error: { code: 400, message: '请填写完整地址信息' } };

  const id = generateId();
  const conn = await db.getConnection();
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

  const row = await repo.selectRowById(id);
  return { data: row, message: '地址已添加' };
}

async function updateAddress(userId, id, body) {
  const { name, phone, address, isDefault } = body;
  const existing = await repo.selectByIdAndUser(id, userId);
  if (!existing) return { error: { code: 404, message: '地址不存在' } };

  const conn = await db.getConnection();
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
    await repo.updateAddressDynamic(conn, id, fields, values);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const row = await repo.selectRowById(id);
  return { data: row, message: '地址已更新' };
}

async function deleteAddress(userId, id) {
  const existing = await repo.selectWithDefault(id, userId);
  if (!existing) return { error: { code: 404, message: '地址不存在' } };

  await repo.deleteById(id);

  if (existing.is_default) {
    const nextId = await repo.selectLatestRemainingId(userId);
    if (nextId) {
      await repo.setDefaultById(nextId);
    }
  }
  return { message: '地址已删除' };
}

async function setDefault(userId, id) {
  const existing = await repo.selectByIdAndUser(id, userId);
  if (!existing) return { error: { code: 404, message: '地址不存在' } };

  await repo.clearDefaultForUser(userId);
  await repo.setDefaultById(id);
  return { message: '默认地址已设置' };
}

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
};
