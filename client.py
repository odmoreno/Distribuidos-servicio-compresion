import logging
import os
import pika
import sys



logging.basicConfig()

# Access the CLODUAMQP_URL environment variable and parse it (fallback to localhost)
url = os.environ.get('CLOUDAMQP_URL', 'amqp://lxnmvwuw:divYLCdCRJkZ-GAaq4w1xOpXsxmxXOwA@wasp.rmq.cloudamqp.com/lxnmvwuw')
#url = os.environ.get('CLOUDAMQP_URL', 'amqp://guest:guest@localhost/%2f')
params = pika.URLParameters(url)
params.socket_timeout = 10
connection = pika.BlockingConnection(params) # Connect to CloudAMQP
channel = connection.channel() # start a channel

exg_name = 'task'

channel.exchange_declare(exchange=exg_name,
                         exchange_type='direct')

task = sys.argv[1] if len(sys.argv) > 2 else 'info'
message = ' '.join(sys.argv[2:]) or 'Hello World!'
channel.basic_publish(exchange=exg_name,
                      routing_key=task,
                      body=message)
print(" [x] Sent %r:%r" % (task, message))
connection.close()
