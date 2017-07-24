#!/usr/bin/env python
import pika
import threading
from functools import wraps
import redis
import logging
import os

r = redis.Redis(
    host='redis-18799.c10.us-east-1-3.ec2.cloud.redislabs.com',
    port="18799", 
    password='')

logging.basicConfig()

# Access the CLODUAMQP_URL environment variable and parse it (fallback to localhost)
url = os.environ.get('CLOUDAMQP_URL', 'amqp://lxnmvwuw:divYLCdCRJkZ-GAaq4w1xOpXsxmxXOwA@wasp.rmq.cloudamqp.com/lxnmvwuw')
#url = os.environ.get('CLOUDAMQP_URL', 'amqp://guest:guest@localhost/%2f')
params = pika.URLParameters(url)
params.socket_timeout = 10
connection = pika.BlockingConnection(params) # Connect to CloudAMQP

channel = connection.channel()

channel.queue_declare(queue='cancel_queue',durable=True)
channel.queue_declare(queue='create_queue',durable=True)
channel.queue_declare(queue='read_queue',durable=True)


def create_job(ch, method, props, body):
    task = body.split(':')[0]
    file = body.split(':')[1]

    if r.get(file) == "cancel":
      msg= file + " cancelado"
      response = "Canceled file"
    else:
      msg= file + " compressed"
      print(" [.] compression(%s) from %s" % (file,props.correlation_id))
      response = "Compressed file "+file
  
    ch.basic_publish(exchange='',
                     routing_key=props.reply_to,
                     properties=pika.BasicProperties(correlation_id = \
                                                         props.correlation_id),
                     body=str(response))
    ch.basic_ack(delivery_tag = method.delivery_tag)
    
    r.set(file, "create")
    return msg

def read_job(ch, method, props, body):
    task = body.split(':')[0]
    file = body.split(':')[1]

    if r.get(file) == "create":
      print(" [.] read(%s) from %s" % (file,props.correlation_id))
      response = "Read file "+file
    else:
      response = "Could not read file"

    ch.basic_publish(exchange='',
                       routing_key=props.reply_to,
                       properties=pika.BasicProperties(correlation_id = \
                                                           props.correlation_id),
                       body=str(response))
    ch.basic_ack(delivery_tag = method.delivery_tag)
    return file + " read"

def cancel_job(ch, method, props, body):
    task = body.split(':')[0]
    file = body.split(':')[1]
    print(" [.] cancel(%s) from %s" % (file,props.correlation_id))
    response = "Canceled file "+file
    r.set(file, "cancel")
    ch.basic_publish(exchange='',
                     routing_key=props.reply_to,
                     properties=pika.BasicProperties(correlation_id = \
                                                         props.correlation_id),
                     body=str(response))
    ch.basic_ack(delivery_tag = method.delivery_tag)
    return file + " cancel"

channel.basic_qos(prefetch_count=1)

channel.basic_consume(cancel_job, queue='cancel_queue')
channel.basic_consume(create_job, queue='create_queue')
channel.basic_consume(read_job, queue='read_queue')

print(" [x] Awaiting RPC requests")
channel.start_consuming()