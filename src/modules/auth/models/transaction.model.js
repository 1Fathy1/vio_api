async function begin(database) {
  await database.query("BEGIN");
}

async function commit(database) {
  await database.query("COMMIT");
}

async function rollback(database) {
  await database.query("ROLLBACK");
}

module.exports = { begin, commit, rollback };
