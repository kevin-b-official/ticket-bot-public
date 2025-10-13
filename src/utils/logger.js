function log(level, ...args) {
  const ts = new Date().toISOString();
  const l = level || 'log';
  console[l](`[${ts}]`, ...args);
}
module.exports = { log };
