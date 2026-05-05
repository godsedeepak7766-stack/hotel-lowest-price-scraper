function getArgValue(argv, name) {
  const key = `--${name}`;
  const idx = argv.findIndex((a) => a === key || a.startsWith(`${key}=`));
  if (idx === -1) return undefined;
  const token = argv[idx];
  if (token.includes("=")) return token.split("=").slice(1).join("=");
  return argv[idx + 1];
}

function mustGetArgValue(argv, name) {
  const v = getArgValue(argv, name);
  if (!v) throw new Error(`Missing required argument --${name}`);
  return v;
}

module.exports = { getArgValue, mustGetArgValue };
