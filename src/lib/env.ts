type AppConfig = {
  DATABASE_URL: string;
  AUTH_TOKEN_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  OPENROUTER_API_KEY: string;
};

function getEnv(name: keyof AppConfig): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getConfig(): AppConfig {
  return {
    DATABASE_URL: getEnv("DATABASE_URL"),
    AUTH_TOKEN_SECRET: getEnv("AUTH_TOKEN_SECRET"),
    ADMIN_USERNAME: getEnv("ADMIN_USERNAME"),
    ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD"),
    OPENROUTER_API_KEY: getEnv("OPENROUTER_API_KEY"),
  };
}
