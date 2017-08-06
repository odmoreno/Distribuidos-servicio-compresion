#!/usr/bin/env python
# -*- coding: utf-8 -*-
import pika
import uuid
import logging
import os
import sys
import fs

def validaciones(argv):
  task="none"
  file=""
  idTask=""
  try:
    task = ''.join(argv[1])
    if task in ["create","read","cancel"]:
        if task == "create":
          try:
              file = ''.join(argv[2])
              f = open(file, 'r')
          except IOError:
              print 'Archivo no encontrado.'
        else:
            try:
              idTask = ''.join(argv[2])
            except:
              idTask = "none"
    else:
      print(" [.] No existe la tarea con el nombre " + task)
  except:
    print(" [x] Número incorrecto de argumentos. Deben de ser 2.")
  return task, idTask, file

class CompressionClient(object):
    def __init__(self):
        logging.basicConfig()

        # Access the CLODUAMQP_URL environment variable and parse it (fallback to localhost)
        url = os.environ.get('CLOUDAMQP_URL', 'amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw')
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
          if self.task == "create":
            if body==self.corr_id:
              print(" [.] Archivo con ID " +body + " no comprimido")
            else:
              ##fs.writeFileSync('file_compressed.zip', body, 'binary');
              #fs.write('file_compressed.zip', body)
              print(" [.] Archivo con ID "+ self.corr_id+ " comprimido con éxito")
              print(" [.] URL "+body)
          elif self.task == "read":
            if props.headers['exist']:
                print(" [.] La información del archivo con ID:"+ body + " es:")
                if (str(props.headers['resultQuery']['cancelado'])=='true'):
                    print("Archivo no comprimido: "+str(props.headers['resultQuery']['archivoComprimido']))
                    print("Cancelado: "+str(props.headers['resultQuery']['cancelado']))
                else:
                    print("Archivo comprimido: "+str(props.headers['resultQuery']['archivoComprimido']))
                    print("Fecha de creación: "+str(props.headers['resultQuery']['fechaDeCreacion']))
                    print("URL: "+props.headers['resultQuery']['link'])
                    print("Cancelado: "+str(props.headers['resultQuery']['cancelado']))
            else:
                print('No existe el archivo con ID:'+body)
          else:
            print (body)
          self.response = body

    def call(self, task, idTask, filename):
        queuePriority = "Low"
        mensaje=""
        self.response = None
        self.corr_id = str(uuid.uuid4())[:3]
        self.task = task

        if task == "create":
          queuePriority = "Low"
          mensaje=' [x] Enviando archivo con id: '+self.corr_id;
          #buffer archivo
          #file = BUFFER(filename)
          file = fs.read(filename)
        elif task == "read":
          queuePriority = "Consulta"
          idRead = idTask
          mensaje=" [x] Enviando a leer el archivo con id: "+idRead.replace(' ','')
        else:
          queuePriority = "High"
          idDelete = idTask
          mensaje=" [x] Enviando archivo a cancelar con id: "+idDelete.replace(' ','')
        print(mensaje)

        if task == "create":
          self.channel.basic_publish(exchange='',
                                   routing_key=queuePriority,
                                   properties=pika.BasicProperties(
                                         reply_to = self.callback_queue,
                                         correlation_id = self.corr_id,
                                         headers = {'nameFile': filename}
                                         ),
                                   body=file)
        else:
          self.channel.basic_publish(exchange='',
                                   routing_key=queuePriority,
                                   properties=pika.BasicProperties(
                                         reply_to = self.callback_queue,
                                         correlation_id = self.corr_id,
                                         headers = {'nameFile': "archivo no comprimido"}
                                         ),
                                   body=idTask.replace(' ',''))

        while self.response is None:
            self.connection.process_data_events()
        return self.response

############################################################
compression_rpc = CompressionClient()
task, idTask, file = validaciones(sys.argv)
if idTask== "none" or file == "none":
  print(" [x] Número incorrecto de argumentos. Deben de ser 2.")
else:
  response = compression_rpc.call(task, idTask, file)
print("DONE")
