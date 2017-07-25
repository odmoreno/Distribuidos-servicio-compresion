#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
var fs = require('fs');
var zip = new require('node-zip')();
var path = require('path');
var redis = require('redis');
var client = redis.createClient(10808, 'redis-10808.c10.us-east-1-4.ec2.cloud.redislabs.com');
client.on('connect', function() {
    console.log(' [.] Conectado a REDIS BD');
});
idFile="";

amqp.connect('amqp://hfmlwsqw:2zIpQS_S-FRv4A6Qgb1MJx2E0Zxz6PPW@orangutan.rmq.cloudamqp.com/hfmlwsqw', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'High';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de alta prioridad');
    ch.consume(q, function reply(msg) {
      console.log(' [.] Archivo a borrar obtenido');
      idFile = msg.content.toString();
      idClientDelete=msg.properties.correlationId;
      queueDelete=msg.properties.replyTo;
      ch.sendToQueue(queueDelete,
        new Buffer(" [.] Archivo borrado exitosamente"),
        {correlationId: idClientDelete});
        ch.ack(msg);
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Low';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de baja prioridad');
    ch.consume(q, function reply(msg) {
      setTimeout(function(){
        if(msg.properties.correlationId==idFile){
          ch.sendToQueue(msg.properties.replyTo,
            new Buffer(idFile),
            {correlationId: msg.properties.correlationId});
            ch.ack(msg);
        }
        else{
          client.hmset(""+msg.properties.correlationId, {
              'nombre': ""+msg.properties.headers.nameFile,
              'fechaDeCreacion':new Date()
          });
          console.log(' [.] Archivo a comprimir obtenido');
          zip.file("file.txt",msg.content);
          var data = zip.generate({ base64:false, compression: 'DEFLATE' });
          ch.sendToQueue(msg.properties.replyTo,
            new Buffer(data),
            {correlationId: msg.properties.correlationId});
          ch.ack(msg);
        }
      }, 10000);
    });
  });
  conn.createChannel(function(err, ch) {
    var q = 'Consulta';
    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Esperando requests de consultas');
    ch.consume(q, function reply(msg) {
      idFile=msg.content.toString();
      console.log(" [.] Archivo con ID: %s a leer obtenido",idFile);
      client.exists(idFile, function(err, reply) {
          if (reply === 1) {
            client.hgetall(idFile, function(err, object) {
                ch.sendToQueue(msg.properties.replyTo,
                  new Buffer(idFile),
                  {correlationId: msg.properties.correlationId,headers:{resultQuery:object,exist:true}});
            });
          } else {
            ch.sendToQueue(msg.properties.replyTo,
              new Buffer(idFile),
              {correlationId: msg.properties.correlationId,headers:{exist:false}});
          }
      });


        ch.ack(msg);
    });
  });
});
