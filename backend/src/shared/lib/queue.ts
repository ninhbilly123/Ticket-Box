let host = 'localhost';
let port = 6379;

if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  host = url.hostname;
  port = parseInt(url.port || '6379', 10);
}

export const queueConnection = {
  host,
  port,
};
