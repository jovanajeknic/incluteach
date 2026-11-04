// Loads server/.env into process.env when the file exists. Real environment
// variables (for example on a hosting platform) are never overwritten.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}
