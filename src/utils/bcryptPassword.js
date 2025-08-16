import bcrypt from "bcrypt";

const createHash = async (plaintext) => {
  const hash = await bcrypt.hash(plaintext, 12); 
  return hash;
};

const verifyHash = async (plaintext, hash) => {
  const result = await bcrypt.compare(plaintext, hash);
  return result;
};

export { createHash, verifyHash };
