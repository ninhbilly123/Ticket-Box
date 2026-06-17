import amqp from 'amqplib';

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:password123@localhost:5672';

let connection: any = null;
let channel: any = null;

export async function connectRabbitMQ(): Promise<{ connection: any; channel: any }> {
  if (connection && channel) {
    return { connection, channel };
  }

  try {
    console.log('[RabbitMQ] Connecting to:', rabbitmqUrl);
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    console.log('[RabbitMQ] Connected successfully and Channel created');

    connection.on('error', (err: any) => {
      console.error('[RabbitMQ] Connection error:', err);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed. Resetting connection reference.');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (error) {
    console.error('[RabbitMQ] Connection failed:', error);
    throw error;
  }
}

export async function publishToQueue(queueName: string, message: any): Promise<boolean> {
  try {
    const { channel } = await connectRabbitMQ();
    // Đảm bảo hàng đợi tồn tại trước khi gửi
    await channel.assertQueue(queueName, { durable: true });
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    console.log(`[RabbitMQ] Publishing message to queue [${queueName}]`);
    return channel.sendToQueue(queueName, messageBuffer, {
      persistent: true, // Tin nhắn lưu trữ bền vững trên disk của RabbitMQ
    });
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish to queue [${queueName}]:`, error);
    return false;
  }
}
