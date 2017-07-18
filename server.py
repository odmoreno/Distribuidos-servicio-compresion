
import pika, os, logging

logging.basicConfig()

# Access the CLODUAMQP_URL environment variable and parse it (fallback to localhost)
url = os.environ.get('CLOUDAMQP_URL', 'amqp://lxnmvwuw:divYLCdCRJkZ-GAaq4w1xOpXsxmxXOwA@wasp.rmq.cloudamqp.com/lxnmvwuw')
#url = os.environ.get('CLOUDAMQP_URL', 'amqp://guest:guest@localhost/%2f')
params = pika.URLParameters(url)
params.socket_timeout = 10
connection = pika.BlockingConnection(params) # Connect to CloudAMQP
channel = connection.channel() # start a channel

exg_name = 'task'
q1_name = 'create_queue'
q2_name = 'read_queue'

channel.exchange_declare(exchange=exg_name,
                         exchange_type='direct')

channel.queue_declare(queue=q1_name, durable=True)
channel.queue_declare(queue=q2_name, durable=True)

q1bind=channel.queue_bind(exchange=exg_name,
                       queue=q1_name,
                       routing_key='create')
q2bind=channel.queue_bind(exchange=exg_name,
                       queue=q2_name,
                       routing_key='read')

print ('[*] Waiting for tasks. To exit press CTRL+C')

def callback(ch, method, properties, body):
    if method.routing_key == 'create':
        print(" [x] %r:%r" % (method.routing_key, body))
    elif method.routing_key == 'read':
        print(" [x] %r:%r" % (method.routing_key, body))
    else:
        print(" [x] %r:%r" % (method.routing_key, body))

q1consume=channel.basic_consume(callback,
                      queue=q1_name,
                      no_ack=True)
q2consume=channel.basic_consume(callback,
                      queue=q2_name,
                      no_ack=True)

channel.start_consuming()