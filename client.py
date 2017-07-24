#!/usr/bin/env python
import pika
import uuid
import logging
import os
import sys

class CompressionClient(object):
    def __init__(self):
        logging.basicConfig()

        # Access the CLODUAMQP_URL environment variable and parse it (fallback to localhost)
        url = os.environ.get('CLOUDAMQP_URL', 'amqp://lxnmvwuw:divYLCdCRJkZ-GAaq4w1xOpXsxmxXOwA@wasp.rmq.cloudamqp.com/lxnmvwuw')
        #url = os.environ.get('CLOUDAMQP_URL', 'amqp://guest:guest@localhost/%2f')
        params = pika.URLParameters(url)
        params.socket_timeout = 10
        self.connection = pika.BlockingConnection(params) # Connect to CloudAMQP
        
        self.channel = self.connection.channel()

        result = self.channel.queue_declare(exclusive=True)
        self.callback_queue = result.method.queue

        self.channel.basic_consume(self.on_response, no_ack=True,
                                   queue=self.callback_queue)

    def on_response(self, ch, method, props, body):
        if self.corr_id == props.correlation_id:
            self.response = body

    def call(self, task, message):
        queue_name = ""

        if task in ["create","read","cancel"]:
            if task == "create":
              queue_name = "create_queue"
            elif task == "read":
              queue_name = "read_queue"
            else:
              queue_name = "cancel_queue"
            self.response = None
            self.corr_id = str(uuid.uuid4())
            self.channel.basic_publish(exchange='',
                                       routing_key=queue_name,
                                       properties=pika.BasicProperties(
                                             reply_to = self.callback_queue,
                                             correlation_id = self.corr_id,
                                             ),
                                       body=task+":"+message)
            while self.response is None:
                self.connection.process_data_events()
            return self.response
        else:
            return " [.] no existe task " + task        

compression_rpc = CompressionClient()

print(" [x] Requesting file")
task = sys.argv[1] if len(sys.argv) > 2 else 'info'
message = ' '.join(sys.argv[2:]) or 'Hello World!'
response = compression_rpc.call(task, message)
print(" [.] Got %r" % response)